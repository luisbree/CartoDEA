"use client";

import React, { useEffect, useRef, useState } from 'react';
import 'ol/ol.css'; // OpenLayers CSS
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { fromLonLat } from 'ol/proj';
import { defaults as defaultControls } from 'ol/control';

const InteractiveMap: React.FC = () => {
  const mapElement = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<Map | null>(null);

  useEffect(() => {
    if (mapElement.current && !map) {
      const initialMap = new Map({
        target: mapElement.current,
        layers: [
          new TileLayer({
            source: new OSM(),
          }),
        ],
        view: new View({
          center: fromLonLat([0, 0]), // Default center (lon, lat)
          zoom: 2, // Default zoom level
        }),
        controls: defaultControls({ attributionOptions: { collapsible: false } }),
      });
      setMap(initialMap);

      // Optional: Handle map resizing if its container resizes
      const resizeObserver = new ResizeObserver(() => {
        initialMap.updateSize();
      });
      resizeObserver.observe(mapElement.current);

      return () => {
        if (mapElement.current) {
           resizeObserver.unobserve(mapElement.current);
        }
        initialMap.setTarget(undefined);
      };
    }
  }, [map]);

  return <div ref={mapElement} className="w-full h-full rounded-lg" aria-label="Interactive map"></div>;
};

export default InteractiveMap;
