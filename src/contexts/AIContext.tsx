'use client';

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

const AIContext = createContext<AIContextType | undefined>(undefined);

const generateResponse = async (prompt: string): Promise<string> => {
  try {
    const API_KEY = 'AIzaSyCc3d2OB5DbIiciMtiVfUN1-kRf7lX81EQ';
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `As a nutritionist, analyze this food and respond only with a JSON array containing food items, estimated calories, and serving size. Format: [{name: string, calories: number, serving: string}]. Food to analyze: ${prompt}`
          }]
        }],
        safetySettings: [{
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_NONE"
        }]
      })
    });

    if (!response.ok) {
      console.error('API Response:', response);
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data = await response.json();
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('Invalid API response structure:', data);
      throw new Error('Invalid API response structure');
    }
    
    const aiResponse = data.candidates[0].content.parts[0].text;

    try {
      // Remove markdown code block if present
      const jsonStr = aiResponse.replace(/```json\n|\n```/g, '').trim();
      const parsedResponse = JSON.parse(jsonStr);
      if (Array.isArray(parsedResponse)) {
        return jsonStr;
      }
    } catch (e) {
      console.error('Invalid JSON response from AI:', aiResponse);
    }

    // Default response if parsing fails
    return JSON.stringify([{
      name: prompt.trim(),
      calories: 0,
      serving: "1 serving"
    }]);

  } catch (error) {
    console.error('Error in generateResponse:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return JSON.stringify([]);
  }
};

const parseChatGPTResponse = (responseText: string): FoodItem[] => {
  try {
    const jsonData = JSON.parse(responseText);
    if (Array.isArray(jsonData)) {
      return jsonData.map(item => ({
        id: uuidv4(),
        name: item.name || "Unknown food",
        calories: parseInt(item.calories) || 0,
        serving: item.serving || "1 serving"
      }));
    }
    return [];
  } catch (error) {
    console.error('Error parsing response:', error);
    return [];
  }
};

export const AIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const processTextInput = async (text: string): Promise<FoodItem[]> => {
    try {
      setIsProcessing(true);
      const userMessage: Message = {
        id: uuidv4(),
        role: 'user',
        content: text,
        timestamp: formatISO(new Date())
      };

      setMessages(prev => [...prev, userMessage]);
      const response = await generateResponse(text);
      const result = parseChatGPTResponse(response);

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
      return [];
    } finally {
      setIsProcessing(false);
    }
  };

  const processImage = async (imageUrl: string): Promise<FoodItem[]> => {
    try {
      setIsProcessing(true);
      const userMessage: Message = {
        id: uuidv4(),
        role: 'user',
        content: '📷 [Image uploaded]',
        timestamp: formatISO(new Date())
      };

      setMessages(prev => [...prev, userMessage]);

      // Convert data URL to base64
      const base64Image = imageUrl.split(',')[1];
      
      const API_KEY = 'AIzaSyCc3d2OB5DbIiciMtiVfUN1-kRf7lX81EQ';
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-pro-vision:generateContent?key=${API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  text: "You are a nutrition expert. Analyze this food image and provide a detailed response in this exact JSON format: [{name: string, calories: number, serving: string}]. Be accurate with calorie estimates based on visible portions."
                },
                {
                  inlineData: {
                    mimeType: "image/jpeg",
                    data: base64Image
                  }
                }
              ]
            }]
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      const aiResponse = data.candidates[0].content.parts[0].text;

      // Parse the response and extract food items
      let result: FoodItem[] = [];
      try {
        const jsonStr = aiResponse.replace(/```json\n|\n```/g, '').trim();
        const parsedItems = JSON.parse(jsonStr);
        result = parsedItems.map((item: any) => ({
          id: uuidv4(),
          name: item.name,
          calories: parseInt(item.calories) || 0,
          serving: item.serving,
          imageUrl: imageUrl
        }));
      } catch (e) {
        console.error('Error parsing Gemini response:', e);
        result = [{
          id: uuidv4(),
          name: "Unknown food",
          calories: 0,
          serving: "1 serving",
          imageUrl: imageUrl
        }];
      }

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