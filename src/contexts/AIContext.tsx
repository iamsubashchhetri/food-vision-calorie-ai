
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

const analyzeImageWithGemini = async (imageBase64: string): Promise<string> => {
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=AIzaSyApHWVU-ozOdkE-zllCXuBR_m9kioHK5Wg', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "Analyze this food image and provide the name and estimated calories. Format the response as a JSON array with 'name' and 'calories' fields." },
            { inlineData: { mimeType: "image/jpeg", data: imageBase64.split(',')[1] } }
          ]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates[0]?.content?.parts[0]?.text || '';
  } catch (error) {
    console.error('Error analyzing image:', error);
    throw error;
  }
};

const generateResponse = async (prompt: string, retries = 2): Promise<string> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer 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`
        },
        body: JSON.stringify({
          model: "deepseek/deepseek-r1:free",
          messages: [{
            role: "system",
            content: "You are a nutritionist. When given a food description, respond only with a JSON array containing food items, their estimated calories, and serving size. Format: [{name: string, calories: number, serving: string}]"
          }, {
            role: "user",
            content: prompt
          }]
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (retries > 0) {
          console.log(`Retrying... ${retries} attempts left`);
          return generateResponse(prompt, retries - 1);
        }
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || '';
    } catch (error) {
      if (error.name === 'AbortError') {
        if (retries > 0) {
          console.log(`Request timed out. Retrying... ${retries} attempts left`);
          return generateResponse(prompt, retries - 1);
        }
        throw new Error('Request timeout');
      }
      throw error;
    }
  } catch (error) {
    console.error('Error in generateResponse:', error);
    throw error;
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

      const aiResponse = await generateResponse(text);
      let foodItems: FoodItem[] = [];
      try {
        foodItems = JSON.parse(aiResponse);
      } catch (e) {
        console.error('Error parsing AI response:', e);
      }

      const foodNames = foodItems.map(item => item.name).join(', ');
      const totalCalories = foodItems.reduce((sum, item) => sum + item.calories, 0);

      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: `${foodNames}\n${totalCalories} kcal`,
        timestamp: formatISO(new Date())
      };
      setMessages(prev => [...prev, assistantMessage]);

      return foodItems;
    } catch (error) {
      console.error('Error in processTextInput:', error);
      throw error;
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
        content: '📸 Analyzing food image...',
        timestamp: formatISO(new Date())
      };
      setMessages(prev => [...prev, userMessage]);

      const aiResponse = await analyzeImageWithGemini(imageUrl);
      let foodItems: FoodItem[] = [];
      try {
        foodItems = JSON.parse(aiResponse);
      } catch (e) {
        console.error('Error parsing AI response:', e);
      }

      const foodNames = foodItems.map(item => item.name).join(', ');
      const totalCalories = foodItems.reduce((sum, item) => sum + item.calories, 0);

      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: `${foodNames}\n${totalCalories} kcal`,
        timestamp: formatISO(new Date())
      };
      setMessages(prev => [...prev, assistantMessage]);

      return foodItems;
    } catch (error) {
      console.error('Error in processImage:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const clearMessages = () => {
    setMessages([]);
  };

  return (
    <AIContext.Provider value={{
      messages,
      isProcessing,
      processTextInput,
      processImage,
      clearMessages
    }}>
      {children}
    </AIContext.Provider>
  );
};

export const useAI = () => {
  const context = useContext(AIContext);
  if (context === undefined) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
};
