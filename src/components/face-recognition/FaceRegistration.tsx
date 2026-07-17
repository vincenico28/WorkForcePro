import React, { useState } from 'react';
import { WebcamCapture } from './WebcamCapture';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth.store';
import { supabase } from '@/lib/supabase';
import { playSuccessSound, playErrorSound } from '@/utils/audio';

interface FaceRegistrationProps {
  targetEmployee?: any; // If provided, register for this employee instead of the logged-in user
  onSuccess?: () => void;
}

export function FaceRegistration({ targetEmployee, onSuccess }: FaceRegistrationProps = {}) {
  const { employee: authEmployee, setEmployee } = useAuthStore();
  const employee = targetEmployee || authEmployee;
  const [isRegistering, setIsRegistering] = useState(false);
  const hasFaceId = !!(employee as any)?.face_encoding;

  // We convert the base64 string to a blob to send via multipart/form-data
  const dataURItoBlob = (dataURI: string) => {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  };

  const handleCapture = async (imageSrc: string) => {
    if (!employee) return;
    
    setIsRegistering(true);
    const blob = dataURItoBlob(imageSrc);
    const formData = new FormData();
    formData.append('file', blob, 'face.jpg');

    try {
      // Assuming FastAPI runs locally on 8000
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
      const response = await fetch(`${API_BASE}/api/register_face`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to extract face encoding');
      }

      const data = await response.json();
      const faceEncoding = data.encoding;

      // Update Supabase profile
      const { error } = await supabase
        .from('employees')
        .update({ face_encoding: faceEncoding })
        .eq('id', employee.id);

      if (error) throw error;

      // Update local store only if it's the logged-in user
      if (!targetEmployee) {
        setEmployee({ ...employee, face_encoding: faceEncoding } as any);
      }
      playSuccessSound();
      toast.success('Face ID registered successfully!');
      if (onSuccess) onSuccess();
    } catch (error: any) {
      playErrorSound();
      toast.error('Face registration failed', { description: error.message });
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Face ID Registration</CardTitle>
        <CardDescription>
          Register your face to quickly clock in and clock out of your shifts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasFaceId ? (
          <div className="p-4 bg-green-50 text-green-700 rounded-md border border-green-200">
            <h4 className="font-semibold mb-1">Face ID Active</h4>
            <p className="text-sm">You have already registered your face. You can update it by capturing a new photo below.</p>
          </div>
        ) : null}
        
        <WebcamCapture onCapture={handleCapture} isLoading={isRegistering} />
      </CardContent>
    </Card>
  );
}
