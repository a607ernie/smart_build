import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { Material } from '../types';

interface ScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export const Scanner: React.FC<ScannerProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string>('');
  const [isScanning, setIsScanning] = useState(true);

  // Fallback for demo environments where camera might be blocked
  const handleSimulateScan = () => {
    onScan('M001-STEEL-50-3'); // Simulating a scan of the first item
  };

  const tick = useCallback(() => {
    if (!isScanning) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Attempt to find QR code
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code) {
          setIsScanning(false);
          onScan(code.data);
          return; // Stop loop
        }
      }
    }
    
    if (isScanning) {
      requestAnimationFrame(tick);
    }
  }, [isScanning, onScan]);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Required for iOS/Android to play inline without fullscreen
          videoRef.current.setAttribute("playsinline", "true"); 
          videoRef.current.play();
          requestAnimationFrame(tick);
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError("無法存取相機，請確認您使用的是 HTTPS 協定並已授權相機權限。");
      }
    };

    startCamera();

    return () => {
      setIsScanning(false);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [tick]);

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-95 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg overflow-hidden shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-gray-800 text-white rounded-full opacity-75 hover:opacity-100"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="relative aspect-[3/4] bg-black">
           {!error ? (
             <>
               <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted />
               <canvas ref={canvasRef} className="hidden" />
               <div className="absolute inset-0 border-2 border-blue-500 opacity-50 m-12 rounded-lg pointer-events-none animate-pulse"></div>
               <div className="absolute bottom-4 left-0 right-0 text-center text-white text-sm bg-black bg-opacity-50 py-2">
                 將 QR Code 對準框線
               </div>
             </>
           ) : (
             <div className="flex flex-col items-center justify-center h-full text-white p-6 text-center">
               <p className="mb-4 text-red-400">{error}</p>
               <button 
                 onClick={handleSimulateScan}
                 className="px-4 py-2 bg-blue-600 rounded text-white font-medium hover:bg-blue-700"
               >
                 模擬掃描 (演示)
               </button>
             </div>
           )}
        </div>
        
        <div className="p-4 bg-gray-50 text-center">
            <p className="text-gray-600 text-sm">正在掃描材料標籤...</p>
        </div>
      </div>
    </div>
  );
};
