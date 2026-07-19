import React, { useCallback, useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Button } from '@/components/ui/button';
import { Camera, RefreshCw } from 'lucide-react';

interface WebcamCaptureProps {
  onCapture: (imageSrc: string) => void;
  isLoading?: boolean;
}

export function WebcamCapture({ onCapture, isLoading }: WebcamCaptureProps) {
  const webcamRef = useRef<Webcam>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setImgSrc(imageSrc);
      onCapture(imageSrc);
    }
  }, [webcamRef, onCapture]);

  const retake = () => {
    setImgSrc(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if ((e.code === 'Space' || e.code === 'Enter') && !isLoading) {
        e.preventDefault();
        if (!imgSrc) {
          capture();
        } else {
          retake(); // optionally let them retake with the same key
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [capture, imgSrc, isLoading]);

  return (
    <div className="flex flex-col items-center gap-4 p-4 border rounded-lg bg-muted/20">
      {imgSrc ? (
        <div className="relative rounded-lg overflow-hidden border-2 border-primary/20">
          <img src={imgSrc} alt="Captured face" className="w-full max-w-sm rounded-lg" />
          <Button 
            variant="secondary" 
            size="sm" 
            className="absolute bottom-4 left-1/2 -translate-x-1/2 shadow-lg"
            onClick={retake}
            disabled={isLoading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retake Photo
          </Button>
        </div>
      ) : (
        <div className="relative rounded-lg overflow-hidden border-2 border-primary/20 bg-black">
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            className="w-full max-w-sm"
            videoConstraints={{
              width: 720,
              height: 720,
              facingMode: "user"
            }}
          />
          <Button 
            onClick={capture}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 shadow-lg rounded-full px-6"
            size="lg"
            disabled={isLoading}
          >
            <Camera className="w-5 h-5 mr-2" />
            Capture Face
          </Button>
        </div>
      )}
      
      <div className="text-sm text-muted-foreground text-center">
        {!imgSrc ? (
          <p>Please look directly at the camera and ensure good lighting. <br/><span className="font-semibold mt-1 inline-block">Press Enter or Space to capture.</span></p>
        ) : (
          <p>Analyzing facial features...</p>
        )}
      </div>
    </div>
  );
}
