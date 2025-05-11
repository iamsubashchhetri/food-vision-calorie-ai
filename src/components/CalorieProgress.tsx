
import React from 'react';
import { useFoodLog } from '../contexts/FoodLogContext';
import { Progress } from '../components/ui/progress';

const CalorieProgress: React.FC = () => {
  const { getTodayCalories, getCalorieGoal } = useFoodLog();
  
  const calories = getTodayCalories();
  const goal = getCalorieGoal();
  const percentage = Math.min(Math.round((calories / goal) * 100), 100);
  
  // Calculate remaining calories
  const remaining = goal - calories;
  
  // Determine color based on percentage
  let progressColor = 'bg-green-500';
  if (percentage >= 90) {
    progressColor = 'bg-red-500';
  } else if (percentage >= 75) {
    progressColor = 'bg-yellow-500';
  }
  
  return (
    <div className="ios-card mb-4 animate-fade-in">
      <h2 className="text-lg font-semibold mb-2">Today's Calories</h2>
      
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm text-gray-600">
          {calories} / {goal} kcal
        </span>
        <span className="text-sm font-medium">
          {remaining > 0 ? `${remaining} kcal left` : 'Goal reached'}
        </span>
      </div>
      
      <Progress value={percentage} className={`h-2.5 ${progressColor}`} />
      
      <div className="flex justify-between mt-3">
        <div>
          <p className="text-xs text-gray-500">Consumed</p>
          <p className="font-semibold">{calories} kcal</p>
        </div>
        
        <div className="text-right">
          <p className="text-xs text-gray-500">Daily Goal</p>
          <p className="font-semibold">{goal} kcal</p>
        </div>
      </div>
    </div>
  );
};

export default CalorieProgress;
