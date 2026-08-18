// Audio synthesis utility for crisp, professional notification bell chime
// Uses browser native Web Audio API with zero external audio assets or network latency

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

// Unlock audio on first user click anywhere
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    const ctx = getAudioContext()
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }
    window.removeEventListener('click', unlockAudio)
    window.removeEventListener('keydown', unlockAudio)
  }
  window.addEventListener('click', unlockAudio, { once: true })
  window.addEventListener('keydown', unlockAudio, { once: true })
}

/**
 * Plays a pleasant, dual-tone crystal chime sound for incoming notifications.
 */
export function playNotificationSound() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime

    // Tone 1: High crisp initial attack (e.g., E5 / 659.25 Hz)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(659.25, now)
    osc1.frequency.exponentialRampToValueAtTime(880.00, now + 0.1) // slide to A5

    gain1.gain.setValueAtTime(0, now)
    gain1.gain.linearRampToValueAtTime(0.3, now + 0.02)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6)

    osc1.connect(gain1)
    gain1.connect(ctx.destination)

    osc1.start(now)
    osc1.stop(now + 0.6)

    // Tone 2: Harmonious resonance bell (e.g., C#6 / 1108.73 Hz)
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'triangle'
    osc2.frequency.setValueAtTime(1108.73, now + 0.08)

    gain2.gain.setValueAtTime(0, now + 0.08)
    gain2.gain.linearRampToValueAtTime(0.2, now + 0.1)
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.9)

    osc2.connect(gain2)
    gain2.connect(ctx.destination)

    osc2.start(now + 0.08)
    osc2.stop(now + 0.9)
  } catch (err) {
    console.warn('Could not play notification sound:', err)
  }
}
