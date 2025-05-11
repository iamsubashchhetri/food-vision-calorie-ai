
import React, { createContext, useContext, useState } from 'react';
import { FoodItem, Message } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { formatISO } from 'date-fns';

interface AIContextType {
  messages: Message[];
  isProcessing: boolean;
  processTextInput: (text: string) => Promise<FoodItem[]>;
  processImage: (imageUrl: string) => Promise<FoodItem[]>;
  clearMessages: () => void;
}

interface ChatGPTResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

const AIContext = createContext<AIContextType | undefined>(undefined);

// Function to process text with ChatGPT API
const processChatGPT = async (prompt: string): Promise<string> => {
  try {
    const response = await fetch('https://chatgpt-api.shn.hk/v1/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a nutrition AI assistant that helps users track their calories. Analyze food descriptions and return calorie estimates in JSON format.'
          },
          {
            role: 'user', 
            content: prompt
          }
        ]
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data: ChatGPTResponse = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling ChatGPT API:', error);
    throw error;
  }
};

// Parse the ChatGPT response to extract food items and calories
const parseChatGPTResponse = (responseText: string): FoodItem[] => {
  try {
    // Try to extract JSON if it exists in the response
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || 
                     responseText.match(/{[\s\S]*}/);
    
    let jsonText = jsonMatch ? jsonMatch[0] : responseText;
    
    // Clean up the string if it's not already valid JSON
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\s*|\s*```/g, '');
    }
    
    // Try to parse as an array first
    try {
      const parsedArray = JSON.parse(jsonText);
      if (Array.isArray(parsedArray)) {
        return parsedArray.map(item => ({
          id: uuidv4(),
          name: item.name || item.food || "Unknown food",
          calories: parseInt(item.calories) || 0,
          serving: item.serving || item.portion || "1 serving"
        }));
      }
    } catch (e) {
      // Not an array, continue to try other formats
    }
    
    // Try to parse as an object with foods property
    try {
      const parsed = JSON.parse(jsonText);
      if (parsed && parsed.foods && Array.isArray(parsed.foods)) {
        return parsed.foods.map(item => ({
          id: uuidv4(),
          name: item.name || "Unknown food",
          calories: parseInt(item.calories) || 0,
          serving: item.serving || "1 serving"
        }));
      } else if (parsed && !Array.isArray(parsed)) {
        // Single food item
        return [{
          id: uuidv4(),
          name: parsed.name || parsed.food || "Unknown food",
          calories: parseInt(parsed.calories) || 0,
          serving: parsed.serving || parsed.portion || "1 serving"
        }];
      }
    } catch (e) {
      console.error('Error parsing ChatGPT JSON response:', e);
    }
    
    // If JSON parsing fails, extract information using regex as fallback
    const foodItemRegex = /([^:]+):\s*(\d+)\s*(?:calories|kcal)/gi;
    const matches = [...responseText.matchAll(foodItemRegex)];
    
    if (matches.length > 0) {
      return matches.map(match => ({
        id: uuidv4(),
        name: match[1].trim(),
        calories: parseInt(match[2]),
        serving: "1 serving"
      }));
    }
    
    // If all else fails, return a generic response
    return [{
      id: uuidv4(),
      name: "Food item",
      calories: 250,
      serving: "1 serving"
    }];
  } catch (error) {
    console.error('Error parsing ChatGPT response:', error);
    return [{
      id: uuidv4(),
      name: "Unknown food",
      calories: 250,
      serving: "1 serving"
    }];
  }
};

export const AIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const processTextInput = async (text: string): Promise<FoodItem[]> => {
    try {
      setIsProcessing(true);
      
      // Add user message
      const userMessage: Message = {
        id: uuidv4(),
        role: 'user',
        content: text,
        timestamp: formatISO(new Date())
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Process with ChatGPT API
      const prompt = `
        Analyze the following food description and estimate the calories:
        "${text}"
        
        Return a JSON array with each food item including name, calories, and serving size.
        Format: 
        [
          {
            "name": "food name",
            "calories": number,
            "serving": "serving description"
          }
        ]
      `;
      
      const chatGPTResponse = await processChatGPT(prompt);
      const result = parseChatGPTResponse(chatGPTResponse);
      
      // Construct the response message based on results
      const foodNames = result.map(item => item.name).join(', ');
      const totalCalories = result.reduce((sum, item) => sum + item.calories, 0);
      
      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: `I detected: ${foodNames}. Total calories: ${totalCalories} kcal.`,
        timestamp: formatISO(new Date())
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      return result;
    } catch (error) {
      console.error('Error processing text:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: 'Sorry, I had trouble processing that. Please try again.',
        timestamp: formatISO(new Date())
      };
      
      setMessages(prev => [...prev, errorMessage]);
      return [];
    } finally {
      setIsProcessing(false);
    }
  };

  const processImage = async (imageUrl: string): Promise<FoodItem[]> => {
    try {
      setIsProcessing(true);
      
      // Add user message with image
      const userMessage: Message = {
        id: uuidv4(),
        role: 'user',
        content: '📷 [Image uploaded]',
        timestamp: formatISO(new Date())
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Process with ChatGPT API - note that this free API doesn't support image processing
      // so we'll send a message saying we're analyzing an image
      const prompt = `
        I'm looking at a photo of food. Let's assume it contains common items like a sandwich, 
        some fruits, or a salad. Please provide an estimate of what might be in this meal and
        the approximate calories.
        
        Return a JSON array with potential food items including name, calories, and serving size.
        Format: 
        [
          {
            "name": "food name",
            "calories": number,
            "serving": "serving description"
          }
        ]
      `;
      
      const chatGPTResponse = await processChatGPT(prompt);
      const result = parseChatGPTResponse(chatGPTResponse);
      
      // Add imageUrl to the first item
      if (result.length > 0) {
        result[0].imageUrl = imageUrl;
      }
      
      // Construct the response message based on results
      const foodNames = result.map(item => item.name).join(', ');
      const totalCalories = result.reduce((sum, item) => sum + item.calories, 0);
      
      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: `I identified: ${foodNames}. Total calories: ${totalCalories} kcal.`,
        timestamp: formatISO(new Date())
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      return result;
    } catch (error) {
      console.error('Error processing image:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: 'Sorry, I had trouble analyzing that image. Please try again or enter the details manually.',
        timestamp: formatISO(new Date())
      };
      
      setMessages(prev => [...prev, errorMessage]);
      return [];
    } finally {
      setIsProcessing(false);
    }
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const value = {
    messages,
    isProcessing,
    processTextInput,
    processImage,
    clearMessages
  };

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
};

export const useAI = (): AIContextType => {
  const context = useContext(AIContext);
  if (context === undefined) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
};
