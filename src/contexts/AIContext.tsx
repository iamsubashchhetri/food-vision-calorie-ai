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

// Create the context
const AIContext = createContext<AIContextType | undefined>(undefined);

// Function to generate responses
const generateResponse = async (prompt: string): Promise<string> => {
  try {
    // Extract serving size calculation from prompt
    const foodMatch = prompt.match(/(?:i ate|had)\s+([a-zA-Z\s]+)\s+(\d+)\s*(g|gm|gram).*?serving\s+size\s+(?:is\s+)?(\d+)\s*(g|gm|gram).*?(\d+)\s+calorie/i);
    
    if (foodMatch) {
      const [, foodName, totalAmount, unit1, servingSize, unit2, calories] = foodMatch;
      const total = parseFloat(totalAmount);
      const serving = parseFloat(servingSize);
      const calsPerServing = parseFloat(calories);
      
      // Calculate proportional calories
      const totalCalories = Math.round((total / serving) * calsPerServing);
      console.log(`Calculating calories: ${total}g total / ${serving}g serving * ${calsPerServing} calories = ${totalCalories} calories`);
      
      return JSON.stringify([{
        name: foodName.trim(),
        calories: totalCalories,
        serving: `${total}${unit1}`
      }]);
    }
    
    // If no serving size calculation needed, use Deepseek API
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer sk-0e79e598702e46b7955612fcce758de1`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{
          role: "system",
          content: "You are a nutrition expert. Extract food items, quantities, and calculate calories. Return response in JSON format."
        }, {
          role: "user",
          content: prompt
        }],
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling Deepseek API:', error);
    // Fallback to regex parsing if API fails
    const foodMatch = prompt.match(/(\d+)\s*(g|gm|gram|ml|cup|tbsp|tsp)\s+(?:of\s+)?([a-zA-Z\s]+)\s+where\s+(\d+)\s*(g|gm|gram|ml|cup|tbsp|tsp)\s+(?:serving\s+size\s+)?has\s+(\d+)\s+calorie/i);
  
  if (foodMatch) {
    const [, quantity, unit, foodName, servingSize, servingUnit, calories] = foodMatch;
    const amount = parseFloat(quantity);
    const baseServing = parseFloat(servingSize);
    const caloriesPerServing = parseFloat(calories);
    
    // Convert different units to a common base if needed
    const getBaseAmount = (val: number, unit: string) => {
      switch(unit.toLowerCase()) {
        case 'cup': return val * 240; // 1 cup ≈ 240ml
        case 'tbsp': return val * 15; // 1 tbsp ≈ 15ml
        case 'tsp': return val * 5;  // 1 tsp ≈ 5ml
        default: return val;
      }
    };
    
    const normalizedAmount = getBaseAmount(amount, unit);
    const normalizedServing = getBaseAmount(baseServing, servingUnit);
    
    // Calculate total calories based on proportion
    const totalCalories = Math.round((normalizedAmount / normalizedServing) * caloriesPerServing);
    
    return JSON.stringify([{
      name: foodName.trim(),
      calories: totalCalories,
      serving: `${amount}${unit}`
    }]);
  }
  
  const foodRegex = /(\d*\.?\d*)\s*(cup|slice|tablespoon|tbsp|tsp|teaspoon|g|gram|ml|piece|pieces|whole|medium|large|small)?\s*(?:of\s+)?([a-zA-Z\s]+)/g;
  const matches = [...prompt.matchAll(foodRegex)];
  
  const foodItems = matches.map(match => {
    const quantity = match[1] ? parseFloat(match[1]) : 1;
    const unit = match[2] || "serving";
    const name = match[3].trim();
    
    // Simplified calorie estimation
    const calorieEstimates: { [key: string]: number } = {
      milk: 103,
      bread: 79,
      "peanut butter": 95,
      apple: 95,
      banana: 105,
      orange: 62,
      eggs: 70,
      rice: 130,
      chicken: 165,
      beef: 250,
    };
    
    const baseCals = calorieEstimates[name.toLowerCase()] || 100;
    const calories = Math.round(baseCals * quantity);
    
    return {
      name: name.charAt(0).toUpperCase() + name.slice(1),
      calories,
      serving: `${quantity} ${unit}`
    };
  });
  
  return JSON.stringify(foodItems.length > 0 ? foodItems : [{
    name: prompt,
    calories: 100,
    serving: "1 serving"
  }]);
  }
};

// Parse the response to extract food items and calories
const parseChatGPTResponse = (responseText: string): FoodItem[] => {
  try {
    console.log("Parsing response:", responseText);
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || 
                      responseText.match(/\[\s*\{[\s\S]*?\}\s*\]/) ||
                      responseText.match(/{[\s\S]*?}/);

    let jsonText = jsonMatch ? jsonMatch[0] : responseText;
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\s*|\s*```/g, '');
    }

    console.log("Extracted JSON text:", jsonText);
    const arrayMatch = jsonText.match(/\[\s*\{[\s\S]*?\}\s*\]/);
    if (arrayMatch) {
      jsonText = arrayMatch[0];
    }

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
      const userMessage: Message = {
        id: uuidv4(),
        role: 'user',
        content: text,
        timestamp: formatISO(new Date())
      };

      setMessages(prev => [...prev, userMessage]);
      const mockResponse = await generateResponse(text);
      const result = parseChatGPTResponse(mockResponse);

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
      const userMessage: Message = {
        id: uuidv4(),
        role: 'user',
        content: '📷 [Image uploaded]',
        timestamp: formatISO(new Date())
      };

      setMessages(prev => [...prev, userMessage]);
      const mockResponse = await generateResponse("mock image");
      const result = parseChatGPTResponse(mockResponse);

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