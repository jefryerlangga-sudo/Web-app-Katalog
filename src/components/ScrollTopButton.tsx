import React, { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

export const ScrollTopButton: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 480);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      aria-label="Kembali ke atas"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed z-30 right-3 bottom-24 w-11 h-11 rounded-full bg-white text-[#0B1B3A] shadow-[0_6px_16px_rgba(11,27,58,0.18)] border border-slate-200 flex items-center justify-center active:scale-95"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
};
