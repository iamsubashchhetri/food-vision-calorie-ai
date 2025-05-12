import React from 'react';
import { FoodItem as FoodItemType } from '../types';
import { X } from 'lucide-react';

interface FoodItemProps {
  item: FoodItemType;
  onRemove?: () => void;
  showRemove?: boolean;
}

const FoodItem: React.FC<FoodItemProps> = ({ 
  item, 
  onRemove,
  showRemove = false
}) => {
  return (
    <div className="flex items-center justify-between p-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center">
        {item.imageUrl ? (
          <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden mr-3">
            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-10 h-10 bg-brand-secondary rounded-full flex items-center justify-center mr-3">
            <span className="text-sm">🍽️</span>
          </div>
        )}

        <div>
          <h4 className="font-medium text-gray-800">{item.name}</h4>
          <div className="text-sm text-gray-500">
        {item.calories} kcal {item.protein ? `• ${item.protein}g protein` : ''} {item.serving && `• ${item.serving}`}
      </div>
        </div>
      </div>

      <div className="flex items-center">
        <span className="font-medium text-gray-700 mr-3">{item.calories} kcal</span>

        {showRemove && onRemove && (
          <button 
            onClick={onRemove}
            className="p-1.5 rounded-full hover:bg-gray-100"
          >
            <X size={16} className="text-gray-400" />
          </button>
        )}
      </div>
    </div>
  );
};

export default FoodItem;