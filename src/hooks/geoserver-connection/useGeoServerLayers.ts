
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
import { Style, Fill, Stroke } from 'ol/style';
import { bbox as bboxStrategy } from 'ol/loadingstrategy';


interface UseGeoServerLayersProps {
  mapRef: React.RefObject<Map | null>;
  isMapReady: boolean;
  addLayer: (layer: MapLayer, bringToTop?: boolean) => void;
  onLayerStateUpdate: (layerName: string, added: boolean, type: 'wms' | 'wfs') => void;
  setIsWfsLoading: (isLoading: boolean) => void;
}

// A completely transparent style for the invisible WFS layer
const transparentStyle = new Style({
  fill: new Fill({ color: 'rgba(255,255,255,0)' }),
  stroke: new Stroke({ color: 'rgba(255,255,255,0)', width: 0 }),
});


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
          
          let bboxNode = node.querySelector('BoundingBox[CRS="CRS:84"]');
          let bbox: [number, number, number, number] | undefined = undefined;

          if (bboxNode) {
              const minx = parseFloat(bboxNode.getAttribute('minx') || '0');
              const miny = parseFloat(bboxNode.getAttribute('miny') || '0');
              const maxx = parseFloat(bboxNode.getAttribute('maxx') || '0');
              const maxy = parseFloat(bboxNode.getAttribute('maxy') || '0');
              if (!isNaN(minx) && !isNaN(miny) && !isNaN(maxx) && !isNaN(maxy)) {
                bbox = [minx, miny, maxx, maxy]; 
              }
          } else {
              bboxNode = node.querySelector('BoundingBox[CRS="EPSG:4326"]');
              if (bboxNode) {
                  const minx_lat = parseFloat(bboxNode.getAttribute('minx') || '0');
                  const miny_lon = parseFloat(bboxNode.getAttribute('miny') || '0');
                  const maxx_lat = parseFloat(bboxNode.getAttribute('maxx') || '0');
                  const maxy_lon = parseFloat(bboxNode.getAttribute('maxy') || '0');
                  if (!isNaN(minx_lat) && !isNaN(miny_lon) && !isNaN(maxx_lat) && !isNaN(maxy_lon)) {
                    bbox = [miny_lon, minx_lat, maxy_lon, maxx_lat]; 
                  }
              }
          }
          
          // Get default style name
          const styleName = node.querySelector('Style > Name')?.textContent ?? undefined;

          return { name, title, bbox, wmsAddedToMap: false, wfsAddedToMap: false, styleName };
      }).filter(l => l.name);

      return discoveredLayers;

    } catch (error: any) {
      console.error("Error fetching GeoServer layers:", error);
      toast({ description: `Error al conectar con GeoServer: ${error.message}` });
      return [];
    }
  }, [toast]);

  const handleAddHybridLayer = useCallback(async (layerName: string, layerTitle: string, serverUrl: string, bbox?: [number, number, number, number]) => {
      if (!isMapReady || !mapRef.current) return;
      
      const map = mapRef.current;
      
      try {
          // 1. Add WMS layer for visualization (this is always fast)
          const wmsSource = new TileWMS({
              url: `${serverUrl}/wms`,
              params: { 'LAYERS': layerName, 'TILED': true },
              serverType: 'geoserver',
              transition: 0,
              crossOrigin: 'anonymous',
          });

          const wmsLayerId = `wms-visual-${layerName}-${nanoid()}`;
          const wmsLayer = new TileLayer({
              source: wmsSource,
              properties: { id: wmsLayerId, name: `${layerTitle} (Visual)`, type: 'wms', gsLayerName: layerName, isVisualOnly: true, bbox: bbox },
          });
          map.addLayer(wmsLayer);

          // 2. Setup WFS VectorSource with BBOX loading strategy
          const vectorSource = new VectorSource({
              format: new GeoJSON(),
              strategy: bboxStrategy,
              loader: function (extent, resolution, projection) {
                  setIsWfsLoading(true);
                  const proj = projection.getCode();
                  const wfsUrl = `${serverUrl}/wfs?service=WFS&version=1.1.0&request=GetFeature&typename=${layerName}&outputFormat=application/json&srsname=${proj}&bbox=${extent.join(',')},${proj}`;
                  const proxyUrl = `/api/geoserver-proxy?url=${encodeURIComponent(wfsUrl)}&cacheBust=${Date.now()}`;
                  
                  fetch(proxyUrl)
                    .then(response => {
                      if (!response.ok) {
                        throw new Error(`Fallo en la solicitud WFS para ${layerName}`);
                      }
                      return response.json();
                    })
                    .then(data => {
                      const features = vectorSource.getFormat()!.readFeatures(data);
                      // Ensure all features get a unique ID for selection to work
                      features.forEach(f => {
                        if (!f.getId()) {
                          f.setId(nanoid());
                        }
                      });
                      vectorSource.addFeatures(features);
                    })
                    .catch(error => {
                      console.error(`Error al cargar entidades WFS para ${layerName}:`, error);
                      toast({ description: `No se pudieron cargar las entidades para ${layerTitle}.`, variant: "destructive" });
                      vectorSource.removeLoadedExtent(extent); // Important: tell the source the load failed
                    })
                    .finally(() => {
                      setIsWfsLoading(false);
                    });
              }
          });

          // 3. Create the invisible VectorLayer for interaction
          const wfsLayerId = `wfs-data-${layerName}-${nanoid()}`;
          const vectorLayer = new VectorLayer({
              source: vectorSource,
              style: transparentStyle, // Make it invisible
              properties: {
                  id: wfsLayerId,
                  name: layerTitle || layerName,
                  type: 'wfs',
                  gsLayerName: layerName,
                  isDeas: true,
                  bbox: bbox,
                  linkedWmsLayerId: wmsLayerId
              }
          });
          
          addLayer({
              id: wfsLayerId,
              name: layerTitle,
              olLayer: vectorLayer,
              visible: true,
              opacity: 1,
              type: 'wfs',
              isDeas: true,
          }, false);
          
          onLayerStateUpdate(layerName, true, 'wfs');
          onLayerStateUpdate(layerName, true, 'wms');
          toast({ description: `Capa "${layerTitle}" añadida.` });

      } catch (error: any) {
          console.error("Error adding hybrid WMS/WFS layer:", error);
          toast({ description: `Error al añadir capa: ${error.message}`, variant: 'destructive' });
          setIsWfsLoading(false); // Ensure loading is stopped on initial setup error
      }
  }, [isMapReady, mapRef, addLayer, onLayerStateUpdate, toast, setIsWfsLoading]);


  return {
    handleFetchGeoServerLayers,
    handleAddHybridLayer,
  };
};
