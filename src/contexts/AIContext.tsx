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

// Create the context
const AIContext = createContext<AIContextType | undefined>(undefined);

// Function to generate mock responses
const generateMockResponse = async (prompt: string): Promise<string> => {
  const mockResponses = [
    {
      name: "Milk",
      calories: 103,
      serving: "1 cup"
    },
    {
      name: "Bread",
      calories: 79,
      serving: "1 slice"
    },
    {
      name: "Peanut Butter",
      calories: 95,
      serving: "1 tablespoon"
    }
  ];
  
  return JSON.stringify(mockResponses);
};

// Parse the ChatGPT response to extract food items and calories
const parseChatGPTResponse = (responseText: string): FoodItem[] => {
  try {
    console.log("Parsing response:", responseText);

    // Try to extract JSON if it exists in the response
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || 
                      responseText.match(/\[\s*\{[\s\S]*?\}\s*\]/) ||
                      responseText.match(/{[\s\S]*?}/);

    let jsonText = jsonMatch ? jsonMatch[0] : responseText;

    // Clean up the string if it's not already valid JSON
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\s*|\s*```/g, '');
    }

    console.log("Extracted JSON text:", jsonText);

    // Try to find JSON array in the text
    const arrayMatch = jsonText.match(/\[\s*\{[\s\S]*?\}\s*\]/);
    if (arrayMatch) {
      jsonText = arrayMatch[0];
    }

    // Try to parse as an array first
    try {
      const parsedArray = JSON.parse(jsonText);
      console.log("Parsed as array:", parsedArray);

      if (Array.isArray(parsedArray)) {
        return parsedArray.map(item => ({
          id: uuidv4(),
          name: item.name || item.food || "Unknown food",
          calories: parseInt(item.calories) || 0,
          serving: item.serving || item.portion || "1 serving"
        }));
      }
    } catch (e) {
      console.log("Not an array, trying other formats");
      // Not an array, continue to try other formats
    }

    // Try to parse as an object with foods property
    try {
      const parsed = JSON.parse(jsonText);
      console.log("Parsed as object:", parsed);

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
      console.log("Extracted with regex:", matches);
      return matches.map(match => ({
        id: uuidv4(),
        name: match[1].trim(),
        calories: parseInt(match[2]),
        serving: "1 serving"
      }));
    }

    // Last resort: Try to extract food name and calories from anywhere in the text
    const calorieMatch = responseText.match(/(\d+)\s*(?:calories|kcal)/i);
    const foodNameMatch = responseText.match(/name["\s:]+([^"',]+)/i) || 
                         responseText.match(/food["\s:]+([^"',]+)/i);

    if (calorieMatch && foodNameMatch) {
      console.log("Extracted with basic parsing:", { food: foodNameMatch[1], calories: calorieMatch[1] });
      return [{
        id: uuidv4(),
        name: foodNameMatch[1].trim(),
        calories: parseInt(calorieMatch[1]),
        serving: "1 serving"
      }];
    }

    // If all else fails and we have obvious food mentions, make a best guess
    if (responseText.toLowerCase().includes('banana')) {
      return [{
        id: uuidv4(),
        name: "Banana",
        calories: 105,
        serving: "1 medium banana"
      }];
    }

    if (responseText.toLowerCase().includes('egg')) {
      return [{
        id: uuidv4(),
        name: "Egg",
        calories: 78,
        serving: "1 large egg"
      }];
    }

    // Generic fallback
    console.log("Using generic fallback");
    return [{
      id: uuidv4(),
      name: "Unknown food item",
      calories: 0,
      serving: "1 serving"
    }];
  } catch (error) {
    console.error('Error parsing ChatGPT response:', error);
    return [{
      id: uuidv4(),
      name: "Unknown food",
      calories: 0,
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

      // Generate mock response
      const mockResponse = await generateMockResponse(text);
      const result = parseChatGPTResponse(mockResponse);

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

      // Process with mock image response
      const mockResponse = await generateMockResponse("mock image");
      const result = parseChatGPTResponse(mockResponse);

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

  const value: AIContextType = {
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