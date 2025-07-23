"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Map } from 'ol';
import type VectorSource from 'ol/source/Vector';
import Draw, { createBox } from 'ol/interaction/Draw';
import KML from 'ol/format/KML';
import { useToast } from "@/hooks/use-toast";

interface UseDrawingInteractionsProps {
  mapRef: React.RefObject<Map | null>;
  isMapReady: boolean;
  drawingSourceRef: React.RefObject<VectorSource>;
  isInspectModeActive: boolean;
  toggleInspectMode: () => void;
}

export const useDrawingInteractions = ({
  mapRef,
  isMapReady,
  drawingSourceRef,
  isInspectModeActive,
  toggleInspectMode,
}: UseDrawingInteractionsProps) => {
  const { toast } = useToast();
  const [activeDrawTool, setActiveDrawTool] = useState<string | null>(null);
  const drawInteractionRef = useRef<Draw | null>(null);

  const stopDrawingTool = useCallback(() => {
    if (drawInteractionRef.current && mapRef.current) {
      mapRef.current.removeInteraction(drawInteractionRef.current);
      drawInteractionRef.current = null;
    }
    setActiveDrawTool(null);
  }, [mapRef]);

  const toggleDrawingTool = useCallback((toolType: 'Polygon' | 'LineString' | 'Point' | 'Rectangle' | 'FreehandPolygon') => {
    if (!mapRef.current || !drawingSourceRef.current) return;

    // If the same tool is clicked again, stop it
    if (activeDrawTool === toolType) {
      stopDrawingTool();
      return;
    }

    // Stop any existing drawing or inspection tool
    stopDrawingTool();
    if (isInspectModeActive) {
      toggleInspectMode(); 
    }

    const drawOptions: any = {
      source: drawingSourceRef.current,
      type: toolType,
    };
    
    let toastMessage = `Herramienta de dibujo de ${toolType} activada.`;

    if (toolType === 'Rectangle') {
      drawOptions.type = 'Circle'; // OL uses 'Circle' type with a geometry function for boxes
      drawOptions.geometryFunction = createBox();
      toastMessage = `Herramienta de dibujo de Rectángulo activada.`;
    }

    if (toolType === 'FreehandPolygon') {
        drawOptions.type = 'Polygon';
        drawOptions.freehand = true;
        toastMessage = `Herramienta de dibujo a Mano Alzada activada.`;
    }

    const newDrawInteraction = new Draw(drawOptions);

    mapRef.current.addInteraction(newDrawInteraction);
    drawInteractionRef.current = newDrawInteraction;
    setActiveDrawTool(toolType);
    
    toast({ description: toastMessage });

  }, [mapRef, drawingSourceRef, activeDrawTool, stopDrawingTool, isInspectModeActive, toggleInspectMode, toast]);

  const clearDrawnFeatures = useCallback(() => {
    stopDrawingTool(); // Stop any active drawing tool first
    if (drawingSourceRef.current) {
      drawingSourceRef.current.clear();
      toast({ description: 'Dibujos borrados del mapa.' });
    }
  }, [drawingSourceRef, toast, stopDrawingTool]);

  const saveDrawnFeaturesAsKML = useCallback(() => {
    if (!drawingSourceRef.current || drawingSourceRef.current.getFeatures().length === 0) {
      toast({ description: 'No hay nada que guardar.' });
      return;
    }

    try {
      const kmlFormat = new KML({
        extractStyles: true,
        showPointNames: true,
      });
      const features = drawingSourceRef.current.getFeatures();
      const kmlString = kmlFormat.writeFeatures(features, {
        dataProjection: 'EPSG:4326',
        featureProjection: mapRef.current?.getView().getProjection() ?? 'EPSG:3857',
      });
      
      const blob = new Blob([kmlString], { type: 'application/vnd.google-earth.kml+xml' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `dibujos_mapa_${new Date().toISOString().split('T')[0]}.kml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      
      toast({ description: 'Dibujos guardados como KML.' });
    } catch (error) {
      console.error("Error saving KML:", error);
      toast({ description: 'Error al guardar el archivo KML.' });
    }
  }, [drawingSourceRef, mapRef, toast]);

  // Cleanup effect
  useEffect(() => {
    const map = mapRef.current;
    return () => {
      if (drawInteractionRef.current && map) {
        map.removeInteraction(drawInteractionRef.current);
      }
    };
  }, [mapRef]);


  return {
    activeDrawTool,
    toggleDrawingTool,
    stopDrawingTool,
    clearDrawnFeatures,
    saveDrawnFeaturesAsKML,
  };
};
