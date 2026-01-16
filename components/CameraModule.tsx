
import React, { useRef, useState, useCallback, useEffect } from 'react';

interface CameraModuleProps {
  onCapture: (base64: string) => void;
  onClose: () => void;
  label: string;
}

const CameraModule: React.FC<CameraModuleProps> = ({ onCapture, onClose, label }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError("Camera access denied. Please enable permissions.");
      console.error(err);
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [startCamera]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const base64 = canvasRef.current.toDataURL('image/jpeg', 0.8);
        onCapture(base64);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center">
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center text-white">
        <div className="flex flex-col">
          <h2 className="text-xl font-bold tracking-tight">Capture {label}</h2>
          <span className="text-xs text-white/60">Align with grid markers</span>
        </div>
        <button 
          onClick={onClose} 
          className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full transition-all active:scale-90"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="relative w-full max-w-sm aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl border-4 border-white/10 mx-6">
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center text-red-400 p-8 text-center bg-black">
            <p className="text-sm font-medium">{error}</p>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        )}
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Modern Viewfinder Overlay */}
        <div className="absolute inset-0 pointer-events-none p-12 flex items-center justify-center">
          <div className="w-full h-full relative">
             <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-400/80 rounded-tl-lg"></div>
             <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-400/80 rounded-tr-lg"></div>
             <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-400/80 rounded-bl-lg"></div>
             <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-400/80 rounded-br-lg"></div>
             
             {/* Grid lines */}
             <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-20">
               {[...Array(9)].map((_, i) => (
                 <div key={i} className="border border-white/30"></div>
               ))}
             </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-12 flex flex-col items-center gap-4">
        <button
          onClick={capturePhoto}
          className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-full border-2 border-white/50 p-1 active:scale-90 transition-all duration-300"
        >
          <div className="w-full h-full bg-white rounded-full flex items-center justify-center shadow-inner">
             <div className="w-16 h-16 border-2 border-gray-100 rounded-full"></div>
          </div>
        </button>
        <span className="text-white/80 text-sm font-medium px-4 py-2 bg-white/10 backdrop-blur-md rounded-full">
          Auto-focus active
        </span>
      </div>
    </div>
  );
};

export default CameraModule;
