
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, X as LucideX } from 'lucide-react';

interface DraggablePanelProps {
  title: string;
  initialPosition: { x: number; y: number }; // Note: This might become controlled by useFloatingPanels solely
  initialSize?: { width: number | string; height: number | string };
  minSize?: { width: number; height: number };
  maxSize?: { width?: number; height?: number };
  panelRef: React.RefObject<HTMLDivElement>;
  onMouseDownHeader: (e: React.MouseEvent<HTMLDivElement>) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onClose?: () => void; 
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties; // Will include position from parent
  showCloseButton?: boolean;
  overflowX?: 'auto' | 'hidden' | 'visible';
  overflowY?: 'auto' | 'hidden' | 'visible';
  icon?: React.ElementType;
  zIndex?: number; // Added for Z-ordering
}

const DraggablePanel: React.FC<DraggablePanelProps> = ({
  title,
  // initialPosition, // Position is now fully controlled by style prop from parent
  initialSize = { width: 350, height: 400 },
  minSize = { width: 250, height: 200 },
  maxSize = {},
  panelRef,
  onMouseDownHeader,
  isCollapsed,
  onToggleCollapse,
  onClose,
  children,
  className,
  style, // Will receive top, left, and zIndex
  showCloseButton = true,
  overflowX = 'hidden',
  overflowY = 'auto',
  icon: IconComponent,
  zIndex, // Destructure zIndex, though it's part of style now
}) => {
  const [currentSize, setCurrentSize] = useState({
      width: typeof initialSize.width === 'number' ? `${initialSize.width}px` : initialSize.width,
      height: isCollapsed ? 'auto' : (typeof initialSize.height === 'number' ? `${initialSize.height}px` : initialSize.height),
  });

  useEffect(() => {
    setCurrentSize(prev => ({
        ...prev,
        height: isCollapsed ? 'auto' : (typeof initialSize.height === 'number' ? `${initialSize.height}px` : initialSize.height)
    }));
  }, [isCollapsed, initialSize.height]);

  const handleResizeStop = useCallback(() => {
    if (panelRef.current) {
      const newWidth = panelRef.current.offsetWidth;
      const newHeight = panelRef.current.offsetHeight;
      setCurrentSize({ width: `${newWidth}px`, height: `${newHeight}px` });
    }
  }, [panelRef]);


  return (
    <div
      ref={panelRef}
      className={`absolute bg-gray-800/80 text-white shadow-xl rounded-lg border border-gray-700/80 flex flex-col overflow-auto print:hidden ${className}`}
      style={{
        ...style, 
        width: currentSize.width,
        height: currentSize.height,
        minWidth: `${minSize.width}px`,
        minHeight: isCollapsed ? 'auto' : `${minSize.height}px`,
        maxWidth: maxSize.width ? `${maxSize.width}px` : '90vw',
        maxHeight: maxSize.height ? `${maxSize.height}px` : '80vh',
        resize: isCollapsed ? 'none' : 'both',
      }}
      onMouseUpCapture={handleResizeStop}
    >
      <CardHeader
        className="flex flex-row items-center justify-between p-2 bg-gray-700/80 cursor-grab rounded-t-lg select-none"
        onMouseDown={onMouseDownHeader}
      >
        <div className="flex items-center">
          {IconComponent && <IconComponent className="h-4 w-4 mr-2 text-primary" />}
          <CardTitle className="text-sm font-semibold text-white truncate" title={title}>{title}</CardTitle>
        </div>
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={onToggleCollapse} className="h-6 w-6 text-white hover:bg-gray-600/80">
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            <span className="sr-only">{isCollapsed ? 'Expandir' : 'Colapsar'}</span>
          </Button>
          {showCloseButton && onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6 text-white hover:bg-gray-600/80">
              <LucideX className="h-4 w-4" />
              <span className="sr-only">Minimizar Panel</span>
            </Button>
          )}
        </div>
      </CardHeader>
      {!isCollapsed && (
        <CardContent className="p-3 flex-grow flex flex-col overflow-auto">
           {children}
        </CardContent>
      )}
    </div>
  );
};

export default DraggablePanel;
