/**
 * Utility to generate simple UI sounds using the Web Audio API without needing external audio files.
 */

const playTone = (frequency: number, type: OscillatorType, durationMs: number, volume: number = 0.1) => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const audioCtx = new AudioContext();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    
    // Fade out to prevent clicking
    gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + durationMs / 1000);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + durationMs / 1000);
  } catch (e) {
    console.error('Audio playback failed', e);
  }
}

export const playSuccessSound = () => {
  // A pleasant double beep (ascending)
  playTone(440, 'sine', 150, 0.1); // A4
  setTimeout(() => playTone(659.25, 'sine', 300, 0.1), 150); // E5
}

export const playErrorSound = () => {
  // A low double beep (descending/harsh)
  playTone(300, 'square', 200, 0.05); 
  setTimeout(() => playTone(250, 'square', 400, 0.05), 200); 
}
