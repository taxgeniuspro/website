'use client';

import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  targetDate?: Date;
  className?: string;
}

export default function CountdownTimer({ targetDate, className = '' }: CountdownTimerProps) {
  const getTargetDate = () => {
    if (targetDate) {
      return targetDate;
    }

    // Check if we have a stored first visit time
    if (typeof window !== 'undefined') {
      const storedFirstVisit = localStorage.getItem('taxgenius_first_visit');

      if (storedFirstVisit) {
        // Use existing first visit time + 3 days
        const firstVisit = new Date(parseInt(storedFirstVisit));
        return new Date(firstVisit.getTime() + 3 * 24 * 60 * 60 * 1000);
      } else {
        // First time visitor - store current time and set 3-day deadline
        const now = Date.now();
        localStorage.setItem('taxgenius_first_visit', now.toString());
        return new Date(now + 3 * 24 * 60 * 60 * 1000);
      }
    }

    // Fallback for SSR
    return new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  };

  const calculateTimeLeft = () => {
    const target = getTargetDate();
    const difference = +target - +new Date();

    let timeLeft = {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    };

    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    } else {
      // Timer expired - reset for another 3 days
      if (typeof window !== 'undefined') {
        const now = Date.now();
        localStorage.setItem('taxgenius_first_visit', now.toString());
        return calculateTimeLeft(); // Recalculate with new deadline
      }
    }

    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearTimeout(timer);
  });

  return (
    <div className={`flex gap-4 justify-center ${className}`}>
      <div className="text-center">
        <div className="bg-card border-2 border-primary rounded-lg p-4 min-w-[80px]">
          <div className="text-4xl font-bold text-primary">
            {String(timeLeft.days).padStart(2, '0')}
          </div>
          <div className="text-xs text-muted-foreground uppercase mt-1">Days</div>
        </div>
      </div>
      <div className="text-center">
        <div className="bg-card border-2 border-primary rounded-lg p-4 min-w-[80px]">
          <div className="text-4xl font-bold text-primary">
            {String(timeLeft.hours).padStart(2, '0')}
          </div>
          <div className="text-xs text-muted-foreground uppercase mt-1">Hours</div>
        </div>
      </div>
      <div className="text-center">
        <div className="bg-card border-2 border-primary rounded-lg p-4 min-w-[80px]">
          <div className="text-4xl font-bold text-primary">
            {String(timeLeft.minutes).padStart(2, '0')}
          </div>
          <div className="text-xs text-muted-foreground uppercase mt-1">Mins</div>
        </div>
      </div>
      <div className="text-center">
        <div className="bg-card border-2 border-primary rounded-lg p-4 min-w-[80px]">
          <div className="text-4xl font-bold text-primary">
            {String(timeLeft.seconds).padStart(2, '0')}
          </div>
          <div className="text-xs text-muted-foreground uppercase mt-1">Secs</div>
        </div>
      </div>
    </div>
  );
}
