
"use client";

import { useState, useCallback } from 'react';
import type { Map } from 'ol';
import { useToast } from "@/hooks/use-toast";
import { transformExtent } from 'ol/proj';
import type { Extent } from 'ol/extent';

interface UseMapCaptureProps {
  mapRef: React.RefObject<Map | null>;
  activeBaseLayerId: string;
}

export interface MapCaptureData {
  image: string;
  extent: Extent;
  scale: {
    barWidth: number;
    text: string;
  }
}

export const useMapCapture = ({ mapRef }: UseMapCaptureProps) => {
  const { toast } = useToast();
  const [isCapturing, setIsCapturing] = useState(false);

  const captureMapDataUrl = useCallback(async (): Promise<MapCaptureData | null> => {
    if (!mapRef.current) {
      toast({ description: 'El mapa no está listo para ser capturado.' });
      return null;
    }

    setIsCapturing(true);

    const map = mapRef.current;
    
    return new Promise((resolve) => {
      map.once('rendercomplete', () => {
        try {
          const mapCanvas = document.createElement('canvas');
          const size = map.getSize();
          if (!size) {
              throw new Error("Map size is not available.");
          }
          mapCanvas.width = size[0];
          mapCanvas.height = size[1];
          const mapContext = mapCanvas.getContext('2d');
          if (!mapContext) {
              throw new Error("Could not get canvas context.");
          }

          Array.from(map.getViewport().querySelectorAll('.ol-layer canvas')).forEach(canvas => {
              if (canvas instanceof HTMLCanvasElement) {
                  if (canvas.width > 0 && canvas.height > 0) {
                    const opacity = parseFloat(canvas.style.opacity);
                    mapContext.globalAlpha = isNaN(opacity) ? 1 : opacity;
                    const transform = canvas.style.transform;
                    const matrix = new DOMMatrix(transform);
                    mapContext.setTransform(matrix);
                    mapContext.drawImage(canvas, 0, 0);
                  }
              }
          });
          
          mapContext.setTransform(1, 0, 0, 1, 0, 0);
          
          const imageUrl = mapCanvas.toDataURL('image/jpeg', 0.9);

          const view = map.getView();
          const resolution = view.getResolution();
          const projection = view.getProjection();

          if (!resolution || !projection) {
              throw new Error("Map view is not ready for scale calculation");
          }

          const units = projection.getUnits();
          // We assume meters for web mercator
          if (units !== 'm') {
              console.warn("Scale bar is only supported for projections with meters as units.");
          }

          const maxWidthInPixels = 100; // Desired max width of the scale bar
          const maxDistanceInMapUnits = maxWidthInPixels * resolution;
          
          const niceNumbers = [5, 2, 1];
          const exponent = Math.floor(Math.log10(maxDistanceInMapUnits));
          const powerOf10 = Math.pow(10, exponent);
          const residual = maxDistanceInMapUnits / powerOf10;
          const niceResidual = niceNumbers.find(n => n <= residual) || 1;
          const niceDistance = niceResidual * powerOf10;

          const distanceLabel = niceDistance >= 1000 ? `${niceDistance / 1000} km` : `${niceDistance} m`;
          const barWidth = niceDistance / resolution;
          
          const scale = {
              barWidth,
              text: distanceLabel
          };
          
          const mapExtent = view.calculateExtent(size);
          const extent4326 = transformExtent(mapExtent, view.getProjection(), 'EPSG:4326') as Extent;

          resolve({ image: imageUrl, extent: extent4326, scale });

        } catch (error) {
          console.error('Error capturing map:', error);
          toast({ description: `Error al capturar el mapa: ${error instanceof Error ? error.message : String(error)}` });
          resolve(null);
        } finally {
            setIsCapturing(false);
        }
      });
      map.renderSync();
    });

  }, [mapRef, toast]);

  return {
    captureMapDataUrl,
    isCapturing,
  };
};
