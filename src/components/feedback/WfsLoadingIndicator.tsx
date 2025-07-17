
"use client";

import React from 'react';
import { Compass } from 'lucide-react';

interface WfsLoadingIndicatorProps {
  isVisible: boolean;
}

const WfsLoadingIndicator: React.FC<WfsLoadingIndicatorProps> = ({ isVisible }) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
      <Compass className="h-16 w-16 animate-spin text-primary mb-4" />
      <p className="text-white text-lg font-semibold">Cargando capa WFS...</p>
    </div>
  );
};

export default WfsLoadingIndicator;
