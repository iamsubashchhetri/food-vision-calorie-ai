
import React, { useState } from 'react';
import Layout from '../components/Layout';
import { Camera, Image as ImageIcon, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAI } from '../contexts/AIContext';
import { useFoodLog } from '../contexts/FoodLogContext';
import CameraView from '../components/CameraView';
import FoodItem from '../components/FoodItem';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { FoodItem as FoodItemType, MealType } from '../types';

const CameraPage: React.FC = () => {
  const navigate = useNavigate();
  const { processImage } = useAI();
  const { addMealEntry } = useFoodLog();
  const [showCamera, setShowCamera] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<FoodItemType[]>([]);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [mealType, setMealType] = useState<MealType>('snack');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  const handleOpenCamera = () => {
    setShowCamera(true);
  };
  
  const handleCloseCamera = () => {
    setShowCamera(false);
  };
  
  const handleCapturePhoto = async (imageUrl: string) => {
    setShowCamera(false);
    setCapturedImage(imageUrl);
    setIsProcessing(true);
    
    try {
      const results = await processImage(imageUrl);
      setAnalysisResults(results);
      setShowResults(true);
    } catch (error) {
      console.error('Error processing image:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleSaveMeal = () => {
    if (analysisResults.length > 0) {
      addMealEntry(analysisResults, mealType, capturedImage || undefined, notes || undefined);
      navigate('/');
    }
  };
  
  const handleRemoveItem = (id: string) => {
    setAnalysisResults(prev => prev.filter(item => item.id !== id));
  };
  
  const totalCalories = analysisResults.reduce((sum, item) => sum + item.calories, 0);
  
  return (
    <Layout>
      <div className="px-4 py-6">
        {/* Header */}
        <div className="flex items-center mb-6">
          <button 
            onClick={() => navigate(-1)}
            className="mr-4 p-2"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-semibold">Food Recognition</h1>
        </div>
        
        {/* Camera options */}
        {!showResults && !isProcessing && (
          <div className="space-y-6 px-4">
            <p className="text-gray-600">Take a picture of your food or upload an image from your gallery</p>
            
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={handleOpenCamera}
                className="ios-card flex flex-col items-center py-8"
              >
                <Camera size={40} className="text-brand-primary mb-3" />
                <span className="font-medium">Take Photo</span>
              </button>
              
              <label 
                className="ios-card flex flex-col items-center py-8 cursor-pointer"
              >
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const imageUrl = URL.createObjectURL(file);
                      handleCapturePhoto(imageUrl);
                    }
                  }}
                />
                <ImageIcon size={40} className="text-brand-primary mb-3" />
                <span className="font-medium">Upload Image</span>
              </label>
            </div>
          </div>
        )}
        
        {/* Processing state */}
        {isProcessing && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <h3 className="text-lg font-medium mb-2">Analyzing your food</h3>
            <p className="text-gray-600">Detecting items and calculating calories...</p>
          </div>
        )}
        
        {/* Analysis results */}
        {showResults && (
          <div className="animate-fade-in">
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3">Analysis Results</h2>
              
              {capturedImage && (
                <div className="mb-4">
                  <div className="w-full h-48 bg-gray-200 rounded-lg overflow-hidden">
                    <img 
                      src={capturedImage} 
                      alt="Captured food" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
              
              <div className="ios-card mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">Detected Food</h3>
                  <span className="font-medium">{totalCalories} kcal</span>
                </div>
                
                <div className="bg-gray-50 rounded-lg">
                  {analysisResults.map(item => (
                    <FoodItem 
                      key={item.id} 
                      item={item} 
                      showRemove={true}
                      onRemove={() => handleRemoveItem(item.id)}
                    />
                  ))}
                </div>
              </div>
              
              <div className="ios-card">
                <h3 className="font-medium mb-3">Meal Details</h3>
                
                <div className="mb-4">
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
                
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Notes (optional)</label>
                  <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes about this meal"
                    className="ios-input w-full h-20 resize-none"
                  />
                </div>
              </div>
            </div>
            
            <div className="px-4">
              <Button 
                onClick={handleSaveMeal}
                className="ios-button w-full"
              >
                Save Meal
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {showCamera && (
        <CameraView 
          onCapture={handleCapturePhoto}
          onCancel={handleCloseCamera}
        />
      )}
    </Layout>
  );
};

export default CameraPage;
