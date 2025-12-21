'use client';

/**
 * Swipe Actions Component
 *
 * Left/right swipe for quick actions on list items.
 * Commonly used for call, email, complete actions on mobile.
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

interface SwipeAction {
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick: () => void;
}

interface SwipeActionsProps {
  children: React.ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  threshold?: number;
  className?: string;
}

export function SwipeActions({
  children,
  leftActions = [],
  rightActions = [],
  threshold = 80,
  className,
}: SwipeActionsProps) {
  const [offsetX, setOffsetX] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const startX = React.useRef(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const maxLeftOffset = leftActions.length * 80;
  const maxRightOffset = rightActions.length * 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;

    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;

    // Limit the drag to the max offset
    let newOffset = diff;
    if (diff > 0 && leftActions.length > 0) {
      newOffset = Math.min(diff, maxLeftOffset);
    } else if (diff < 0 && rightActions.length > 0) {
      newOffset = Math.max(diff, -maxRightOffset);
    } else {
      newOffset = 0;
    }

    setOffsetX(newOffset);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);

    // Snap to threshold or back to center
    if (offsetX > threshold && leftActions.length > 0) {
      setOffsetX(maxLeftOffset);
    } else if (offsetX < -threshold && rightActions.length > 0) {
      setOffsetX(-maxRightOffset);
    } else {
      setOffsetX(0);
    }
  };

  const handleActionClick = (action: SwipeAction) => {
    action.onClick();
    setOffsetX(0);
  };

  const resetOffset = () => {
    setOffsetX(0);
  };

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Left actions (revealed when swiping right) */}
      {leftActions.length > 0 && (
        <div
          className="absolute inset-y-0 left-0 flex items-stretch"
          style={{ width: maxLeftOffset }}
        >
          {leftActions.map((action, idx) => (
            <button
              key={idx}
              className={cn(
                'flex flex-col items-center justify-center w-20 text-white',
                action.color
              )}
              onClick={() => handleActionClick(action)}
            >
              {action.icon}
              <span className="text-xs mt-1">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Right actions (revealed when swiping left) */}
      {rightActions.length > 0 && (
        <div
          className="absolute inset-y-0 right-0 flex items-stretch"
          style={{ width: maxRightOffset }}
        >
          {rightActions.map((action, idx) => (
            <button
              key={idx}
              className={cn(
                'flex flex-col items-center justify-center w-20 text-white',
                action.color
              )}
              onClick={() => handleActionClick(action)}
            >
              {action.icon}
              <span className="text-xs mt-1">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main content */}
      <div
        className="relative bg-background z-10"
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
        }}
        onClick={offsetX !== 0 ? resetOffset : undefined}
      >
        {children}
      </div>
    </div>
  );
}
