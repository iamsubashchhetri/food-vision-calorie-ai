
import React from 'react';
import { useFoodLog } from '../contexts/FoodLogContext';
import { Progress } from '../components/ui/progress';

const CalorieProgress: React.FC = () => {
  const { getTodayCalories, getCalorieGoal, todayLog } = useFoodLog();
  
  const calories = getTodayCalories();
  const goal = getCalorieGoal();
  const percentage = Math.min(Math.round((calories / goal) * 100), 100);
  
  // Calculate protein
  const totalProtein = todayLog?.meals.reduce((total, meal) => {
    return total + meal.foods.reduce((mealTotal, food) => mealTotal + (food.protein || 0), 0);
  }, 0) || 0;
  
  const { getProteinGoal } = useFoodLog();
  const proteinGoal = getProteinGoal();
  const proteinPercentage = Math.min(Math.round((totalProtein / proteinGoal) * 100), 100);
  
  // Determine colors based on percentage
  let calorieColor = 'bg-green-500';
  if (percentage >= 90) {
    calorieColor = 'bg-red-500';
  } else if (percentage >= 75) {
    calorieColor = 'bg-yellow-500';
  }
  
  return (
    <div className="ios-card mb-4 animate-fade-in space-y-4">
      <div>
        <h2 className="text-lg font-semibold mb-2">Today's Calories</h2>
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-gray-600">
            {calories} / {goal} kcal
          </span>
          <span className="text-sm font-medium">
            {goal - calories > 0 ? `${goal - calories} kcal left` : 'Goal reached'}
          </span>
        </div>
        <Progress value={percentage} className={`h-2.5 ${calorieColor}`} />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Protein Intake</h2>
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-gray-600">
            {totalProtein.toFixed(1)} / {proteinGoal}g
          </span>
          <span className="text-sm font-medium">
            {proteinGoal - totalProtein > 0 ? `${(proteinGoal - totalProtein).toFixed(1)}g left` : 'Goal reached'}
          </span>
        </div>
        <Progress value={proteinPercentage} className="h-2.5 bg-blue-500" />
      </div>
    </div>
  );
};

export default CalorieProgress;
