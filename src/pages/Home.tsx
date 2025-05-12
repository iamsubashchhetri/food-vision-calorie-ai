
import React, { useState } from 'react';
import Layout from '../components/Layout';
import CalorieProgress from '../components/CalorieProgress';
import MealCard from '../components/MealCard';
import { format, parseISO, isToday } from 'date-fns';
import { useFoodLog } from '../contexts/FoodLogContext';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import FoodItem from '../components/FoodItem';
import { MealEntry } from '../types';

const Home: React.FC = () => {
  const { todayLog } = useFoodLog();
  const navigate = useNavigate();
  const [selectedMeal, setSelectedMeal] = useState<MealEntry | null>(null);
  
  const handleAddMeal = () => {
    navigate('/add-meal');
  };
  
  const handleMealClick = (meal: MealEntry) => {
    setSelectedMeal(meal);
  };
  
  // Group meals by type
  const mealsByType = todayLog?.meals.reduce((acc, meal) => {
    if (!acc[meal.mealType]) {
      acc[meal.mealType] = [];
    }
    acc[meal.mealType].push(meal);
    return acc;
  }, {} as Record<string, MealEntry[]>) || {};
  
  // Order meal types
  const mealTypeOrder = ['breakfast', 'lunch', 'dinner', 'snack'];
  
  return (
    <Layout>
      <div className="px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Today</h1>
          <span className="text-gray-600">
            {format(new Date(), 'EEEE, MMM d')}
          </span>
        </div>
        
        <CalorieProgress />
        
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Meals</h2>
          <button 
            onClick={handleAddMeal}
            className="flex items-center text-brand-primary"
          >
            <Plus size={18} />
            <span className="ml-1">Add meal</span>
          </button>
        </div>
        
        {todayLog?.meals.length ? (
          <>
            {mealTypeOrder.map(type => (
              mealsByType[type] && (
                <div key={type} className="mb-5">
                  <h3 className="text-sm font-medium text-foreground uppercase mb-2 capitalize">{type}</h3>
                  {mealsByType[type].map(meal => (
                    <MealCard 
                      key={meal.id} 
                      meal={meal} 
                      onExpand={() => handleMealClick(meal)}
                    />
                  ))}
                </div>
              )
            ))}
          </>
        ) : (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">🍽️</div>
            <h3 className="text-lg font-medium text-gray-700 mb-1">No meals yet</h3>
            <p className="text-gray-500 mb-4">Track your first meal to start logging your calories</p>
            <button 
              onClick={handleAddMeal}
              className="ios-button"
            >
              Add Your First Meal
            </button>
          </div>
        )}
      </div>
      
      {/* Meal Detail Dialog */}
      <Dialog open={!!selectedMeal} onOpenChange={() => setSelectedMeal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <span className="capitalize mr-2">{selectedMeal?.mealType}</span>
              <span className="text-sm text-gray-500">
                {selectedMeal && format(parseISO(selectedMeal.timestamp), 'h:mm a')}
              </span>
            </DialogTitle>
          </DialogHeader>
          
          <div>
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">Food Items</h3>
                <span className="text-brand-primary font-medium">{selectedMeal?.totalCalories} kcal</span>
              </div>
              
              <div className="bg-gray-50 rounded-lg">
                {selectedMeal?.foods.map(item => (
                  <FoodItem key={item.id} item={item} />
                ))}
              </div>
            </div>
            
            {selectedMeal?.imageUrl && (
              <div className="mb-4">
                <h3 className="font-medium mb-2">Photo</h3>
                <div className="w-full h-48 bg-gray-200 rounded-lg overflow-hidden">
                  <img 
                    src={selectedMeal.imageUrl} 
                    alt="Meal" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
            
            {selectedMeal?.notes && (
              <div>
                <h3 className="font-medium mb-2">Notes</h3>
                <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedMeal.notes}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Home;
