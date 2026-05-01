import { Volume2, VolumeX } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

export default function FloatingControls() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.42;
    try {
      await audio.play();
      setPlaying(true);
      sessionStorage.setItem('musicPlaying', 'true');
    } catch {
      setPlaying(false);
    }
  }, []);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setPlaying(false);
    sessionStorage.setItem('musicPlaying', 'false');
  }, []);

  useEffect(() => {
    if (sessionStorage.getItem('musicPlaying') === 'true') {
      void play();
    }

    window.addEventListener('envelope-opened', play, { once: true });
    return () => window.removeEventListener('envelope-opened', play);
  }, [play]);

  return (
    <button
      type="button"
      onClick={() => {
        if (playing) pause();
        else void play();
      }}
      className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#70765a] text-[#f5f0de] shadow-[0_12px_34px_rgba(46,45,31,0.28)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#596347] focus:outline-none focus:ring-2 focus:ring-[#f5f0de]/75"
      aria-label={playing ? 'Mute music' : 'Play music'}
      title={playing ? 'Mute music' : 'Play music'}
    >
      <audio ref={audioRef} src="/reference/background-music.mp3" loop preload="auto" />
      {playing ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
    </button>
  );
}
