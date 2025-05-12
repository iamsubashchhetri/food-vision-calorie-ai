
import React, { useState } from 'react';
import Layout from '../components/Layout';
import { useFoodLog } from '../contexts/FoodLogContext';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Sliders, Settings, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { format } from 'date-fns';

const ProfilePage: React.FC = () => {
  const { getCalorieGoal, setCalorieGoal, getProteinGoal, setProteinGoal, logs } = useFoodLog();
  const { user, signInWithGoogle, logout } = useAuth();
  const [calorieInput, setCalorieInput] = useState(getCalorieGoal().toString());
  const [proteinInput, setProteinInput] = useState(getProteinGoal().toString());
  const [showResetDialog, setShowResetDialog] = useState(false);
  
  const handleSaveGoal = () => {
    const calories = parseInt(calorieInput);
    if (!isNaN(calories) && calories > 0) {
      setCalorieGoal(calories);
    }
  };
  
  // This would be implemented in a real app to clear all user data
  const handleResetData = () => {
    // In a real app, we would clear the data from storage
    setShowResetDialog(false);
    
    // For the demo, we'll just reload the page
    window.location.reload();
  };
  
  // Calculate statistics
  const totalDays = logs.length;
  const totalCalories = logs.reduce((sum, log) => sum + log.totalCalories, 0);
  const averageCalories = totalDays > 0 ? Math.round(totalCalories / totalDays) : 0;
  const totalMeals = logs.reduce((sum, log) => sum + log.meals.length, 0);
  
  return (
    <Layout>
      <div className="px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Profile</h1>
        
        {!user ? (
          <div className="ios-card mb-6">
            <h2 className="text-lg font-semibold mb-4">Sign In</h2>
            <Button onClick={signInWithGoogle} className="w-full">
              Sign in with Google
            </Button>
          </div>
        ) : (
          <div className="ios-card mb-6">
            <div className="flex items-center gap-4 mb-4">
              <img src={user.photoURL || ''} alt={user.displayName || ''} className="w-12 h-12 rounded-full" />
              <div>
                <h2 className="font-semibold">{user.displayName}</h2>
                <p className="text-sm text-gray-600">{user.email}</p>
              </div>
            </div>
            <Button onClick={logout} variant="outline" className="w-full">
              Sign Out
            </Button>
          </div>
        )}
        
        <div className="ios-card mb-6">
          <h2 className="text-lg font-semibold flex items-center mb-4">
            <Sliders className="mr-2" size={18} />
            Goals
          </h2>
          
          <div>
            <label className="block text-sm text-gray-600 mb-1">Daily Calorie Target</label>
            <div className="flex items-center">
              <Input
                type="number"
                value={calorieInput}
                onChange={(e) => setCalorieInput(e.target.value)}
                className="ios-input mr-2"
              />
              <Button onClick={handleSaveGoal} className="ios-button whitespace-nowrap">
                Save
              </Button>
            </div>

            <label className="block text-sm text-gray-600 mb-1 mt-4">Daily Protein Target (g)</label>
            <div className="flex items-center">
              <Input
                type="number"
                value={proteinInput}
                onChange={(e) => setProteinInput(e.target.value)}
                className="ios-input mr-2"
              />
              <Button onClick={() => {
                const protein = parseInt(proteinInput);
                if (!isNaN(protein) && protein > 0) {
                  setProteinGoal(protein);
                }
              }} className="ios-button whitespace-nowrap">
                Save
              </Button>
            </div>
          </div>
        </div>
        
        <div className="ios-card mb-6">
          <h2 className="text-lg font-semibold flex items-center mb-4">
            <Settings className="mr-2" size={18} />
            Statistics
          </h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <h3 className="text-sm text-gray-600 mb-1">Days Tracked</h3>
                <p className="text-xl font-semibold">{totalDays}</p>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <h3 className="text-sm text-gray-600 mb-1">Total Meals</h3>
                <p className="text-xl font-semibold">{totalMeals}</p>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <h3 className="text-sm text-gray-600 mb-1">Total Calories</h3>
                <p className="text-xl font-semibold">{totalCalories}</p>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <h3 className="text-sm text-gray-600 mb-1">Avg. Daily</h3>
                <p className="text-xl font-semibold">{averageCalories}</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow">
              <h3 className="text-lg font-semibold p-4 border-b">Daily History</h3>
              <div className="divide-y">
                {logs.map((log) => (
                  <div key={log.date} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">{format(new Date(log.date), 'MMMM d, yyyy')}</span>
                      <span className={`font-semibold ${log.totalCalories > getCalorieGoal() ? 'text-red-500' : 'text-green-500'}`}>
                        {log.totalCalories} kcal
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {log.meals.length} meals · {log.totalCalories > getCalorieGoal() ? 
                        `${log.totalCalories - getCalorieGoal()} kcal over goal` : 
                        `${getCalorieGoal() - log.totalCalories} kcal under goal`
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <Alert variant="destructive" className="bg-red-50">
            <AlertDescription className="flex items-center justify-between">
              <span>Reset all data and start fresh</span>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => setShowResetDialog(true)}
              >
                Reset
              </Button>
            </AlertDescription>
          </Alert>
        </div>
        
        <div className="text-center text-gray-500 text-sm">
          <p>NutriCal AI v1.0.0</p>
          <p>Last synced: {format(new Date(), 'MMM d, yyyy h:mm a')}</p>
        </div>
      </div>
      
      {/* Reset data confirmation dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-500">
              <Trash2 className="mr-2" size={18} />
              Reset All Data
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-gray-700">Are you sure you want to reset all your data? This action cannot be undone.</p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleResetData}>Reset Everything</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default ProfilePage;
