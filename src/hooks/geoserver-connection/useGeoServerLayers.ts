"use client";

import { useState, useCallback, useEffect } from 'react';
import type { Map } from 'ol';
import TileLayer from 'ol/layer/Tile';
import TileWMS from 'ol/source/TileWMS';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { useToast } from "@/hooks/use-toast";
import type { MapLayer, GeoServerDiscoveredLayer } from '@/lib/types';
import { nanoid } from 'nanoid';

interface UseGeoServerLayersProps {
  mapRef: React.RefObject<Map | null>;
  isMapReady: boolean;
  addLayer: (layer: MapLayer) => void;
  onLayerStateUpdate: (layerName: string, added: boolean, type: 'wms' | 'wfs') => void;
  setIsWfsLoading: (isLoading: boolean) => void;
}

export const useGeoServerLayers = ({
  mapRef,
  isMapReady,
  addLayer,
  onLayerStateUpdate,
  setIsWfsLoading
}: UseGeoServerLayersProps) => {
  const { toast } = useToast();
  
  const handleFetchGeoServerLayers = useCallback(async (urlOverride: string): Promise<GeoServerDiscoveredLayer[]> => {
    const urlToUse = urlOverride;
    if (!urlToUse.trim()) {
      toast({ description: 'Por favor, ingrese una URL de GeoServer válida.' });
      return [];
    }
    
    const getCapabilitiesUrl = `${urlToUse.trim()}/wms?service=WMS&version=1.3.0&request=GetCapabilities`;
    const proxyUrl = `/api/geoserver-proxy?url=${encodeURIComponent(getCapabilitiesUrl)}&cacheBust=${Date.now()}`;

    try {
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Error al obtener capas de GeoServer: ${response.statusText}. Detalles: ${errorData}`);
      }
      const text = await response.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, "application/xml");
      const errorNode = xml.querySelector('ServiceException, ServiceExceptionReport');
      if (errorNode) {
          throw new Error(`Error en la respuesta de GeoServer: ${errorNode.textContent || 'Error desconocido'}`);
      }
      const layerNodes = Array.from(xml.querySelectorAll('Layer[queryable="1"]'));

      const discoveredLayers: GeoServerDiscoveredLayer[] = layerNodes.map(node => {
          const name = node.querySelector('Name')?.textContent ?? '';
          const title = node.querySelector('Title')?.textContent ?? name;
          
          // Look for CRS:84 (lon/lat) first as it's unambiguous
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
          } else {
              // Fallback to EPSG:4326, assuming WMS 1.3.0 (lat/lon axis order)
              bboxNode = node.querySelector('BoundingBox[CRS="EPSG:4326"]');
              if (bboxNode) {
                  const minx_lat = parseFloat(bboxNode.getAttribute('minx') || '0');
                  const miny_lon = parseFloat(bboxNode.getAttribute('miny') || '0');
                  const maxx_lat = parseFloat(bboxNode.getAttribute('maxx') || '0');
                  const maxy_lon = parseFloat(bboxNode.getAttribute('maxy') || '0');
                  if (!isNaN(minx_lat) && !isNaN(miny_lon) && !isNaN(maxx_lat) && !isNaN(maxy_lon)) {
                    bbox = [miny_lon, minx_lat, maxy_lon, maxx_lat]; // reorder to lon, lat
                  }
              }
          }
          
          return { name, title, bbox, wmsAddedToMap: false, wfsAddedToMap: false };
      }).filter(l => l.name);

      return discoveredLayers;

    } catch (error: any) {
      console.error("Error fetching GeoServer layers:", error);
      toast({ description: `Error al conectar con GeoServer: ${error.message}` });
      return [];
    }
  }, [toast]);

  const handleAddGeoServerLayerToMap = useCallback((layerName: string, layerTitle: string, isVisible: boolean = true, urlOverride: string, bbox?: [number, number, number, number]) => {
    const urlToUse = urlOverride;
    if (!isMapReady || !mapRef.current || !urlToUse) return;

    const wmsSource = new TileWMS({
      url: `${urlToUse}/wms`,
      params: { 'LAYERS': layerName, 'TILED': true },
      serverType: 'geoserver',
      transition: 0,
      crossOrigin: 'anonymous',
    });

    const wmsLayer = new TileLayer({
      source: wmsSource,
      visible: isVisible,
      properties: {
        id: `wms-${layerName}-${nanoid()}`,
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
      visible: isVisible,
      opacity: 1,
      type: 'wms',
      isDeas: !isVisible,
    });
    
    onLayerStateUpdate(layerName, true, 'wms');
    if (isVisible) {
      toast({ description: `Capa WMS "${layerTitle}" añadida al mapa.` });
    }
  }, [isMapReady, mapRef, addLayer, onLayerStateUpdate, toast]);
  
  const handleAddGeoServerLayerAsWFS = useCallback(async (layerName: string, layerTitle: string, urlOverride: string) => {
    const urlToUse = urlOverride;
    if (!isMapReady || !urlToUse) return;

    setIsWfsLoading(true);
    const wfsUrl = `${urlToUse}/wfs?service=WFS&version=1.1.0&request=GetFeature&typename=${layerName}&outputFormat=application/json&srsname=EPSG:3857`;
    const proxyUrl = `/api/geoserver-proxy?url=${encodeURIComponent(wfsUrl)}&cacheBust=${Date.now()}`;

    try {
      const response = await fetch(proxyUrl);
      
      const contentType = response.headers.get("content-type");
      if (!response.ok || (contentType && (contentType.includes('xml') || contentType.includes('html')))) {
          const errorText = await response.text();
          let errorMessage;

          if (errorText.toLowerCase().includes('exception')) {
              try {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(errorText, "text/xml");
                const exceptionNode = xmlDoc.querySelector('ServiceException, ExceptionText, ows\\:ExceptionText');
                if (exceptionNode && exceptionNode.textContent) {
                    errorMessage = `Error del servidor GeoServer: ${exceptionNode.textContent.trim()}`;
                } else {
                    errorMessage = `El servidor GeoServer devolvió un error XML no especificado.`;
                }
              } catch (e) {
                errorMessage = "No se pudo interpretar el error XML del servidor."
              }
          } else {
              errorMessage = `Error en la solicitud: El servidor devolvió una respuesta inesperada.`;
          }
          
          throw new Error(errorMessage);
      }
      
      const geojsonData = await response.json();
      if (!geojsonData || !geojsonData.features || geojsonData.features.length === 0) {
        toast({ description: `La capa WFS "${layerTitle}" no contiene entidades.` });
        return;
      }
      
      const vectorSource = new VectorSource({
        features: new GeoJSON().readFeatures(geojsonData),
      });

      const vectorLayer = new VectorLayer({
        source: vectorSource,
        properties: {
          id: `wfs-${layerName}-${nanoid()}`,
          name: layerTitle || layerName,
          type: 'wfs',
          gsLayerName: layerName
        }
      });
      
      addLayer({
        id: vectorLayer.get('id'),
        name: vectorLayer.get('name'),
        olLayer: vectorLayer,
        visible: true,
        opacity: 1,
        type: 'wfs',
      });
      
      onLayerStateUpdate(layerName, true, 'wfs');
      toast({ description: `Capa WFS "${layerTitle}" añadida con ${geojsonData.features.length} entidades.` });
    } catch (error: any) {
      console.error("Error adding WFS layer:", error);
      toast({ description: `Error al cargar capa WFS: ${error.message}` });
    } finally {
      setIsWfsLoading(false);
    }
  }, [isMapReady, addLayer, onLayerStateUpdate, setIsWfsLoading, toast]);


  return {
    handleFetchGeoServerLayers,
    handleAddGeoServerLayerToMap,
    handleAddGeoServerLayerAsWFS,
  };
};
