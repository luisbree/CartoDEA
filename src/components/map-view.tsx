
"use client";

import React, { useEffect, useRef } from 'react';
import 'ol/ol.css'; // Import OpenLayers CSS
import { Map as OLMap, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import {defaults as defaultControls} from 'ol/control';
import { fromLonLat } from 'ol/proj';
import type { Layer } from 'ol/layer';
import type { BaseLayerSettings } from '@/lib/types';

interface MapViewProps {
  setMapInstanceAndElement: (map: OLMap, element: HTMLDivElement) => void;
  onMapClick?: (event: any) => void; 
  activeBaseLayerId?: string; 
  baseLayerSettings: BaseLayerSettings;
}

export type Band = 'red' | 'green' | 'blue' | 'false-color-vegetation' | 'false-color-urban' | 'none';


type BaseLayerDefinition = {
  id: string;
  name: string;
  band?: Band;
  parentLayerId?: string;
  createLayer?: () => TileLayer<XYZ | OSM>;
}

export const BASE_LAYER_DEFINITIONS: readonly BaseLayerDefinition[] = [
  {
    id: 'osm-standard',
    name: 'OpenStreetMap',
    createLayer: () => new TileLayer({
      source: new OSM(),
      properties: { baseLayerId: 'osm-standard', isBaseLayer: true, name: 'OSMBaseLayer' },
    }),
  },
  {
    id: 'carto-light',
    name: 'OSM Gris (Carto)',
    createLayer: () => new TileLayer({
      source: new XYZ({ 
        url: 'https://{a-d}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        attributions: 'Map tiles by <a href="https://carto.com/attributions">Carto</a>, under CC BY 3.0. Data by <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, under ODbL.',
        maxZoom: 20,
        crossOrigin: 'Anonymous'
      }),
      properties: { baseLayerId: 'carto-light', isBaseLayer: true, name: 'CartoGrayscaleBaseLayer' },
    }),
  },
  {
    id: 'carto-labels',
    name: 'OSM Etiquetas (Carto)',
    createLayer: () => new TileLayer({
      source: new XYZ({ 
        url: 'https://{a-d}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png',
        attributions: 'Map tiles by <a href="https://carto.com/attributions">Carto</a>, under CC BY 3.0. Data by <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, under ODbL.',
        maxZoom: 20,
        crossOrigin: 'Anonymous'
      }),
      properties: { baseLayerId: 'carto-labels', isBaseLayer: true, name: 'CartoLabelsBaseLayer' },
    }),
  },
  {
    id: 'esri-satellite',
    name: 'ESRI Satelital (Color Natural)',
    createLayer: () => new TileLayer({
      source: new XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attributions: 'Tiles © Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 19,
        crossOrigin: 'Anonymous'
      }),
      properties: { baseLayerId: 'esri-satellite', isBaseLayer: true, name: 'ESRISatelliteBaseLayer' },
    }),
  },
  {
    id: 'esri-false-color-vegetation',
    name: 'Satelital Falso Color (Vegetación)',
    band: 'false-color-vegetation',
    parentLayerId: 'esri-satellite'
  },
  {
    id: 'esri-false-color-urban',
    name: 'Satelital Falso Color (Urbano)',
    band: 'false-color-urban',
    parentLayerId: 'esri-satellite'
  },
  {
    id: 'esri-red',
    name: 'ESRI - Banda Roja',
    band: 'red',
    parentLayerId: 'esri-satellite'
  },
  {
    id: 'esri-green',
    name: 'ESRI - Banda Verde',
    band: 'green',
    parentLayerId: 'esri-satellite'
  },
  {
    id: 'esri-blue',
    name: 'ESRI - Banda Azul',
    band: 'blue',
    parentLayerId: 'esri-satellite'
  },
] as const;


