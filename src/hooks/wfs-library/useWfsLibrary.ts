
"use client";

import { useState, useCallback } from 'react';
import type { Map } from 'ol';
import TileLayer from 'ol/layer/Tile';
import TileWMS from 'ol/source/TileWMS';
import { useToast } from "@/hooks/use-toast";
import type { MapLayer } from '@/lib/types';
import { nanoid } from 'nanoid';

// Type for a server in the library
export interface OgcServer {
  name: string;
  url: string; // Base URL of the OGC server
}

// Type for a discovered layer from a GetCapabilities response
export interface ServerDiscoveredLayer {
  name: string;
  title: string;
  bbox?: [number, number, number, number]; // Optional bounding box
  added: boolean;
}

interface UseWfsLibraryProps {
  mapRef: React.RefObject<Map | null>;
  isMapReady: boolean;
  addLayer: (layer: MapLayer) => void;
}

// Predefined list of OGC servers.
export const PREDEFINED_SERVERS: OgcServer[] = [
  {
    name: 'INTA NODO Nacional',
    url: 'https://geo-backend.inta.gob.ar/geoserver/'
  },
  {
    name: 'IGN - Capas',
    url: 'https://wms.ign.gob.ar/geoserver/ign_produccion/'
  },
  {
    name: 'IGN - Riesgo de Desastres',
    url: 'https://wms.ign.gob.ar/geoserver/ign_riesgo/'
  },
  {
    name: 'CONAE - Geoservicios',
    url: 'https://geoservicios.conae.gov.ar/geoserver/GeoServiciosCONAE/'
  },
  {
    name: 'Ministerio de Ambiente y Desarrollo Sostenible',
    url: 'http://geo.ambiente.gob.ar/geoserver/'
  },
  {
    name: 'Ministerio de Salud',
    url: 'http://mapasdis.ms.gba.gov.ar:8080/geoserver/'
  },
  {
    name: 'Ministerio de Infraestructura - Ambientales',
    url: 'http://www.minfra.gba.gob.ar/ambientales/geoserver/',
  },
  {
    name: 'INDEC',
    url: 'https://geoservicios.indec.gob.ar/geoserver/',
  },
];

export const useWfsLibrary = ({
  isMapReady,
  mapRef,
  addLayer
}: UseWfsLibraryProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [discoveredLayers, setDiscoveredLayers] = useState<ServerDiscoveredLayer[]>([]);
  const [activeServerUrl, setActiveServerUrl] = useState<string>('');

  const fetchWmsCapabilities = useCallback(async (url: string) => {
    let urlToUse = url.trim();
    if (!urlToUse) {
      toast({ description: 'Por favor, ingrese una URL de servidor válida.' });
      return;
    }

    if (!/^https?:\/\//i.test(urlToUse)) {
      urlToUse = `http://${urlToUse}`;
    }

    setIsLoading(true);
    setDiscoveredLayers([]); // Clear previous results
    setActiveServerUrl(urlToUse);
    
    const baseUrl = urlToUse.replace(/\/$/, ''); // Remove trailing slash if present
    const getCapabilitiesUrl = `${baseUrl}/wms?service=WMS&version=1.3.0&request=GetCapabilities`;
    const proxyUrl = `/api/geoserver-proxy?url=${encodeURIComponent(getCapabilitiesUrl)}&cacheBust=${Date.now()}`;

    try {
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Error al obtener capacidades WMS: ${response.statusText}. Detalles: ${errorData}`);
      }
      const text = await response.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, "application/xml");
      const errorNode = xml.querySelector('ServiceException, ServiceExceptionReport');
      if (errorNode) {
          throw new Error(`Error en la respuesta del servidor: ${errorNode.textContent || 'Error desconocido'}`);
      }
      const layerNodes = Array.from(xml.querySelectorAll('Layer[queryable="1"]'));

      const layers: ServerDiscoveredLayer[] = layerNodes.map(node => {
          const name = node.querySelector('Name')?.textContent ?? '';
          const title = node.querySelector('Title')?.textContent ?? name;
          
          let bboxNode = node.querySelector('BoundingBox[CRS="CRS:84"]');
          let bbox: [number, number, number, number] | undefined = undefined;

          if (bboxNode) {
              const minx = parseFloat(bboxNode.getAttribute('minx') || '0');
              const miny = parseFloat(bboxNode.getAttribute('miny') || '0');
              const maxx = parseFloat(bboxNode.getAttribute('maxx') || '0');
              const maxy = parseFloat(bboxNode.getAttribute('maxy') || '0');
              if (!isNaN(minx) && !isNaN(miny) && !isNaN(maxx) && !isNaN(maxy)) {
                bbox = [minx, miny, maxx, maxy]; // lon, lat order
              }
          }
          
          return { name, title, bbox, added: false };
      }).filter(l => l.name);

      if (layers.length > 0) {
        toast({ description: `${layers.length} capas encontradas en el servidor.` });
        setDiscoveredLayers(layers);
      } else {
        toast({ description: 'No se encontraron capas WMS en el servidor proporcionado.' });
      }

    } catch (error: any) {
      console.error("Error fetching WMS capabilities:", error);
      toast({ description: `Error al conectar con el servidor: ${error.message}` });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  const addWmsLayerToMap = useCallback((layerName: string, layerTitle: string, bbox?: [number, number, number, number]) => {
    if (!isMapReady || !mapRef.current || !activeServerUrl) return;

    const baseUrl = activeServerUrl.replace(/\/$/, '');
    const wmsSource = new TileWMS({
      url: `${baseUrl}/wms`,
      params: { 'LAYERS': layerName, 'TILED': true },
      serverType: 'geoserver',
      transition: 0,
      crossOrigin: 'anonymous',
    });

    const layerId = `wms-lib-${layerName}-${nanoid()}`;
    const wmsLayer = new TileLayer({
      source: wmsSource,
      properties: {
        id: layerId,
        name: layerTitle || layerName,
        type: 'wms',
        gsLayerName: layerName,
        bbox: bbox,
      }
    });

    addLayer({
      id: wmsLayer.get('id'),
      name: wmsLayer.get('name'),
      olLayer: wmsLayer,
      visible: true,
      opacity: 1,
      type: 'wms',
    });
    
    setDiscoveredLayers(prev => prev.map(l => l.name === layerName ? { ...l, added: true } : l));
    toast({ description: `Capa WMS "${layerTitle}" añadida al mapa.` });
  }, [isMapReady, mapRef, activeServerUrl, addLayer, toast]);

  return {
    isLoading,
    discoveredLayers,
    fetchCapabilities: fetchWmsCapabilities,
    addLayer: addWmsLayerToMap,
    PREDEFINED_SERVERS,
  };
};
