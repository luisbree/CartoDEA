
"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Map } from 'ol';
import VectorLayer from 'ol/layer/Vector';
import type Feature from 'ol/Feature';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';
import { useToast } from "@/hooks/use-toast";
import type { Geometry } from 'ol/geom';
import Select, { type SelectEvent } from 'ol/interaction/Select';
import DragBox from 'ol/interaction/DragBox';
import { singleClick } from 'ol/events/condition';

interface UseFeatureInspectionProps {
  mapRef: React.RefObject<Map | null>;
  mapElementRef: React.RefObject<HTMLDivElement | null>;
  isMapReady: boolean;
  onNewSelection: () => void;
}

const highlightStyle = new Style({
  stroke: new Stroke({
    color: '#00FFFF', // Cyan
    width: 4,
  }),
  fill: new Fill({
    color: 'rgba(0, 255, 255, 0.2)',
  }),
  image: new CircleStyle({
    radius: 8,
    fill: new Fill({ color: 'rgba(0, 255, 255, 0.4)' }),
    stroke: new Stroke({ color: '#00FFFF', width: 2 }),
  }),
  zIndex: Infinity,
});

export const useFeatureInspection = ({
  mapRef,
  mapElementRef,
  isMapReady,
  onNewSelection,
}: UseFeatureInspectionProps) => {
  const { toast } = useToast();
  const [isInspectModeActive, setIsInspectModeActive] = useState(false);
  const [selectionMode, setSelectionModeInternal] = useState<'click' | 'box'>('click');
  const [selectedFeatures, setSelectedFeatures] = useState<Feature<Geometry>[]>([]);
  const [inspectedFeatures, setInspectedFeatures] = useState<Feature<Geometry>[]>([]);
  const [currentInspectedLayerName, setCurrentInspectedLayerName] = useState<string | null>(null);

  const selectInteractionRef = useRef<Select | null>(null);
  const dragBoxInteractionRef = useRef<DragBox | null>(null);
  
  const onNewSelectionRef = useRef(onNewSelection);
  useEffect(() => {
    onNewSelectionRef.current = onNewSelection;
  }, [onNewSelection]);


  const processAndDisplayFeatures = useCallback((features: Feature<Geometry>[], layerName: string) => {
    if (features.length === 0) {
      setInspectedFeatures([]);
      setCurrentInspectedLayerName(null);
      return;
    }
    
    setInspectedFeatures(features);
    setCurrentInspectedLayerName(layerName);
    if (features.length > 0) {
       toast({ description: `${features.length} entidad(es) de "${layerName}" inspeccionada(s).` });
    }
    
    onNewSelectionRef.current();
  }, [toast, onNewSelectionRef]);
  
  const clearSelection = useCallback(() => {
    if (selectInteractionRef.current) {
      selectInteractionRef.current.getFeatures().clear();
    }
    setSelectedFeatures([]);
    setInspectedFeatures([]);
    setCurrentInspectedLayerName(null);
  }, []);

  const selectFeaturesById = useCallback((featureIds: string[]) => {
    if (!selectInteractionRef.current || !mapRef.current) return;

    const featuresToSelect: Feature<Geometry>[] = [];
    mapRef.current.getLayers().forEach(layer => {
        if (layer instanceof VectorLayer) {
            const source = layer.getSource();
            if (source) {
                featureIds.forEach(id => {
                    const feature = source.getFeatureById(id);
                    if (feature) {
                        featuresToSelect.push(feature as Feature<Geometry>);
                    }
                });
            }
        }
    });
    
    selectInteractionRef.current.getFeatures().clear();
    selectInteractionRef.current.getFeatures().extend(featuresToSelect);
    setSelectedFeatures(featuresToSelect);
  }, [mapRef]);

  const toggleInspectMode = useCallback(() => {
    const nextState = !isInspectModeActive;
    setIsInspectModeActive(nextState);

    if (!nextState) {
        clearSelection();
        if (mapElementRef.current) {
            mapElementRef.current.style.cursor = 'default';
        }
        toast({ description: 'Modo interactivo desactivado.' });
    } else {
        setSelectionModeInternal('click'); // Default to inspect mode when activated
        toast({ description: 'Modo Inspección activado. Haga clic o arrastre para ver atributos.' });
    }
  }, [isInspectModeActive, mapElementRef, toast, clearSelection]);

  const setSelectionMode = useCallback((mode: 'click' | 'box') => {
    setSelectionModeInternal(mode);
    if (mode === 'click') {
        toast({ description: 'Cambiado a modo Inspección. Haga clic o arrastre para ver atributos.' });
    } else {
        toast({ description: 'Cambiado a modo Selección. Haga clic o arrastre para seleccionar entidades.' });
    }
  }, [toast]);
  
  // Effect to manage interactions based on active state and mode
  useEffect(() => {
    if (!isMapReady || !mapRef.current) return;
    const map = mapRef.current;

    // Clean up previous interactions to avoid duplicates
    if (selectInteractionRef.current) map.removeInteraction(selectInteractionRef.current);
    if (dragBoxInteractionRef.current) map.removeInteraction(dragBoxInteractionRef.current);
    selectInteractionRef.current = null;
    dragBoxInteractionRef.current = null;
    if (mapElementRef.current) mapElementRef.current.style.cursor = 'default';

    if (isInspectModeActive) {
      if (mapElementRef.current) {
         mapElementRef.current.style.cursor = selectionMode === 'click' ? 'help' : 'crosshair';
      }

      // A single Select interaction is used for both modes.
      // Its behavior changes based on the `selectionMode` state.
      const select = new Select({
        style: highlightStyle,
        multi: true,
        condition: singleClick,
        filter: (feature, layer) => !layer.get('isBaseLayer') && !layer.get('isDrawingLayer'),
      });
      selectInteractionRef.current = select;
      map.addInteraction(select);
      
      select.on('select', (e: SelectEvent) => {
        const newlySelectedFeatures = e.target.getFeatures().getArray();
        
        // This makes selections from the map update the main selection state
        setSelectedFeatures(newlySelectedFeatures);

        if (selectionMode === 'click') { // INSPECTION by click
            processAndDisplayFeatures(newlySelectedFeatures, 'Inspección');
        } else { // SELECTION by click
            if (e.selected.length > 0 || e.deselected.length > 0) {
               toast({ description: `${newlySelectedFeatures.length} entidad(es) seleccionada(s).` });
            }
        }
      });

      // A single DragBox interaction is used for both modes.
      const dragBox = new DragBox({});
      dragBoxInteractionRef.current = dragBox;
      map.addInteraction(dragBox);

      dragBox.on('boxend', () => {
          const extent = dragBox.getGeometry().getExtent();
          const featuresInBox: Feature<Geometry>[] = [];
          
          map.getLayers().forEach(layer => {
            if (layer instanceof VectorLayer && layer.getVisible() && !layer.get('isBaseLayer') && !layer.get('isDrawingLayer')) {
              const source = layer.getSource();
              if (source) {
                source.forEachFeatureIntersectingExtent(extent, (feature) => {
                  featuresInBox.push(feature as Feature<Geometry>);
                });
              }
            }
          });
        
        // This logic decides whether to inspect or select based on the current mode
        const currentSelectedFeatures = select.getFeatures();
        currentSelectedFeatures.clear();
        currentSelectedFeatures.extend(featuresInBox);
        
        setSelectedFeatures(featuresInBox); // Update main selection state

        if (selectionMode === 'click') { // INSPECTION by box
            processAndDisplayFeatures(featuresInBox, 'Inspección de Área');
        } else { // SELECTION by box
            toast({ description: `${featuresInBox.length} entidad(es) seleccionada(s).` });
        }
      });
    }

    // Cleanup function
    return () => {
      if (map) {
        if (selectInteractionRef.current) map.removeInteraction(selectInteractionRef.current);
        if (dragBoxInteractionRef.current) map.removeInteraction(dragBoxInteractionRef.current);
      }
    };
  }, [isInspectModeActive, selectionMode, isMapReady, mapRef, mapElementRef, processAndDisplayFeatures, toast]);

  return {
    isInspectModeActive,
    toggleInspectMode,
    selectionMode,
    setSelectionMode,
    selectedFeatures,
    inspectedFeatures,
    currentInspectedLayerName,
    clearSelection,
    processAndDisplayFeatures, // Still needed for "Show Layer Table" action
    selectFeaturesById,
  };
};
