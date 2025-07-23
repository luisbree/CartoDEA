"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Square, PenLine, Dot, Eraser, Save, RectangleVertical, Brush } from 'lucide-react'; 

interface DrawingToolbarProps {
  activeDrawTool: string | null;
  onToggleDrawingTool: (toolType: 'Polygon' | 'LineString' | 'Point' | 'Rectangle' | 'FreehandPolygon') => void;
  // onStopDrawingTool prop removed as it's no longer directly used by this component
  onClearDrawnFeatures: () => void;
  onSaveDrawnFeaturesAsKML: () => void;
}

const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
  activeDrawTool,
  onToggleDrawingTool,
  onClearDrawnFeatures,
  onSaveDrawnFeaturesAsKML,
}) => {
  const iconButtonBaseClass = "h-8 w-8 p-0 flex items-center justify-center focus-visible:ring-primary";
  const activeClass = "bg-primary hover:bg-primary/90 text-primary-foreground";
  const inactiveClass = "border border-white/30 text-white/90 bg-black/20 hover:bg-black/40";

  return (
    <div className="flex items-center justify-between w-full gap-2">
      <div className="flex items-center gap-1">
        <Button 
          onClick={() => onToggleDrawingTool('Polygon')} 
          className={`${iconButtonBaseClass} ${
            activeDrawTool === 'Polygon' ? activeClass : inactiveClass
          }`}
          title={activeDrawTool === 'Polygon' ? "Detener dibujo de Polígono" : "Dibujar Polígono (para obtener datos OSM)"}
          aria-label={activeDrawTool === 'Polygon' ? "Detener dibujo de polígono" : "Dibujar Polígono (para obtener datos OSM)"}
        >
          <Square className="h-4 w-4" />
        </Button>
        <Button 
          onClick={() => onToggleDrawingTool('FreehandPolygon')} 
          className={`${iconButtonBaseClass} ${
            activeDrawTool === 'FreehandPolygon' ? activeClass : inactiveClass
          }`}
          title={activeDrawTool === 'FreehandPolygon' ? "Detener dibujo a mano alzada" : "Dibujar Polígono a Mano Alzada"}
          aria-label={activeDrawTool === 'FreehandPolygon' ? "Detener dibujo a mano alzada" : "Dibujar Polígono a Mano Alzada"}
        >
          <Brush className="h-4 w-4" />
        </Button>
        <Button 
          onClick={() => onToggleDrawingTool('Rectangle')} 
          className={`${iconButtonBaseClass} ${
            activeDrawTool === 'Rectangle' ? activeClass : inactiveClass
          }`}
          title={activeDrawTool === 'Rectangle' ? "Detener dibujo de Rectángulo" : "Dibujar Rectángulo"}
          aria-label={activeDrawTool === 'Rectangle' ? "Detener dibujo de Rectángulo" : "Dibujar Rectángulo"}
        >
          <RectangleVertical className="h-4 w-4" />
        </Button>
        <Button 
          onClick={() => onToggleDrawingTool('LineString')} 
          className={`${iconButtonBaseClass} ${
            activeDrawTool === 'LineString' ? activeClass : inactiveClass
          }`}
          title={activeDrawTool === 'LineString' ? "Detener dibujo de Línea" : "Dibujar Línea"}
          aria-label={activeDrawTool === 'LineString' ? "Detener dibujo de línea" : "Dibujar Línea"}
        >
          <PenLine className="h-4 w-4" />
        </Button>
        <Button 
          onClick={() => onToggleDrawingTool('Point')} 
          className={`${iconButtonBaseClass} ${
            activeDrawTool === 'Point' ? activeClass : inactiveClass
          }`}
          title={activeDrawTool === 'Point' ? "Detener dibujo de Punto" : "Dibujar Punto"}
          aria-label={activeDrawTool === 'Point' ? "Detener dibujo de punto" : "Dibujar Punto"}
        >
          <Dot className="h-4 w-4" />
        </Button>
        <Button 
          onClick={onClearDrawnFeatures} 
          className={`${iconButtonBaseClass} border border-white/30 text-white/90 bg-black/20 hover:bg-red-500/20 hover:text-red-300 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary`}
          title="Limpiar Dibujos"
          aria-label="Limpiar todos los dibujos del mapa"
        >
          <Eraser className="h-4 w-4" />
        </Button>
      </div>

      {/* Spacer to push save button to the right */}
      <div className="flex-grow"></div>

      <Button 
        onClick={onSaveDrawnFeaturesAsKML} 
        className={`${iconButtonBaseClass} bg-primary hover:bg-primary/90 text-primary-foreground`}
        disabled={!!activeDrawTool}
        title="Guardar Dibujos (KML)"
        aria-label="Guardar todos los dibujos del mapa como archivo KML"
      >
        <Save className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default DrawingToolbar;
