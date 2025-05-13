
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

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `As a nutritionist, analyze the following food items and quantities. Respond only with a JSON array where each item reflects the total values (not per-serving), based on the quantity given. Format: [{name: string, calories: number, protein: number, serving: string}]. Food to analyze: ${prompt.replace(/(\d+)\s+(\w+)/g, '$1x $2')}`
          }]
        }],
        safetySettings: [{
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_NONE"
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data = await response.json();
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid API response structure');
    }

    const aiResponse = data.candidates[0].content.parts[0].text;

    try {
      const jsonStr = aiResponse.replace(/```json\n|\n```/g, '').trim();
      const parsedResponse = JSON.parse(jsonStr);
      if (Array.isArray(parsedResponse)) {
        return jsonStr;
      }
    } catch (e) {
      console.error('Invalid JSON response from AI:', aiResponse);
    }

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
        protein: parseFloat(item.protein) || 0,
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

      const analysisResults = result.map(item => ({
        id: uuidv4(),
        name: item.name,
        calories: Math.round(item.calories),
        protein: parseFloat(item.protein.toFixed(1)),
        serving: item.serving
      }));

      const foodNames = analysisResults.map(item => item.name).join(', ');
      const totalCalories = analysisResults.reduce((sum, item) => sum + item.calories, 0);

      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: `I detected: ${foodNames}. Total calories: ${totalCalories} kcal.`,
        timestamp: formatISO(new Date())
      };

      setMessages(prev => [...prev, assistantMessage]);
      return analysisResults;
    } catch (error) {
      console.error('Error processing text:', error);
      return [];
    } finally {
      setIsProcessing(false);
    }
  };

  const optimizeImage = (imageData: string, maxWidth = 800): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        if (img.width <= maxWidth) {
          resolve(imageData);
          return;
        }
        
        const canvas = document.createElement('canvas');
        const ratio = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * ratio;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          resolve(imageData);
        }
      };
      img.src = imageData;
    });
  };

  const processImage = async (imageUrl: string): Promise<FoodItem[]> => {
    if (!imageUrl) {
      throw new Error('No image URL provided');
    }
    
    try {
      setIsProcessing(true);
      const userMessage: Message = {
        id: uuidv4(),
        role: 'user',
        content: '📷 [Image uploaded]',
        timestamp: formatISO(new Date())
      };

      setMessages(prev => [...prev, userMessage]);
      
      const optimizedImage = await optimizeImage(imageUrl);
      let base64Data = optimizedImage;
      if (optimizedImage.includes(',')) {
        base64Data = optimizedImage.split(',')[1];
      }

      const API_KEY = 'AIzaSyCc3d2OB5DbIiciMtiVfUN1-kRf7lX81EQ';
      let attempts = 0;
      const maxAttempts = 3;
      let lastError: Error | null = null;

      while (attempts < maxAttempts) {
        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [{
                parts: [
                  {
                    text: "Analyze this food image and provide a JSON array with the food items, their calories, protein content and serving size. Format: [{name: string, calories: number, protein: number, serving: string}]"
                  },
                  {
                    inlineData: {
                      mimeType: "image/jpeg",
                      data: base64Data
                    }
                  }
                ]
              }],
              generationConfig: {
                temperature: 0.4,
                topK: 32,
                topP: 1
              }
            })
          });

          if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
          }

      const data = await response.json();
          if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
            throw new Error('Invalid API response structure');
          }
          
          const aiResponse = data.candidates[0].content.parts[0].text;
          const jsonStr = aiResponse.replace(/```json\n|\n```/g, '').trim();
          
          // If we get here, the request was successful
          break;
        } catch (error) {
          lastError = error as Error;
          attempts++;
          if (attempts >= maxAttempts) {
            throw new Error(`Failed after ${maxAttempts} attempts. Last error: ${lastError.message}`);
          }
          // Wait before retry with exponential backoff
          await new Promise(r => setTimeout(r, Math.pow(2, attempts) * 1000));
        }
      }
      
      try {
        const result = JSON.parse(jsonStr);
        if (!Array.isArray(result)) {
          throw new Error('Expected array response');
        }

        const analysisResults = result.map(item => ({
          id: uuidv4(),
          name: item.name,
          calories: Math.round(item.calories),
          protein: parseFloat(item.protein.toFixed(1)),
          serving: item.serving
        }));

        const foodNames = analysisResults.map(item => item.name).join(', ');
        const totalCalories = analysisResults.reduce((sum, item) => sum + item.calories, 0);

        const assistantMessage: Message = {
          id: uuidv4(),
          role: 'assistant',
          content: `I identified: ${foodNames}. Total calories: ${totalCalories} kcal.`,
          timestamp: formatISO(new Date())
        };

        setMessages(prev => [...prev, assistantMessage]);
        return analysisResults;
      } catch (error) {
        console.error('Error parsing result:', error);
        return [];
      }
    } catch (error) {
      console.error('Error processing image:', error);
      throw error;
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
