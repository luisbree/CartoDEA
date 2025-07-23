
"use client";

import { useState, useCallback } from 'react';
import type { Map } from 'ol';
import VectorSource from 'ol/source/Vector';
import { useToast } from "@/hooks/use-toast";
import type { MapLayer, OSMCategoryConfig } from '@/lib/types';
import { nanoid } from 'nanoid';
import { transformExtent, type Extent } from 'ol/proj';
import { get as getProjection } from 'ol/proj';
import VectorLayer from 'ol/layer/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import KML from 'ol/format/KML';
import shp from 'shpjs';
import JSZip from 'jszip';
import type Feature from 'ol/Feature';
import type { Geometry } from 'ol/geom';
import { Style, Fill, Stroke, Circle as CircleStyle } from 'ol/style';


interface UseOSMDataProps {
  mapRef: React.RefObject<Map | null>;
  drawingSourceRef: React.RefObject<VectorSource>;
  addLayer: (layer: MapLayer) => void;
  osmCategoryConfigs: OSMCategoryConfig[];
}

export const useOSMData = ({ mapRef, drawingSourceRef, addLayer, osmCategoryConfigs }: UseOSMDataProps) => {
  const { toast } = useToast();
  const [isFetchingOSM, setIsFetchingOSM] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedOSMCategoryIds, setSelectedOSMCategoryIds] = useState<string[]>(['watercourses', 'water_bodies']);

  const fetchAndProcessOSMData = useCallback(async (extent: Extent, query: { type: 'categories', ids: string[] } | { type: 'custom', key: string, value: string }) => {
    setIsFetchingOSM(true);
    toast({ description: 'Obteniendo datos de OpenStreetMap...' });

     try {
        const mapProjection = getProjection('EPSG:3857');
        const dataProjection = getProjection('EPSG:4326');
        const transformedExtent = transformExtent(extent, mapProjection!, dataProjection!);
        const bboxStr = `${transformedExtent[1]},${transformedExtent[0]},${transformedExtent[3]},${transformedExtent[2]}`;
        
        let overpassQuery = '';
        let layerName = 'OSM Personalizado';
        let layerStyle = new Style({
            stroke: new Stroke({ color: '#fb8500', width: 2 }),
            fill: new Fill({ color: 'rgba(251, 133, 0, 0.2)' }),
            image: new CircleStyle({
                radius: 6,
                fill: new Fill({ color: 'rgba(251, 133, 0, 0.5)' }),
                stroke: new Stroke({ color: '#fb8500', width: 1.5 })
            })
        });
        
        if (query.type === 'categories') {
            if (query.ids.length === 0) {
              toast({ description: 'Por favor, seleccione al menos una categoría de OSM.' });
              setIsFetchingOSM(false);
              return;
            }
            const selectedConfigs = osmCategoryConfigs.filter(c => query.ids.includes(c.id));
            const queryFragments = selectedConfigs.map(c => c.overpassQueryFragment(bboxStr)).join('');
            overpassQuery = `[out:json][timeout:60];(${queryFragments});out geom;`;
        } else { // custom query
             const values = query.value.split(',').map(v => v.trim()).filter(v => v);
            if (values.length > 1) {
                // Multiple values: create a regex to OR them
                const regexValue = `^(${values.join('|')})$`;
                overpassQuery = `[out:json][timeout:60];(nwr["${query.key}"~"${regexValue}"](${bboxStr}););out geom;`;
                layerName = `OSM: ${query.key}`;
            } else if (values.length === 1 && values[0]) {
                // Single value
                overpassQuery = `[out:json][timeout:60];(nwr["${query.key}"="${values[0]}"](${bboxStr}););out geom;`;
                layerName = `OSM: ${query.key}=${values[0]}`;
            } else {
                // No value, search for key existence
                overpassQuery = `[out:json][timeout:60];(nwr["${query.key}"](${bboxStr}););out geom;`;
                layerName = `OSM: ${query.key}`;
            }
        }
        
        const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Overpass API error: ${response.status} ${errorText}`);
        }
        const osmData = await response.json();

        const geojsonFeatures = osmData.elements.map((element: any) => {
            if (!element.type) return null;

            const properties = element.tags || {};
            properties.osm_id = element.id;
            properties.osm_type = element.type;
            let geometry = null;

            if (element.type === 'node' && element.lat !== undefined && element.lon !== undefined) {
                geometry = {
                    type: 'Point',
                    coordinates: [element.lon, element.lat]
                };
            } else if (element.type === 'way' && element.geometry) {
                const coordinates = element.geometry.map((node: { lat: number, lon: number }) => [node.lon, node.lat]);
                if (coordinates.length >= 2) {
                    const first = coordinates[0];
                    const last = coordinates[coordinates.length - 1];
                    if (coordinates.length >= 4 && first[0] === last[0] && first[1] === last[1]) {
                        geometry = { type: 'Polygon', coordinates: [coordinates] };
                    } else {
                        geometry = { type: 'LineString', coordinates: [coordinates] };
                    }
                }
            }
            if (!geometry) return null;

            return {
                type: 'Feature',
                id: `${element.type}/${element.id}`, // Ensure a unique ID for features
                properties,
                geometry
            };
        }).filter(Boolean);

        const osmDataAsGeoJSON = {
            type: 'FeatureCollection',
            features: geojsonFeatures
        };

        const geojsonFormat = new GeoJSON({
            featureProjection: 'EPSG:3857',
            dataProjection: 'EPSG:4326'
        });
        
        const allFeatures = geojsonFormat.readFeatures(osmDataAsGeoJSON);
        allFeatures.forEach(f => f.setId(nanoid()));

        if (query.type === 'categories') {
            const selectedConfigs = osmCategoryConfigs.filter(c => query.ids.includes(c.id));
            const featuresByCategory: Record<string, Feature<Geometry>[]> = {};
            selectedConfigs.forEach(c => featuresByCategory[c.id] = []);

            allFeatures.forEach((feature) => {
                const properties = feature.getProperties();
                for (const config of selectedConfigs) {
                    if (config.matcher(properties)) {
                        featuresByCategory[config.id].push(feature);
                        break;
                    }
                }
            });
            
            let totalFeaturesAdded = 0;
            for (const config of selectedConfigs) {
                const categoryFeatures = featuresByCategory[config.id];
                if (categoryFeatures.length > 0) {
                    const vectorSource = new VectorSource({ features: categoryFeatures });
                    const catLayerName = `${config.name} (${categoryFeatures.length})`;
                    const newLayer = new VectorLayer({
                        source: vectorSource,
                        style: config.style,
                        properties: { id: `osm-${config.id}-${nanoid()}`, name: catLayerName, type: 'osm' }
                    });
                    addLayer({ id: newLayer.get('id'), name: catLayerName, olLayer: newLayer, visible: true, opacity: 1, type: 'osm' });
                    totalFeaturesAdded += categoryFeatures.length;
                }
            }
             if (totalFeaturesAdded > 0) {
                toast({ description: `${totalFeaturesAdded} entidades OSM añadidas al mapa.` });
            } else {
                toast({ description: 'No se encontraron entidades OSM para las categorías seleccionadas.' });
            }
        } else { // Custom query
            if (allFeatures.length > 0) {
                const vectorSource = new VectorSource({ features: allFeatures });
                const finalLayerName = `${layerName} (${allFeatures.length})`;
                const newLayer = new VectorLayer({
                    source: vectorSource,
                    style: layerStyle,
                    properties: { id: `osm-custom-${nanoid()}`, name: finalLayerName, type: 'osm' }
                });
                addLayer({ id: newLayer.get('id'), name: finalLayerName, olLayer: newLayer, visible: true, opacity: 1, type: 'osm' });
                toast({ description: `${allFeatures.length} entidades OSM añadidas como "${finalLayerName}".` });
            } else {
                 toast({ description: `No se encontraron entidades para la búsqueda personalizada.` });
            }
        }

    } catch (error: any) {
      console.error("Error fetching OSM data:", error);
      toast({ description: `Error al obtener datos de OSM: ${error.message}` });
    } finally {
      setIsFetchingOSM(false);
    }
  }, [addLayer, osmCategoryConfigs, toast]);

  const fetchOSMData = useCallback(async () => {
    const drawingSource = drawingSourceRef.current;
    if (!drawingSource || drawingSource.getFeatures().length === 0) {
      toast({ description: 'Por favor, dibuje un polígono en el mapa primero.' });
      return;
    }
    
    const polygonFeature = drawingSource.getFeatures().find(f => f.getGeometry()?.getType() === 'Polygon');
    if (!polygonFeature) {
        toast({ description: "No se encontró un polígono. La obtención de datos OSM requiere un área poligonal." });
        return;
    }
    const extent = polygonFeature.getGeometry()!.getExtent();
    fetchAndProcessOSMData(extent, { type: 'categories', ids: selectedOSMCategoryIds });
  }, [drawingSourceRef, toast, fetchAndProcessOSMData, selectedOSMCategoryIds]);

  const fetchCustomOSMData = useCallback(async (key: string, value: string) => {
    const drawingSource = drawingSourceRef.current;
    if (!drawingSource || drawingSource.getFeatures().length === 0) {
      toast({ description: 'Por favor, dibuje un polígono en el mapa primero.' });
      return;
    }
    const polygonFeature = drawingSource.getFeatures().find(f => f.getGeometry()?.getType() === 'Polygon');
    if (!polygonFeature) {
        toast({ description: "No se encontró un polígono. La obtención de datos OSM requiere un área poligonal." });
        return;
    }
    const extent = polygonFeature.getGeometry()!.getExtent();
    fetchAndProcessOSMData(extent, { type: 'custom', key, value });
  }, [drawingSourceRef, toast, fetchAndProcessOSMData]);


  const fetchOSMForCurrentView = useCallback(async (categoryIds: string[]) => {
    if (!mapRef.current) {
        toast({ description: "El mapa no está listo." });
        return;
    }
    const extent = mapRef.current.getView().calculateExtent(mapRef.current.getSize());
    fetchAndProcessOSMData(extent, { type: 'categories', ids: categoryIds });
  }, [mapRef, toast, fetchAndProcessOSMData]);


  const handleDownloadOSMLayers = useCallback(async (currentLayers: MapLayer[], format: 'geojson' | 'kml' | 'shp') => {
      const osmLayers = currentLayers.filter(l => l.type === 'osm' && 'getSource' in l.olLayer);
      if (osmLayers.length === 0) {
          toast({ description: "No hay capas OSM para descargar." });
          return;
      }
      setIsDownloading(true);
      try {
          const geojsonFormat = new GeoJSON({
              featureProjection: 'EPSG:3857',
              dataProjection: 'EPSG:4326'
          });

          if (format === 'shp') {
              const zip = new JSZip();
              for (const layer of osmLayers) {
                  const vectorLayer = layer.olLayer as VectorLayer<any>;
                  const features = vectorLayer.getSource().getFeatures();
                  const geoJson = JSON.parse(geojsonFormat.writeFeatures(features));
                  const shpBuffer = await shp.write(geoJson.features, 'GEOMETRY', {});
                  zip.file(`${layer.name.replace(/ /g, '_')}.zip`, shpBuffer);
              }
              const content = await zip.generateAsync({ type: "blob" });
              const link = document.createElement("a");
              link.href = URL.createObjectURL(content);
              link.download = "osm_layers_shp.zip";
              link.click();

          } else { 
              let combinedString = '';
              let fileExtension = format;
              let mimeType = 'text/plain';

              if (format === 'geojson') {
                  const allFeatures = osmLayers.flatMap(l => (l.olLayer as VectorLayer<any>).getSource().getFeatures());
                  combinedString = geojsonFormat.writeFeatures(allFeatures);
                  mimeType = 'application/geo+json';
              } else if (format === 'kml') {
                  const kmlFormat = new KML({ extractStyles: true });
                  const allFeatures = osmLayers.flatMap(l => (l.olLayer as VectorLayer<any>).getSource().getFeatures());
                  combinedString = kmlFormat.writeFeatures(allFeatures);
                  mimeType = 'application/vnd.google-earth.kml+xml';
              }
              
              const blob = new Blob([combinedString], { type: mimeType });
              const link = document.createElement('a');
              link.href = URL.createObjectURL(blob);
              link.download = `osm_layers.${fileExtension}`;
              link.click();
          }
          toast({ description: `Capas OSM descargadas como ${format.toUpperCase()}.` });
      } catch (error: any) {
          console.error("Error downloading OSM layers:", error);
          toast({ description: `Error al descargar: ${error.message}` });
      } finally {
          setIsDownloading(false);
      }
  }, [toast]);


  return {
    isFetchingOSM,
    selectedOSMCategoryIds,
    setSelectedOSMCategoryIds,
    fetchOSMData,
    fetchCustomOSMData,
    fetchOSMForCurrentView,
    isDownloading,
    handleDownloadOSMLayers: handleDownloadOSMLayers,
  };
};