const applyBaseLayerEffects = (
  layer: Layer, 
  settings: BaseLayerSettings,
  band: Band
) => {
  layer.setOpacity(settings.opacity);

  const oldPrerenderListener = layer.get('prerenderListener');
  if (oldPrerenderListener) {
    layer.removeEventListener('prerender', oldPrerenderListener);
  }
  const oldPostrenderListener = layer.get('postrenderListener');
  if (oldPostrenderListener) {
    layer.removeEventListener('postrender', oldPostrenderListener);
  }
  
  const hasEffects = band !== 'none' || settings.brightness !== 100 || settings.contrast !== 100;

  if (hasEffects) {
    const prerenderListener = (event: any) => {
      const context = event.context;
      if (!context) return;
      context.filter = `brightness(${settings.brightness}%) contrast(${settings.contrast}%)`;
    };

    const postrenderListener = (event: any) => {
      const context = event.context;
      if (!context) return;

      if (band !== 'none') {
        try {
          const canvas = context.canvas;
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          if (band === 'red' || band === 'green' || band === 'blue') {
            for (let i = 0; i < data.length; i += 4) {
              let grayValue = 0;
              switch (band) {
                case 'red': grayValue = data[i]; break;
                case 'green': grayValue = data[i + 1]; break;
                case 'blue': grayValue = data[i + 2]; break;
              }
              data[i] = grayValue;
              data[i + 1] = grayValue;
              data[i + 2] = grayValue;
            }
          } else if (band === 'false-color-vegetation') { // NIR(G)-R-B  -> R-G-B
             for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                // const b = data[i + 2];
                data[i] = g;     // Red channel gets green value (vegetation becomes red)
                data[i + 1] = r; // Green channel gets red value
                data[i + 2] = r; // Blue channel gets red value (suppress blue for vegetation)
            }
          } else if (band === 'false-color-urban') { // B-G-R -> R-G-B
             for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                data[i] = b;     // Red channel gets blue (urban areas -> magenta/violet)
                data[i + 1] = g; // Green stays green
                data[i + 2] = r; // Blue gets red
            }
          }
          
          context.putImageData(imageData, 0, 0);
        } catch (e) {
          // Silence CORS errors
        }
      }
      
      context.filter = 'none';
    };

    layer.on('prerender', prerenderListener);
    layer.on('postrender', postrenderListener);
    layer.set('prerenderListener', prerenderListener);
    layer.set('postrenderListener', postrenderListener);
  }
  
  layer.getSource()?.refresh();
};

const MapView: React.FC<MapViewProps> = ({ setMapInstanceAndElement, onMapClick, activeBaseLayerId, baseLayerSettings }) => {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const olMapInstanceRef = useRef<OLMap | null>(null); 
  const baseLayerRefs = useRef<Record<string, TileLayer<any>>>({});

  useEffect(() => {
    if (!mapElementRef.current || olMapInstanceRef.current) { 
      return;
    }

    const initialBaseLayers = BASE_LAYER_DEFINITIONS
      .filter(def => def.createLayer)
      .map(def => {
        const layer = def.createLayer!();
        layer.setVisible(def.id === (activeBaseLayerId || BASE_LAYER_DEFINITIONS[0].id));
        baseLayerRefs.current[def.id] = layer;
        return layer;
    });

    const map = new OLMap({
      target: mapElementRef.current,
      layers: [...initialBaseLayers], 
      view: new View({
        center: fromLonLat([-60.0, -36.5], 'EPSG:3857'),
        zoom: 7,
        projection: 'EPSG:3857', 
        constrainResolution: true, 
      }),
      controls: defaultControls({
        attributionOptions: {
          collapsible: false,
        },
        zoom: true,
        rotate: false, 
      }),
    });
    
    olMapInstanceRef.current = map; 
    setMapInstanceAndElement(map, mapElementRef.current);

    return () => {
      if (olMapInstanceRef.current) {
        olMapInstanceRef.current.setTarget(undefined); 
        olMapInstanceRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setMapInstanceAndElement]); 

  useEffect(() => {
    if (!olMapInstanceRef.current) return; 
    const currentMap = olMapInstanceRef.current;

    if (onMapClick) {
      currentMap.on('singleclick', onMapClick);
    }
    return () => {
      if (onMapClick) { 
        currentMap.un('singleclick', onMapClick);
      }
    };
  }, [onMapClick]); 

  useEffect(() => {
    if (!olMapInstanceRef.current || !activeBaseLayerId) return;

    const selectedDef = BASE_LAYER_DEFINITIONS.find(d => d.id === activeBaseLayerId);
    if (!selectedDef) return;

    const layerIdToShow = selectedDef.parentLayerId || selectedDef.id;
    const bandToShow = selectedDef.band || 'none';

    Object.values(baseLayerRefs.current).forEach(layer => {
      const layerId = layer.get('baseLayerId');
      const isVisible = layerId === layerIdToShow;
      layer.setVisible(isVisible);

      // --- NEW LOGIC ---
      // If the layer is the label layer, set a high z-index.
      // Otherwise, set a low z-index (or default) for other base layers.
      if (layerId === 'carto-labels') {
        layer.setZIndex(isVisible ? 500 : 0);
      } else {
        layer.setZIndex(0);
      }
      
      if (isVisible) {
        applyBaseLayerEffects(layer, baseLayerSettings, bandToShow);
      } else {
        applyBaseLayerEffects(layer, { opacity: 1, brightness: 100, contrast: 100 }, 'none');
      }
    });

  }, [activeBaseLayerId, baseLayerSettings]);

  return <div ref={mapElementRef} className="w-full h-full bg-gray-200" />;
};

export default MapView;
