I will integrate Gemini API for image analysis by adding the `analyzeImageWithGemini` function and modifying the `processImage` function.
</tool_code>
```replit_final_file
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
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyApHWVU-ozOdkE-zllCXuBR_m9kioHK5Wg', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "Analyze this food image and tell me what food items are present and their estimated calories. Format the response as a JSON array with 'name' and 'calories' fields." },
            { inlineData: { mimeType: "image/jpeg", data: imageBase64 } }
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
    const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
    if (!apiKey) {
      console.error('Deepseek API key is missing');
      throw new Error('API key not configured');
    }

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
      })
    });

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
    if (!data.choices?.[0]?.message?.content) {
      console.error('Invalid API response structure:', data);
      throw new Error('Invalid API response structure');
    }

    const aiResponse = data.choices[0].message.content;

    try {
      // Remove markdown code block if present
      const jsonStr = aiResponse.replace(/```json\n|\n