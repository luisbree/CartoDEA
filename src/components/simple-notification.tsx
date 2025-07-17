
"use client";

import React, { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function SimpleNotification() {
  const { message, isVisible, key } = useToast();
  const [currentMessage, setCurrentMessage] = useState<string | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isVisible && message) {
      setCurrentMessage(message);
      setShow(true);
    } else if (!isVisible && show) {
      // Keep message for fade-out, then hide
      const timer = setTimeout(() => {
        setShow(false);
      }, 300); // Duration of fade-out animation
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, message, key]); // key ensures re-render for same message

  if (!currentMessage && !show) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-3 left-3 z-[100] px-3 py-1.5 text-xs rounded-md shadow-lg transition-opacity duration-300 ease-in-out",
        "bg-background/80 backdrop-blur-sm text-foreground border border-border",
        "dark:bg-neutral-800/80 dark:text-neutral-200 dark:border-neutral-700",
        show ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
      role="status"
      aria-live="polite"
    >
      {currentMessage}
    </div>
  );
}
