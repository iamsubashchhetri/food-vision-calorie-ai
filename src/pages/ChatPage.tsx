
import React, { useState, useRef, useEffect } from 'react';
import Layout from '../components/Layout';
import { Send } from 'lucide-react';
import { useAI } from '../contexts/AIContext';
import { useFoodLog } from '../contexts/FoodLogContext';
import ChatMessage from '../components/ChatMessage';
import FoodItem from '../components/FoodItem';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { FoodItem as FoodItemType, MealType } from '../types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

const ChatPage: React.FC = () => {
  const { messages, processTextInput, isProcessing } = useAI();
  const { addMealEntry } = useFoodLog();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [foodItems, setFoodItems] = useState<FoodItemType[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [mealType, setMealType] = useState<MealType>('snack');
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const handleSend = async () => {
    if (input.trim() && !isProcessing) {
      const userInput = input;
      setInput('');
      
      try {
        const results = await processTextInput(userInput);
        if (results.length > 0) {
          setFoodItems(results);
          setShowSaveDialog(true);
        }
      } catch (error) {
        console.error('Error processing input:', error);
      }
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  const handleSaveMeal = () => {
    addMealEntry(foodItems, mealType);
    setShowSaveDialog(false);
    setFoodItems([]);
  };
  
  const welcomeMessage = "Hi! I'm your AI nutrition assistant. Tell me what you ate and I'll estimate the calories. For example: 'I had a turkey sandwich with cheese, an apple, and a glass of orange juice.'";
  
  return (
    <Layout>
      <div className="flex flex-col h-full">
        {/* Chat messages */}
        <div className="flex-1 p-4 overflow-y-auto">
          {messages.length === 0 && (
            <div className="bg-gray-100 p-4 rounded-lg mb-4">
              <p className="text-gray-700">{welcomeMessage}</p>
            </div>
          )}
          
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input area */}
        <div className="border-t border-gray-200 bg-white p-3">
          <div className="flex items-center bg-gray-100 rounded-full px-4 py-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Tell me what you ate..."
              className="flex-1 bg-transparent outline-none resize-none max-h-24"
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isProcessing}
              className={`ml-2 p-2 rounded-full ${
                !input.trim() || isProcessing
                  ? 'text-gray-400'
                  : 'text-brand-primary'
              }`}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Save meal dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save your meal</DialogTitle>
          </DialogHeader>
          
          <div className="my-4">
            <div className="mb-4">
              <h3 className="font-medium mb-2">Detected Food</h3>
              <div className="bg-gray-50 rounded-lg">
                {foodItems.map(item => (
                  <FoodItem key={item.id} item={item} />
                ))}
              </div>
              <div className="mt-2 text-right">
                <div className="text-right">
                  <span className="font-medium block">
                    Total Calories: {foodItems.reduce((sum, item) => sum + item.calories, 0)} kcal
                  </span>
                  <span className="font-medium block">
                    Total Protein: {foodItems.reduce((sum, item) => sum + (item.protein || 0), 0)}g
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 mb-1">Meal Type</label>
              <Select value={mealType} onValueChange={(value) => setMealType(value as MealType)}>
                <SelectTrigger className="ios-input">
                  <SelectValue placeholder="Select meal type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="breakfast">Breakfast</SelectItem>
                  <SelectItem value="lunch">Lunch</SelectItem>
                  <SelectItem value="dinner">Dinner</SelectItem>
                  <SelectItem value="snack">Snack</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveMeal} className="bg-brand-primary hover:bg-brand-primary/90">Save Meal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default ChatPage;
