
export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein?: number;
  serving?: string;
  imageUrl?: string;
}

export interface MealEntry {
  id: string;
  timestamp: string;
  foods: FoodItem[];
  totalCalories: number;
  mealType: MealType;
  imageUrl?: string;
  notes?: string;
}

export interface DailyLog {
  date: string;
  meals: MealEntry[];
  totalCalories: number;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface UserProfile {
  id: string;
  calorieGoal: number;
  name?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
