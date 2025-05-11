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

// Cache responses for 5 minutes
const responseCache = new Map<string, {data: string, timestamp: number}>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const TIMEOUT_DURATION = 15000; // 15 seconds timeout

const generateResponse = async (prompt: string): Promise<string> => {
  try {
    // Check cache first
    const cached = responseCache.get(prompt);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
    if (!apiKey) {
      console.error('Deepseek API key is missing');
      throw new Error('API key not configured');
    }

    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), TIMEOUT_DURATION);
    });

    const fetchPromise = fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer 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`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'NutriCal AI'
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-r1:free",
        messages: [{
          role: "system",
          content: "You are a nutritionist. When given a food description, respond only with a JSON array containing food items, their estimated calories, and serving size. Format: [{name: string, calories: number, serving: string}]"
        }, {
          role: "user",
          content: prompt
        }],
        temperature: 0.3, // Lower temperature for more consistent responses
        max_tokens: 150 // Limit response length
      })
    });

    const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;

    if (!response.ok) {
      console.error('API Response:', response);
      if (response.status === 402) {
        throw new Error('Deepseek API subscription required or payment needed');
      } else if (response.status === 401) {
        throw new Error('Invalid API key or authentication failed');
      } else {
        throw new Error(`Deepseek API error: ${response.status}`);
      }
    }

    const data = await response.json();
    if (!data.choices?.[0]?.message) {
      console.error('Invalid API response structure:', data);
      throw new Error('Invalid API response structure');
    }
    
    const aiResponse = data.choices[0].message.content || data.choices[0].message.reasoning || '';
    
    // Cache successful response
    if (aiResponse) {
      responseCache.set(prompt, {
        data: aiResponse,
        timestamp: Date.now()
      });
    }

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