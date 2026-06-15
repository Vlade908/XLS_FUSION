export const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    // Double bell chime (high-pitched bell)
    const playTone = (time: number, freq: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);
      
      // Volume ramp
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.12, time + 0.04); // Quick fade-in
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration); // Exp fade-out
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(time);
      osc.stop(time + duration);
    };

    const now = ctx.currentTime;
    // Pleasant notification chime: D5 (587.33 Hz) followed by A5 (880 Hz)
    playTone(now, 587.33, 0.4);
    playTone(now + 0.12, 880, 0.6);
  } catch (e) {
    console.error('Falha ao reproduzir som de notificação:', e);
  }
};
