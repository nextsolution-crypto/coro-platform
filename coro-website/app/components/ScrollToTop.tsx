'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 450);
    };

    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label="Retour en haut de la page"
      title="Retour en haut"
      style={{
        position: 'fixed',
        right: 24,
        bottom: 24,

        width: 46,
        height: 46,

        borderRadius: 10,
        border: '1px solid rgba(255,255,255,0.18)',

        backgroundColor: hovered ? '#A93226' : '#C0392B',
        color: '#FFFFFF',

        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',

        cursor: 'pointer',
        zIndex: 9999,

        boxShadow: hovered
          ? '0 10px 28px rgba(0,0,0,0.26)'
          : '0 8px 24px rgba(0,0,0,0.18)',

        opacity: visible ? 1 : 0,
        visibility: visible ? 'visible' : 'hidden',

        transform: visible
          ? hovered
            ? 'translateY(-2px)'
            : 'translateY(0)'
          : 'translateY(10px)',

        pointerEvents: visible ? 'auto' : 'none',

        transition:
          'opacity 0.25s ease, transform 0.25s ease, background-color 0.2s ease, box-shadow 0.2s ease, visibility 0.25s ease',
      }}
    >
      <ArrowUp size={20} strokeWidth={2.5} />
    </button>
  );
}