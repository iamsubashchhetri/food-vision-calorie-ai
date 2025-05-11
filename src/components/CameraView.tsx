import React, { useState } from "react";
import { Camera, X } from "lucide-react";

interface CameraViewProps {
  onCapture: (imageUrl: string) => void;
  onCancel: () => void;
}

const CameraView: React.FC<CameraViewProps> = ({ onCapture, onCancel }) => {
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);

  const handleCapture = () => {
    // Implement actual camera functionality here if applicable
    // For now, we will use a mock URL for demonstration
    const mockUrl = "https://picsum.photos/400/300";
    setCapturedImageUrl(mockUrl);
    onCapture(mockUrl); // Pass the mock URL to the onCapture callback
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setCapturedImageUrl(imageUrl);
      onCapture(imageUrl); // Pass the image URL to the onCapture callback
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="p-4 flex justify-between items-center">
        <button onClick={onCancel} className="text-white p-2">
          <X size={24} />
        </button>
        <span className="text-white">Take Photo</span>
        <div className="w-8"></div> {/* Spacer for alignment */}
      </div>

      <div className="flex-1 flex items-center justify-center">
        {capturedImageUrl ? (
          <div className="relative w-full h-full">
            <img
              src={capturedImageUrl}
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
              <p>Select or take a picture of your food</p>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="mt-4"
              />
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
