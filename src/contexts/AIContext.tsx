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
    // Food calorie database (simplified)
    const foodDatabase: Record<string, number> = {
      'oats': 307,      // per 100g
      'banana': 105,    // per medium banana
      'apple': 95,      // per medium apple
      'rice': 130,      // per 100g cooked
      'chicken': 165,   // per 100g
      'egg': 70,        // per large egg
      'milk': 42,       // per 100ml
    };

    // Simple food calorie pattern (e.g., "1 banana calorie")
    const simpleFoodMatch = /(\d+)\s+([a-zA-Z\s]+?)(?:\s+calorie|\s+calories|\s+kcal)?$/i;
    const simpleMatch = prompt.match(simpleFoodMatch);
    
    if (simpleMatch) {
      const [, amount, foodName] = simpleMatch;
      const cleanFoodName = foodName.trim().toLowerCase();
      const baseCalories = foodDatabase[cleanFoodName] || 0;
      
      if (baseCalories === 0) {
        console.log(`Food "${cleanFoodName}" not found in database`);
      }
      
      return JSON.stringify([{
        name: foodName.trim(),
        calories: baseCalories * parseInt(amount),
        serving: `${amount} serving`
      }]);
    }

    // Complex food match pattern
    const foodMatch = /(\d+)\s*(g|gm|gram)\s*(?:of\s+)?([a-zA-Z\s]+)(?:\s*,\s*|\s+)(?:where\s+)?serving\s+size\s*(?:is\s+)?(\d+)\s*(g|gm|gram)(?:\s+for|\s+has)?\s+(\d+)\s*(?:calorie|kcal|calories)/i;
    const portionMatch = prompt.match(foodMatch);

    if (portionMatch) {
      const [, totalAmount, unit1, foodName, servingSize, unit2, caloriesPerServing] = portionMatch;
      const total = parseFloat(totalAmount);
      const serving = parseFloat(servingSize);
      const calsPerServing = parseFloat(caloriesPerServing);

      const totalCalories = Math.round((total / serving) * calsPerServing);
      console.log(`Calculating calories for ${foodName}: ${total}g / ${serving}g * ${calsPerServing} calories = ${totalCalories} calories`);

      return JSON.stringify([{
        name: foodName.trim(),
        calories: totalCalories,
        serving: `${total}${unit1}`
      }]);
    }

    const foodItems = [];
    const foodPattern = /🍽️\s*([^🍽️]+?)(?=🍽️|$)/g;
    let patternMatch;

    while ((patternMatch = foodPattern.exec(prompt)) !== null) {
      const itemText = patternMatch[1].trim();
      const nameMatch = /^(.+?)(?:\n|$)/i.exec(itemText);
      const servingMatch = /(\d+)\s*(?:serving|g|gm|gram)/i.exec(itemText);
      const calorieMatch = /(\d+)\s*(?:kcal|calorie|cal)/i.exec(itemText);

      if (nameMatch && calorieMatch) {
        foodItems.push({
          name: nameMatch[1].trim(),
          calories: parseInt(calorieMatch[1]),
          serving: servingMatch ? servingMatch[0] : "1 serving"
        });
      }
    }

    return JSON.stringify(foodItems);
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