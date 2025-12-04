'use client';

import { useState, useEffect, useRef } from 'react';
import { useInView } from 'framer-motion';

interface TypingTextProps {
  text: string;
  delay?: number;
}

export function TypingText({ text, delay = 0 }: TypingTextProps) {
  const [displayText, setDisplayText] = useState('');
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const hasStarted = useRef(false);

  useEffect(() => {
    if (isInView && !hasStarted.current) {
      hasStarted.current = true;
      let currentIndex = 0;

      const timeout = setTimeout(() => {
        const intervalId = setInterval(() => {
          currentIndex++;
          setDisplayText(text.slice(0, currentIndex));

          if (currentIndex > text.length) {
            clearInterval(intervalId);
          }
        }, 30);

        return () => clearInterval(intervalId);
      }, delay);

      return () => clearTimeout(timeout);
    }
  }, [isInView, text, delay]);

  return <span ref={ref}>{displayText}</span>;
}
