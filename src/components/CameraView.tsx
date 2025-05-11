
import React, { useState } from 'react';
import { Camera, X } from 'lucide-react';

interface CameraViewProps {
  onCapture: (imageUrl: string) => void;
  onCancel: () => void;
}

const CameraView: React.FC<CameraViewProps> = ({ onCapture, onCancel }) => {
  const [mockImageUrl, setMockImageUrl] = useState<string | null>(null);
  
  // This is a mock implementation since we can't access real camera in the browser sandbox
  // In a real React Native app, we would use the camera API
  const handleCapture = () => {
    // Mock image URL for demonstration
    const mockUrl = 'https://picsum.photos/400/300';
    setMockImageUrl(mockUrl);
    
    // In a real app we would have actual camera functionality
    setTimeout(() => {
      onCapture(mockUrl);
    }, 1000);
  };
  
  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="p-4 flex justify-between items-center">
        <button 
          onClick={onCancel}
          className="text-white p-2"
        >
          <X size={24} />
        </button>
        
        <span className="text-white">Take Photo</span>
        
        <div className="w-8"></div> {/* Spacer for alignment */}
      </div>
      
      <div className="flex-1 flex items-center justify-center">
        {mockImageUrl ? (
          <div className="relative w-full h-full">
            <img 
              src={mockImageUrl} 
              alt="Preview" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-pulse bg-white bg-opacity-50 p-3 rounded-full">
                <span>Processing...</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-800 w-full h-full flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Camera size={48} className="mx-auto mb-2" />
              <p>Camera preview would appear here</p>
              <p className="text-sm opacity-70">(Mock implementation)</p>
            </div>
          </div>
        )}
      </div>
      
      <div className="p-8 flex justify-center">
        <button 
          onClick={handleCapture}
          className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center"
        >
          <div className="w-12 h-12 rounded-full bg-white"></div>
        </button>
      </div>
    </div>
  );
};

export default CameraView;
