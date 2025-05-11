
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

// Mock function for AI processing (replace with actual API call in production)
const mockProcessAI = async (text: string): Promise<FoodItem[]> => {
  console.log('Processing with AI:', text);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Mock responses for demonstration
  if (text.toLowerCase().includes('pizza')) {
    return [
      { id: uuidv4(), name: 'Pizza (1 slice)', calories: 285, serving: '1 slice' },
      { id: uuidv4(), name: 'Soda', calories: 150, serving: '12 oz' }
    ];
  } else if (text.toLowerCase().includes('salad')) {
    return [
      { id: uuidv4(), name: 'Garden Salad', calories: 120, serving: '1 bowl' },
      { id: uuidv4(), name: 'Dressing', calories: 85, serving: '2 tbsp' }
    ];
  } else {
    return [
      { id: uuidv4(), name: 'Unknown Food', calories: 250, serving: '1 serving' }
    ];
  }
};

// Mock function for image recognition (replace with actual API call in production)
const mockProcessImage = async (imageUrl: string): Promise<FoodItem[]> => {
  console.log('Processing image with AI:', imageUrl);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Mock response for demonstration
  return [
    { id: uuidv4(), name: 'Detected Food Item', calories: 320, serving: '1 serving', imageUrl },
    { id: uuidv4(), name: 'Side Item', calories: 150, serving: '1 serving' }
  ];
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
      
      // Process with AI (mock for now)
      const result = await mockProcessAI(text);
      
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
      
      // Process with AI (mock for now)
      const result = await mockProcessImage(imageUrl);
      
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
