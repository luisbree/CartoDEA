"use client";

import React, { useRef, useEffect } from 'react';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import VectorSource from 'ol/source/Vector';
import { fromLonLat, toLonLat } from 'ol/proj';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { Icon, Style } from 'ol/style';
import type { POI } from '@/app/page';
import { defaults as defaultControls } from 'ol/control';

interface MapComponentProps {
  layer: string;
  pois: POI[];
  onMapClick: (coords: [number, number]) => void;
  center: [number, number];
  zoom: number;
}

const layerSources: Record<string, XYZ | OSM> = {
  osm: new OSM(),
  satellite: new XYZ({
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attributions: 'Tiles © Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 19
  }),
  terrain: new XYZ({
    url: 'https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attributions: 'Map data: © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: © <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
    maxZoom: 17
  }),
};

const MapComponent: React.FC<MapComponentProps> = ({ layer, pois, onMapClick, center, zoom }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<Map | null>(null);
  const vectorLayer = useRef(new VectorLayer({
    source: new VectorSource(),
    style: new Style({
      image: new Icon({
        anchor: [0.5, 1],
        src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="%232ecc71" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
        scale: 1,
      })
    })
  }));
  const baseLayer = useRef(new TileLayer<OSM | XYZ>({
    source: layerSources['osm']
  }));

  useEffect(() => {
    if (mapRef.current && !mapInstance.current) {
      mapInstance.current = new Map({
        target: mapRef.current,
        layers: [baseLayer.current, vectorLayer.current],
        view: new View({
          center: fromLonLat(center),
          zoom: zoom,
          constrainResolution: true,
        }),
        controls: defaultControls({
          zoom: true,
          rotate: true,
          attribution: true,
        }).extend([]),
      });

      mapInstance.current.on('click', (evt) => {
        const coords = toLonLat(evt.coordinate);
        onMapClick(coords as [number, number]);
      });
    }

    return () => {
      mapInstance.current?.setTarget(undefined);
      mapInstance.current = null;
    };
  }, [center, onMapClick, zoom]);

  useEffect(() => {
    if (mapInstance.current) {
      baseLayer.current.setSource(layerSources[layer] || layerSources['osm']);
    }
  }, [layer]);
  
  useEffect(() => {
    if (mapInstance.current) {
      const view = mapInstance.current.getView();
      view.animate({ center: fromLonLat(center), duration: 500 }, { zoom: zoom, duration: 500 });
    }
  }, [center, zoom]);

  useEffect(() => {
    const source = vectorLayer.current.getSource();
    if (source) {
      source.clear();
      const features = pois.map(poi => new Feature({
        geometry: new Point(fromLonLat(poi.coords))
      }));
      source.addFeatures(features);
    }
  }, [pois]);

  return <div ref={mapRef} className="w-full h-full bg-background" />;
};

export default MapComponent;
