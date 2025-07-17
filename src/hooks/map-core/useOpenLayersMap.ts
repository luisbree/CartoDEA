
'use client';

import { useRef, useState, useCallback } from 'react';
import type { Map } from 'ol';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Style, Stroke, Fill, Circle as CircleStyle } from 'ol/style';

// Default style for drawn features
const defaultDrawingStyle = new Style({
  fill: new Fill({
    color: 'rgba(255, 255, 255, 0.2)',
  }),
  stroke: new Stroke({
    color: '#ffcc33',
    width: 2,
  }),
  image: new CircleStyle({
    radius: 7,
    fill: new Fill({
      color: '#ffcc33',
    }),
  }),
});

export const useOpenLayersMap = () => {
  const mapRef = useRef<Map | null>(null);
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  const drawingSourceRef = useRef<VectorSource>(new VectorSource());
  const drawingLayerRef = useRef<VectorLayer<VectorSource>>(
    new VectorLayer({
      source: drawingSourceRef.current,
      style: defaultDrawingStyle,
      properties: {
        id: 'drawing-layer',
        name: 'Dibujos del Usuario',
        isDrawingLayer: true, // Custom property to identify this layer
      }
    })
  );

  const setMapInstanceAndElement = useCallback((mapInstance: Map, mapDivElement: HTMLDivElement) => {
    if (mapInstance && mapDivElement && !mapRef.current) {
      mapRef.current = mapInstance;
      mapElementRef.current = mapDivElement;
      
      mapInstance.addLayer(drawingLayerRef.current);
      
      setIsMapReady(true);
    }
  }, []);

  return {
    mapRef,
    mapElementRef,
    drawingSourceRef,
    drawingLayerRef,
    setMapInstanceAndElement,
    isMapReady,
  };
};
