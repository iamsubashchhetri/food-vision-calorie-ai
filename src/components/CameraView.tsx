
import React, { useState, useRef, useEffect } from "react";
import { Camera, X } from "lucide-react";

interface CameraViewProps {
  onCapture: (imageUrl: string) => void;
  onCancel: () => void;
}

const CameraView: React.FC<CameraViewProps> = ({ onCapture, onCancel }) => {
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' },
        audio: false 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImageUrl(imageUrl);
        stopCamera();
        onCapture(imageUrl);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="p-4 flex justify-between items-center">
        <button onClick={onCancel} className="text-white p-2">
          <X size={24} />
        </button>
        <span className="text-white">Take Photo</span>
        <div className="w-8"></div>
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
          <div className="relative w-full h-full bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

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
