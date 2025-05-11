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

// Food calorie database
const foodDatabase: Record<string, number> = {
  'pasta': 131,     // per 100g cooked
  'rice': 130,      // per 100g cooked
  'oats': 307,      // per 100g
  'banana': 105,    // per medium banana
  'apple': 95,      // per medium apple
  'orange': 62,     // per medium orange
  'chicken': 165,   // per 100g
  'egg': 70,        // per large egg
  'milk': 42,       // per 100ml
  'bread': 265,     // per 100g
};

const generateResponse = async (prompt: string): Promise<string> => {
  try {
    // First try to match detailed pattern with serving size and calories
    const foodMatch = /(\d+)\s*(?:g|gm|gram)s?\s+(?:of\s+)?([a-zA-Z\s]+)(?:\s*\((?:serving size|per serving)?\s*(\d+)\s*(?:g|gm|gram)s?\s*(?:=|is)?\s*(\d+)\s*(?:kcal|calorie|cal)\))?/i;
    const portionMatch = prompt.match(foodMatch);

    // Try to extract food items and quantities
    const items = prompt.toLowerCase().match(/(\d+)\s*(?:g|gm|gram)s?\s+(?:of\s+)?([a-zA-Z\s]+)/g);
    if (items) {
      const foodItems = [];
      for (const item of items) {
        const [, amount, foodName] = item.match(/(\d+)\s*(?:g|gm|gram)s?\s+(?:of\s+)?([a-zA-Z\s]+)/i) || [];
        if (amount && foodName) {
          const cleanFoodName = foodName.trim().toLowerCase();
          if (foodDatabase[cleanFoodName]) {
            const grams = parseInt(amount);
            const calories = Math.round((grams / 100) * foodDatabase[cleanFoodName]);
            foodItems.push({
              name: cleanFoodName,
              calories: calories,
              serving: `${grams}g`
            });
          }
        }
      }
      if (foodItems.length > 0) {
        return JSON.stringify(foodItems);
      }
    }

    if (portionMatch) {
      const [, amount, foodName, servingSize, caloriesPerServing] = portionMatch;
      if (servingSize && caloriesPerServing) {
        const total = parseFloat(amount);
        const serving = parseFloat(servingSize);
        const calsPerServing = parseFloat(caloriesPerServing);
        const totalCalories = Math.round((total / serving) * calsPerServing);
        console.log(`Calculating calories for ${foodName}: ${total}g / ${serving}g * ${calsPerServing} calories = ${totalCalories} calories`);

        return JSON.stringify([{
          name: foodName.trim(),
          calories: totalCalories,
          serving: `${amount}g`
        }]);
      }
    }

    // Simple food quantity pattern (e.g., "2 banana")
    const simpleFoodMatch = /^(\d+)\s+([a-zA-Z]+)s?$/i;
    const simpleMatch = prompt.match(simpleFoodMatch);

    if (simpleMatch) {
      const [, amount, foodName] = simpleMatch;
      const cleanFoodName = foodName.trim().toLowerCase();
      const baseCalories = foodDatabase[cleanFoodName] || 0;
      const totalCalories = baseCalories * parseInt(amount);

      if (baseCalories === 0) {
        console.log(`Food "${cleanFoodName}" not found in database`);
      }

      return JSON.stringify([{
        name: foodName.trim(),
        calories: totalCalories,
        serving: `${amount} serving${parseInt(amount) > 1 ? 's' : ''}`
      }]);
    }

    // Default response for unrecognized format
    return JSON.stringify([{
      name: prompt.trim(),
      calories: 0,
      serving: "1 serving"
    }]);

  } catch (error) {
    console.error('Error in generateResponse:', error);
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
      const response = await generateResponse("Default food item");
      const result = parseChatGPTResponse(response);

      if (result.length > 0) {
        result[0].imageUrl = imageUrl;
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