import React, { createContext, useContext, useState, useEffect } from 'react';
import { DailyLog, MealEntry, FoodItem, MealType } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { formatISO, parseISO, format } from 'date-fns';
import { auth, db } from '../lib/firebase';
import { collection, doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';

interface FoodLogContextType {
  logs: DailyLog[];
  todayLog: DailyLog | undefined;
  addMealEntry: (foods: FoodItem[], mealType: MealType, imageUrl?: string, notes?: string) => void;
  addFoodItem: (item: Omit<FoodItem, 'id'>, mealEntryId: string) => void;
  removeFoodItem: (foodId: string, mealEntryId: string) => void;
  removeMealEntry: (mealEntryId: string) => void;
  getTodayCalories: () => number;
  getCalorieGoal: () => number;
  setCalorieGoal: (goal: number) => void;
  getProteinGoal: () => number;
  setProteinGoal: (goal: number) => void;
}

const FoodLogContext = createContext<FoodLogContextType | undefined>(undefined);

export const FoodLogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [calorieGoal, setCalorieGoal] = useState<number>(2000);
  const [proteinGoal, setProteinGoal] = useState<number>(50);
  const [unsubscribeSnapshot, setUnsubscribeSnapshot] = useState<(() => void) | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      // Cleanup previous subscription if exists
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }

      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          
          // First check if the document exists and load initial data
          const docSnap = await getDoc(userDocRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            setLogs(data.logs || []);
            setCalorieGoal(data.calorieGoal || 2000);
            setProteinGoal(data.proteinGoal || 50);
          } else {
            // Initialize the document with default values
            const defaultData = {
              logs: [],
              calorieGoal: 2000,
              proteinGoal: 50,
              createdAt: new Date().toISOString()
            };
            await setDoc(userDocRef, defaultData);
            setLogs([]);
            setCalorieGoal(2000);
            setProteinGoal(50);
          }

          // Set up real-time listener for updates
          const unsub = onSnapshot(userDocRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
              const data = docSnapshot.data();
              setLogs(data.logs || []);
              setCalorieGoal(data.calorieGoal || 2000);
              setProteinGoal(data.proteinGoal || 50);
            }
          }, (error) => {
            console.error("Error loading data:", error);
          });

          setUnsubscribeSnapshot(() => unsub);
        } catch (error) {
          console.error("Error setting up data sync:", error);
        }
      } else {
        // Reset state when user logs out
        setLogs([]);
        setCalorieGoal(2000);
        setProteinGoal(50);
      }
    });

    return () => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
      unsubscribe();
    };
  }, []);

  // Save data to Firestore whenever it changes
  useEffect(() => {
    const saveToFirestore = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          await setDoc(userDocRef, {
            logs,
            calorieGoal,
            proteinGoal,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (error) {
          console.error("Error saving data:", error);
        }
      }
    };

    const debounceTimeout = setTimeout(saveToFirestore, 1000);
    return () => clearTimeout(debounceTimeout);
  }, [logs, calorieGoal, proteinGoal]);

  const todayLog = logs.find(
    (log) => log.date === format(new Date(), 'yyyy-MM-dd')
  ) || {
    date: format(new Date(), 'yyyy-MM-dd'),
    meals: [],
    totalCalories: 0,
  };

  const addMealEntry = (foods: FoodItem[], mealType: MealType, imageUrl?: string, notes?: string) => {
    const totalCalories = foods.reduce((sum, food) => sum + food.calories, 0);

    const newMealEntry: MealEntry = {
      id: uuidv4(),
      timestamp: formatISO(new Date()),
      foods,
      totalCalories,
      mealType,
      imageUrl,
      notes,
    };

    const today = format(new Date(), 'yyyy-MM-dd');

    setLogs((prevLogs) => {
      const todayLogIndex = prevLogs.findIndex((log) => log.date === today);

      if (todayLogIndex >= 0) {
        const updatedLogs = [...prevLogs];
        updatedLogs[todayLogIndex] = {
          ...updatedLogs[todayLogIndex],
          meals: [...updatedLogs[todayLogIndex].meals, newMealEntry],
          totalCalories: updatedLogs[todayLogIndex].totalCalories + totalCalories,
        };
        return updatedLogs;
      } else {
        return [
          ...prevLogs,
          {
            date: today,
            meals: [newMealEntry],
            totalCalories,
          },
        ];
      }
    });
  };

  const addFoodItem = (item: Omit<FoodItem, 'id'>, mealEntryId: string) => {
    const newFoodItem: FoodItem = {
      ...item,
      id: uuidv4(),
    };

    setLogs((prevLogs) => {
      return prevLogs.map((log) => {
        const updatedMeals = log.meals.map((meal) => {
          if (meal.id === mealEntryId) {
            return {
              ...meal,
              foods: [...meal.foods, newFoodItem],
              totalCalories: meal.totalCalories + newFoodItem.calories,
            };
          }
          return meal;
        });

        return {
          ...log,
          meals: updatedMeals,
          totalCalories: updatedMeals.reduce((sum, meal) => sum + meal.totalCalories, 0),
        };
      });
    });
  };

  const removeFoodItem = (foodId: string, mealEntryId: string) => {
    setLogs((prevLogs) => {
      return prevLogs.map((log) => {
        const updatedMeals = log.meals.map((meal) => {
          if (meal.id === mealEntryId) {
            const foodToRemove = meal.foods.find((food) => food.id === foodId);
            const updatedFoods = meal.foods.filter((food) => food.id !== foodId);

            return {
              ...meal,
              foods: updatedFoods,
              totalCalories: meal.totalCalories - (foodToRemove?.calories || 0),
            };
          }
          return meal;
        });

        return {
          ...log,
          meals: updatedMeals,
          totalCalories: updatedMeals.reduce((sum, meal) => sum + meal.totalCalories, 0),
        };
      });
    });
  };

  const removeMealEntry = (mealEntryId: string) => {
    setLogs((prevLogs) => {
      return prevLogs.map((log) => {
        const mealToRemove = log.meals.find((meal) => meal.id === mealEntryId);
        const updatedMeals = log.meals.filter((meal) => meal.id !== mealEntryId);

        return {
          ...log,
          meals: updatedMeals,
          totalCalories: log.totalCalories - (mealToRemove?.totalCalories || 0),
        };
      }).filter((log) => log.meals.length > 0);
    });
  };

  const getTodayCalories = () => {
    return todayLog?.totalCalories || 0;
  };

  const getCalorieGoal = () => {
    return calorieGoal;
  };

  const setUserCalorieGoal = (goal: number) => {
    setCalorieGoal(goal);
  };

  const value = {
    logs,
    todayLog,
    addMealEntry,
    addFoodItem,
    removeFoodItem,
    removeMealEntry,
    getTodayCalories,
    getCalorieGoal,
    setCalorieGoal: setUserCalorieGoal,
    getProteinGoal: () => proteinGoal,
    setProteinGoal,
  };

  return <FoodLogContext.Provider value={value}>{children}</FoodLogContext.Provider>;
};

export const useFoodLog = (): FoodLogContextType => {
  const context = useContext(FoodLogContext);
  if (context === undefined) {
    throw new Error('useFoodLog must be used within a FoodLogProvider');
  }
  return context;
};