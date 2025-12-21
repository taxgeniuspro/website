'use client';

/**
 * Bottom Sheet Modal Component
 *
 * Swipeable modal from bottom on mobile devices.
 * Falls back to regular centered modal on desktop.
 */

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface BottomSheetModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  showHandle?: boolean;
}

export function BottomSheetModal({
  open,
  onClose,
  title,
  description,
  children,
  className,
  showHandle = true,
}: BottomSheetModalProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragY, setDragY] = React.useState(0);
  const sheetRef = React.useRef<HTMLDivElement>(null);
  const startY = React.useRef(0);

  // Handle touch/drag to dismiss
  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    if (diff > 0) {
      setDragY(diff);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragY > 100) {
      onClose();
    }
    setDragY(0);
  };

  // Close on escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  // Prevent body scroll when open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/50 transition-opacity',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Desktop: Centered modal */}
      <div className="hidden md:flex fixed inset-0 z-50 items-center justify-center p-4 pointer-events-none">
        <div
          className={cn(
            'pointer-events-auto bg-background rounded-lg shadow-lg w-full max-w-lg max-h-[80vh] overflow-hidden',
            'animate-in fade-in-0 zoom-in-95',
            className
          )}
        >
          {/* Header */}
          {(title || description) && (
            <div className="flex items-start justify-between p-4 border-b">
              <div>
                {title && <h2 className="text-lg font-semibold">{title}</h2>}
                {description && (
                  <p className="text-sm text-muted-foreground mt-1">{description}</p>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Content */}
          <div className="p-4 overflow-y-auto max-h-[calc(80vh-4rem)]">{children}</div>
        </div>
      </div>

      {/* Mobile: Bottom sheet */}
      <div
        ref={sheetRef}
        className={cn(
          'md:hidden fixed inset-x-0 bottom-0 z-50 bg-background rounded-t-2xl shadow-lg',
          'animate-in slide-in-from-bottom duration-300',
          'max-h-[90vh] overflow-hidden',
          className
        )}
        style={{
          transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle */}
        {showHandle && (
          <div className="flex justify-center py-3">
            <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
          </div>
        )}

        {/* Header */}
        {(title || description) && (
          <div className="px-4 pb-4 border-b">
            <div className="flex items-start justify-between">
              <div>
                {title && <h2 className="text-lg font-semibold">{title}</h2>}
                {description && (
                  <p className="text-sm text-muted-foreground mt-1">{description}</p>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="-mt-1">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-6rem)] overscroll-contain">
          {children}
        </div>

        {/* Safe area for bottom gesture area */}
        <div className="h-6" />
      </div>
    </>
  );
}
