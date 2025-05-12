
import React, { useState } from 'react';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFoodLog } from '../contexts/FoodLogContext';
import { v4 as uuidv4 } from 'uuid';
import { FoodItem as FoodItemType, MealType } from '../types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Button } from '../components/ui/button';
import FoodItem from '../components/FoodItem';

const AddMealPage: React.FC = () => {
  const navigate = useNavigate();
  const { addMealEntry } = useFoodLog();
  const [mealType, setMealType] = useState<MealType>('snack');
  const [foodItems, setFoodItems] = useState<FoodItemType[]>([]);
  const [notes, setNotes] = useState('');
  
  // New food item form state
  const [showAddFood, setShowAddFood] = useState(false);
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [serving, setServing] = useState('');
  
  const handleAddFoodItem = () => {
    if (foodName && calories) {
      const newItem: FoodItemType = {
        id: uuidv4(),
        name: foodName,
        calories: parseInt(calories),
        protein: protein ? parseFloat(protein) : undefined,
        serving: serving || undefined
      };
      
      setFoodItems([...foodItems, newItem]);
      
      // Reset form
      setFoodName('');
      setCalories('');
      setProtein('');
      setServing('');
      setShowAddFood(false);
    }
  };
  
  const handleRemoveFoodItem = (id: string) => {
    setFoodItems(foodItems.filter(item => item.id !== id));
  };
  
  const handleSaveMeal = () => {
    if (foodItems.length > 0) {
      addMealEntry(foodItems, mealType, undefined, notes || undefined);
      navigate('/');
    }
  };
  
  const totalCalories = foodItems.reduce((sum, item) => sum + item.calories, 0);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 py-6">
        {/* Header */}
        <div className="flex items-center mb-6">
          <button 
            onClick={() => navigate(-1)}
            className="mr-4 p-2"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-semibold">Add Meal</h1>
        </div>
        
        <div className="ios-card mb-4">
          <h2 className="font-medium mb-3">Meal Type</h2>
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
        
        <div className="ios-card mb-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-medium">Food Items</h2>
            <span className="font-medium">{totalCalories} kcal</span>
          </div>
          
          {foodItems.length > 0 ? (
            <div className="bg-gray-50 rounded-lg mb-3">
              {foodItems.map(item => (
                <FoodItem 
                  key={item.id} 
                  item={item} 
                  showRemove={true}
                  onRemove={() => handleRemoveFoodItem(item.id)}
                />
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-4 text-center mb-3">
              <p className="text-gray-500">No food items added yet</p>
            </div>
          )}
          
          {!showAddFood ? (
            <Button 
              onClick={() => setShowAddFood(true)}
              variant="outline"
              className="w-full flex items-center justify-center"
            >
              <Plus size={16} className="mr-1" />
              Add Food Item
            </Button>
          ) : (
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-medium">New Food Item</h3>
                <button 
                  onClick={() => setShowAddFood(false)}
                  className="p-1"
                >
                  <X size={16} />
                </button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Food Name</label>
                  <input
                    value={foodName}
                    onChange={(e) => setFoodName(e.target.value)}
                    placeholder="e.g. Apple"
                    className="ios-input w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Calories</label>
                  <input
                    type="number"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    placeholder="e.g. 95"
                    className="ios-input w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">Protein (g)</label>
                  <input
                    type="number"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                    placeholder="e.g. 20"
                    className="ios-input w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Serving Size (optional)</label>
                  <input
                    value={serving}
                    onChange={(e) => setServing(e.target.value)}
                    placeholder="e.g. 1 medium"
                    className="ios-input w-full"
                  />
                </div>
                
                <Button 
                  onClick={handleAddFoodItem}
                  disabled={!foodName || !calories}
                  className="w-full ios-button"
                >
                  Add Item
                </Button>
              </div>
            </div>
          )}
        </div>
        
        <div className="ios-card mb-6">
          <h2 className="font-medium mb-3">Notes (optional)</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about this meal"
            className="ios-input w-full h-24 resize-none"
          />
        </div>
        
        <Button 
          onClick={handleSaveMeal}
          disabled={foodItems.length === 0}
          className="ios-button w-full"
        >
          Save Meal
        </Button>
      </div>
    </div>
  );
};

export default AddMealPage;
