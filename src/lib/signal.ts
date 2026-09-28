import type { BudgetSignal } from '../domain/model';

let audio: AudioContext | undefined;

/**
 * Browsers only allow sound after a user gesture. Call this from a tap (e.g. the play
 * button) so a later budget signal can play.
 */
export function primeAudio(): void {
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') void audio.resume();
  } catch {
    // No Web Audio: the signal falls back to vibration only.
  }
}

function beep(context: AudioContext, at: number): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = 880;
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(0.18, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, at + 0.25);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(at);
  oscillator.stop(at + 0.3);
}

/** A short, gentle signal that an item's time budget is used up. */
export function playBudgetSignal(mode: BudgetSignal): void {
  if (mode === 'off') return;
  navigator.vibrate?.([180, 120, 180]);
  if (mode === 'soundAndVibration' && audio && audio.state === 'running') {
    beep(audio, audio.currentTime);
    beep(audio, audio.currentTime + 0.3);
  }
}
