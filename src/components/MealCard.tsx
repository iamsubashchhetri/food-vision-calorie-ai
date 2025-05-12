
import React from 'react';
import { MealEntry, MealType } from '../types';
import { format, parseISO } from 'date-fns';
import { useFoodLog } from '../contexts/FoodLogContext';
import { ChevronRight, Trash2 } from 'lucide-react';

interface MealCardProps {
  meal: MealEntry;
  onExpand?: () => void;
}

const MealCard: React.FC<MealCardProps> = ({ meal, onExpand }) => {
  const { removeMealEntry } = useFoodLog();
  
  // Get mealType icon and color
  const getMealTypeDetails = (type: MealType) => {
    switch (type) {
      case 'breakfast':
        return { emoji: '🍳', color: 'bg-yellow-100' };
      case 'lunch':
        return { emoji: '🥗', color: 'bg-green-100' };
      case 'dinner':
        return { emoji: '🍽️', color: 'bg-blue-100' };
      case 'snack':
        return { emoji: '🍏', color: 'bg-purple-100' };
      default:
        return { emoji: '🍴', color: 'bg-gray-100' };
    }
  };
  
  const { emoji, color } = getMealTypeDetails(meal.mealType);
  
  const formattedTime = format(parseISO(meal.timestamp), 'h:mm a');
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeMealEntry(meal.id);
  };
  
  return (
    <div 
      className="ios-card mb-3 flex items-center hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors"
      onClick={onExpand}
    >
      <div className={`${color} w-12 h-12 rounded-full flex items-center justify-center text-lg mr-3`}>
        <span>{emoji}</span>
      </div>
      
      <div className="flex-1">
        <div className="flex justify-between">
          <h3 className="font-medium capitalize">{meal.mealType}</h3>
          <span className="text-sm text-gray-500">{formattedTime}</span>
        </div>
        
        <p className="text-sm text-gray-500 line-clamp-1">
          {meal.foods.map(food => food.name).join(', ')}
        </p>
      </div>
      
      <div className="flex items-center ml-2">
        <span className="font-medium text-brand-dark mr-2">{meal.totalCalories} kcal</span>
        
        <button 
          onClick={handleDelete}
          className="text-gray-400 hover:text-red-500 p-1.5 rounded-full hover:bg-red-50 mr-1 transition-colors"
        >
          <Trash2 size={18} />
        </button>
        
        <ChevronRight className="text-gray-400" size={18} />
      </div>
    </div>
  );
};

export default MealCard;
