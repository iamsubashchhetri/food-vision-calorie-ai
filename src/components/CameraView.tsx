
import React, { useState, useRef, useEffect } from 'react';
import { Camera, X } from 'lucide-react';

interface CameraViewProps {
  onCapture: (imageUrl: string) => void;
  onCancel: () => void;
}

const CameraView: React.FC<CameraViewProps> = ({ onCapture, onCancel }) => {
  const [mockImageUrl, setMockImageUrl] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
      }
    };
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCapture = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0);
    const imageUrl = canvas.toDataURL('image/jpeg');
    setMockImageUrl(imageUrl);
    onCapture(imageUrl);

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
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
          <div className="bg-gray-800 w-full h-full flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
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
