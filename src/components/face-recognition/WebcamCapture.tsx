import React, { useCallback, useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Button } from '@/components/ui/button';
import { Camera, RefreshCw, ScanFace } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface WebcamCaptureProps {
  onCapture: (imageSrc: string) => void;
  isLoading?: boolean;
}

const LIVENESS_CHALLENGES = [
  "Smile widely for the camera! 😁",
  "Look slightly to your left 👀",
  "Look slightly to your right 👀",
  "Blink twice and look at the camera 😑"
];

export function WebcamCapture({ onCapture, isLoading }: WebcamCaptureProps) {
  const webcamRef = useRef<Webcam>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<string>('');
  const [isAnalyzingLiveness, setIsAnalyzingLiveness] = useState(false);

  // Pick a random challenge on mount
  useEffect(() => {
    setChallenge(LIVENESS_CHALLENGES[Math.floor(Math.random() * LIVENESS_CHALLENGES.length)]);
  }, []);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setImgSrc(imageSrc);
      
      // Simulate Liveness Analysis
      setIsAnalyzingLiveness(true);
      setTimeout(() => {
        setIsAnalyzingLiveness(false);
        // Pass the actual image to backend after liveness "succeeds"
        onCapture(imageSrc);
      }, 2000);
    }
  }, [webcamRef, onCapture]);

  const retake = () => {
    setImgSrc(null);
    setChallenge(LIVENESS_CHALLENGES[Math.floor(Math.random() * LIVENESS_CHALLENGES.length)]);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if ((e.code === 'Space' || e.code === 'Enter') && !isLoading && !isAnalyzingLiveness) {
        e.preventDefault();
        if (!imgSrc) {
          capture();
        } else {
          retake(); 
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [capture, imgSrc, isLoading, isAnalyzingLiveness]);

  return (
    <div className="flex flex-col items-center gap-4 p-4 border rounded-lg bg-muted/20 w-full max-w-md mx-auto">
      
      <div className="text-center space-y-1 mb-2">
        <h3 className="font-semibold text-lg flex items-center justify-center gap-2">
          <ScanFace className="w-5 h-5 text-primary" />
          Liveness Verification
        </h3>
        {!imgSrc && (
          <p className="text-sm text-primary font-medium animate-pulse bg-primary/10 py-1.5 px-3 rounded-full border border-primary/20">
            {challenge}
          </p>
        )}
      </div>

      {imgSrc ? (
        <div className="relative rounded-lg overflow-hidden border-2 border-primary/20">
          <img src={imgSrc} alt="Captured face" className="w-full rounded-lg" />
          
          <AnimatePresence>
            {isAnalyzingLiveness && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-primary/20 backdrop-blur-[2px] flex flex-col items-center justify-center"
              >
                <div className="w-full h-full absolute inset-0 overflow-hidden">
                  <motion.div 
                    animate={{ top: ['0%', '100%', '0%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 right-0 h-1 bg-primary shadow-[0_0_15px_rgba(var(--primary),0.8)] z-10"
                  />
                </div>
                <ScanFace className="w-12 h-12 text-primary animate-pulse mb-2 z-20 drop-shadow-md" />
                <p className="text-primary font-bold z-20 drop-shadow-md bg-background/50 px-3 py-1 rounded-md">Analyzing Action...</p>
              </motion.div>
            )}
          </AnimatePresence>

          {!isAnalyzingLiveness && !isLoading && (
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
          )}
        </div>
      ) : (
        <div className="relative rounded-lg overflow-hidden border-2 border-primary/20 bg-black group">
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            className="w-full"
            videoConstraints={{
              width: 720,
              height: 720,
              facingMode: "user"
            }}
          />
          <Button 
            onClick={capture}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 shadow-lg rounded-full px-6 opacity-90 hover:opacity-100 transition-opacity"
            size="lg"
            disabled={isLoading || isAnalyzingLiveness}
          >
            <Camera className="w-5 h-5 mr-2" />
            Capture Action
          </Button>
        </div>
      )}
      
      <div className="text-sm text-muted-foreground text-center">
        {!imgSrc ? (
          <p>Please perform the action above and press <span className="font-semibold">Enter</span>.</p>
        ) : isAnalyzingLiveness ? (
          <p className="text-primary font-medium animate-pulse">Running Biometric Liveness Check...</p>
        ) : isLoading ? (
          <p>Matching Identity to Employee Record...</p>
        ) : (
          <p>Verification failed. Please try again.</p>
        )}
      </div>
    </div>
  );
}
