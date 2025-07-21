"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { MapPin, Database, Wrench, ListTree, ListChecks, Sparkles, ClipboardCheck, Library, LifeBuoy, Printer, Server, BrainCircuit } from 'lucide-react';
import { Style, Fill, Stroke, Circle as CircleStyle } from 'ol/style';
import { transformExtent } from 'ol/proj';
import type { Extent } from 'ol/extent';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


import MapView, { BASE_LAYER_DEFINITIONS } from '@/components/map-view';
import AttributesPanel from '@/components/panels/AttributesPanel'; 
import LayersPanel from '@/components/panels/LayersPanel';
import ToolsPanel from '@/components/panels/ToolsPanel';
import LegendPanel from '@/components/panels/LegendPanel';
import AIPanel from '@/components/panels/AIPanel';
import TrelloPanel from '@/components/panels/TrelloPanel';
import WfsLibraryPanel from '@/components/panels/WfsLibraryPanel';
import HelpPanel from '@/components/panels/HelpPanel';
import PrintComposerPanel from '@/components/panels/PrintComposerPanel';
import DeasCatalogPanel from '@/components/panels/DeasCatalogPanel';
import GeeProcessingPanel from '@/components/panels/GeeProcessingPanel';
import WfsLoadingIndicator from '@/components/feedback/WfsLoadingIndicator';

import { useOpenLayersMap } from '@/hooks/map-core/useOpenLayersMap';
import { useLayerManager } from '@/hooks/layer-manager/useLayerManager';
import { useFeatureInspection } from '@/hooks/feature-inspection/useFeatureInspection';
import { useDrawingInteractions } from '@/hooks/drawing-tools/useDrawingInteractions';
import { useOSMData } from '@/hooks/osm-integration/useOSMData';
import { useGeoServerLayers } from '@/hooks/geoserver-connection/useGeoServerLayers';
import { useFloatingPanels } from '@/hooks/panels/useFloatingPanels';
import { useMapCapture, type MapCaptureData } from '@/hooks/map-tools/useMapCapture';
import { useWfsLibrary } from '@/hooks/wfs-library/useWfsLibrary';
import { useToast } from "@/hooks/use-toast";

import type { OSMCategoryConfig, GeoServerDiscoveredLayer, BaseLayerOptionForSelect, MapLayer, ChatMessage, BaseLayerSettings } from '@/lib/types';
import { chatWithMapAssistant, type MapAssistantOutput } from '@/ai/flows/find-layer-flow';
import { searchTrelloCard } from '@/ai/flows/trello-actions';
import { authenticateWithGee } from '@/ai/flows/gee-flow';


const osmCategoryConfig: OSMCategoryConfig[] = [
  {
    id: 'watercourses', name: 'OSM Cursos de Agua',
    overpassQueryFragment: (bboxStr) => `nwr[waterway~"^(river|stream|canal)$"](${bboxStr});`,
    matcher: (tags) => tags && (tags.waterway === 'river' || tags.waterway === 'stream' || tags.waterway === 'canal'),
    style: new Style({ stroke: new Stroke({ color: '#3a86ff', width: 2 }) })
  },
  {
    id: 'water_bodies', name: 'OSM Cuerpos de Agua',
    overpassQueryFragment: (bboxStr) => `nwr[natural="water"](${bboxStr});\nnwr[landuse="reservoir"](${bboxStr});`,
    matcher: (tags) => tags && (tags.natural === 'water' || tags.landuse === 'reservoir'),
    style: new Style({ fill: new Fill({ color: 'rgba(58,134,255,0.4)' }), stroke: new Stroke({ color: '#3a86ff', width: 1 }) })
  },
  {
    id: 'roads_paths', name: 'OSM Rutas y Caminos',
    overpassQueryFragment: (bboxStr) => `nwr[highway](${bboxStr});`,
    matcher: (tags) => tags && !!tags.highway,
    style: new Style({ stroke: new Stroke({ color: '#adb5bd', width: 3 }) })
  },
  {
    id: 'admin_boundaries', name: 'OSM Límites Admin.',
    overpassQueryFragment: (bboxStr) => `nwr[boundary="administrative"][admin_level](${bboxStr});`,
    matcher: (tags) => tags && tags.boundary === 'administrative' && tags.admin_level,
    style: new Style({ stroke: new Stroke({ color: '#ff006e', width: 2, lineDash: [4, 8] }) })
  },
  {
    id: 'green_areas', name: 'OSM Áreas Verdes',
    overpassQueryFragment: (bboxStr) => `nwr[leisure="park"](${bboxStr});\nnwr[landuse="forest"](${bboxStr});\nnwr[natural="wood"](${bboxStr});`,
    matcher: (tags) => tags && (tags.leisure === 'park' || tags.landuse === 'forest' || tags.natural === 'wood'),
    style: new Style({ fill: new Fill({ color: 'rgba(13,166,75,0.4)' }), stroke: new Stroke({ color: '#0da64b', width: 1 }) })
  },
  {
    id: 'health_centers', name: 'OSM Centros de Salud',
    overpassQueryFragment: (bboxStr) => `nwr[amenity~"^(hospital|clinic|doctors|pharmacy)$"](${bboxStr});`,
    matcher: (tags) => tags && ['hospital', 'clinic', 'doctors', 'pharmacy'].includes(tags.amenity),
    style: new Style({ image: new CircleStyle({ radius: 6, fill: new Fill({color: '#d90429'}), stroke: new Stroke({color: 'white', width: 1.5})})})
  },
  {
    id: 'educational', name: 'OSM Educacionales',
    overpassQueryFragment: (bboxStr) => `nwr[amenity~"^(school|university|college|kindergarten)$"](${bboxStr});`,
    matcher: (tags) => tags && ['school', 'university', 'college', 'kindergarten'].includes(tags.amenity),
    style: new Style({ image: new CircleStyle({ radius: 6, fill: new Fill({color: '#8338ec'}), stroke: new Stroke({color: 'white', width: 1.5})})})
  },
   {
    id: 'social_institutions', name: 'OSM Instituciones Sociales',
    overpassQueryFragment: (bboxStr) => `nwr[amenity~"^(community_centre|social_facility|place_of_worship)$"](${bboxStr}); nwr[office="ngo"](${bboxStr}); nwr[leisure="club"](${bboxStr});`,
    matcher: (tags) => tags && (tags.amenity === 'community_centre' || tags.amenity === 'social_facility' || tags.amenity === 'place_of_worship' || tags.office === 'ngo' || tags.leisure === 'club'),
    style: new Style({ image: new CircleStyle({ radius: 6, fill: new Fill({color: '#ff6b6b'}), stroke: new Stroke({color: 'white', width: 1.5})})})
  },
  {
    id: 'cultural_heritage', name: 'OSM Patrimonio Cultural',
    overpassQueryFragment: (bboxStr) => `nwr[historic](${bboxStr}); nwr[tourism="museum"](${bboxStr}); nwr[tourism="artwork"](${bboxStr}); nwr[amenity="place_of_worship"][historic](${bboxStr}); nwr[amenity="place_of_worship"][heritage](${bboxStr});`,
    matcher: (tags) => tags && (tags.historic || tags.tourism === 'museum' || tags.tourism === 'artwork' || (tags.amenity === 'place_of_worship' && (tags.historic || tags.heritage))),
    style: new Style({ image: new CircleStyle({ radius: 6, fill: new Fill({color: '#8d6e63'}), stroke: new Stroke({color: 'white', width: 1.5})})})
  },
];
const osmCategoriesForSelection = osmCategoryConfig.map(({ id, name }) => ({ id, name }));
const availableBaseLayersForSelect: BaseLayerOptionForSelect[] = BASE_LAYER_DEFINITIONS.map(def => ({ id: def.id, name: def.name }));

const PANEL_WIDTH = 350;
const PANEL_PADDING = 8;

const panelToggleConfigs = [
  { id: 'legend', IconComponent: ListTree, name: "Capas en Mapa" },
  { id: 'deasCatalog', IconComponent: Server, name: "Capas Predefinidas" },
  { id: 'wfsLibrary', IconComponent: Library, name: "Biblioteca de Servidores" },
  { id: 'layers', IconComponent: Database, name: "Datos y Vista" },
  { id: 'tools', IconComponent: Wrench, name: "Herramientas" },
  { id: 'trello', IconComponent: ClipboardCheck, name: "Trello" },
  { id: 'attributes', IconComponent: ListChecks, name: "Atributos" },
  { id: 'printComposer', IconComponent: Printer, name: "Impresión" },
  { id: 'gee', IconComponent: BrainCircuit, name: "Procesamiento GEE" },
  { id: 'ai', IconComponent: Sparkles, name: "Asistente IA" },
  { id: 'help', IconComponent: LifeBuoy, name: "Ayuda" },
];


export default function GeoMapperClient() {
  const mapAreaRef = useRef<HTMLDivElement>(null);
  const layersPanelRef = useRef<HTMLDivElement>(null);
  const toolsPanelRef = useRef<HTMLDivElement>(null);
  const legendPanelRef = useRef<HTMLDivElement>(null);
  const attributesPanelRef = useRef<HTMLDivElement>(null);
  const aiPanelRef = useRef<HTMLDivElement>(null);
  const trelloPanelRef = useRef<HTMLDivElement>(null);
  const wfsLibraryPanelRef = useRef<HTMLDivElement>(null);
  const helpPanelRef = useRef<HTMLDivElement>(null);
  const printComposerPanelRef = useRef<HTMLDivElement>(null);
  const deasCatalogPanelRef = useRef<HTMLDivElement>(null);
  const geePanelRef = useRef<HTMLDivElement>(null);

  const { mapRef, mapElementRef, setMapInstanceAndElement, isMapReady, drawingSourceRef } = useOpenLayersMap();
  const { toast } = useToast();

  const { panels, handlePanelMouseDown, togglePanelCollapse, togglePanelMinimize } = useFloatingPanels({
    layersPanelRef,
    toolsPanelRef,
    legendPanelRef,
    attributesPanelRef,
    aiPanelRef,
    trelloPanelRef,
    wfsLibraryPanelRef,
    helpPanelRef,
    printComposerPanelRef,
    deasCatalogPanelRef,
    geePanelRef,
    mapAreaRef,
    panelWidth: PANEL_WIDTH,
    panelPadding: PANEL_PADDING,
  });

  const [activeBaseLayerId, setActiveBaseLayerId] = useState<string>(BASE_LAYER_DEFINITIONS[0].id);
  const [baseLayerSettings, setBaseLayerSettings] = useState<BaseLayerSettings>({
    opacity: 1,
    brightness: 100,
    contrast: 100,
  });
  
  const handleBaseLayerSettingsChange = useCallback((newSettings: Partial<BaseLayerSettings>) => {
    setBaseLayerSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const handleChangeBaseLayer = useCallback((newBaseLayerId: string) => {
    setActiveBaseLayerId(newBaseLayerId);
  }, []);

  const featureInspectionHook = useFeatureInspection({
    mapRef, 
    mapElementRef, 
    isMapReady,
    onNewSelection: () => {
      // When a new selection is made, or attributes are shown, ensure the attributes panel is visible.
      if (panels.attributes.isMinimized) {
        togglePanelMinimize('attributes');
      }
    }
  });

  const [isWfsLoading, setIsWfsLoading] = useState(false);
  const [discoveredGeoServerLayers, setDiscoveredGeoServerLayers] = useState<GeoServerDiscoveredLayer[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: "¡Buenas! Soy Drax, tu asistente de mapas. Pedime que cargue una capa, que la saque o que le haga zoom." }
  ]);
  const [isTrelloLoading, setIsTrelloLoading] = useState(false);
  const [printLayoutData, setPrintLayoutData] = useState<MapCaptureData | null>(null);
  const [isGeeAuthenticated, setIsGeeAuthenticated] = useState(false);
  const [isGeeAuthenticating, setIsGeeAuthenticating] = useState(true); // Start as true


  const updateDiscoveredLayerState = useCallback((layerName: string, added: boolean, type: 'wms' | 'wfs') => {
    setDiscoveredGeoServerLayers(prev => prev.map(l => {
      if (l.name === layerName) {
        if (type === 'wms') return { ...l, wmsAddedToMap: added };
        if (type === 'wfs') return { ...l, wfsAddedToMap: added };
      }
      return l;
    }));
  }, []);

  const layerManagerHook = useLayerManager({
    mapRef,
    isMapReady,
    drawingSourceRef,
    onShowTableRequest: featureInspectionHook.processAndDisplayFeatures,
    updateGeoServerDiscoveredLayerState: updateDiscoveredLayerState,
    selectedFeaturesForExtraction: featureInspectionHook.selectedFeatures,
    clearSelectionAfterExtraction: featureInspectionHook.clearSelection,
  });
  
  const {
    handleAddGeoServerLayerToMap, handleAddGeoServerLayerAsWFS, handleFetchGeoServerLayers,
  } = useGeoServerLayers({
      mapRef,
      isMapReady,
      addLayer: layerManagerHook.addLayer,
      onLayerStateUpdate: updateDiscoveredLayerState,
      setIsWfsLoading
  });
  
  const wfsLibraryHook = useWfsLibrary({
    mapRef,
    isMapReady,
    addLayer: layerManagerHook.addLayer,
  });

  const initialGeoServerUrl = 'http://www.minfra.gba.gob.ar/ambientales/geoserver';

  // Effect for initial GeoServer layer loading
  useEffect(() => {
    const loadInitialLayers = async () => {
      try {
        const discovered = await handleFetchGeoServerLayers(initialGeoServerUrl);
        if (discovered && discovered.length > 0) {
          setDiscoveredGeoServerLayers(discovered);
        }
      } catch (error) {
        console.error("Failed to load initial DEAS layers:", error);
        toast({ description: `No se pudo obtener la lista de capas de DEAS. Es posible que el asistente no las encuentre.`, variant: 'destructive' });
      }
    };
    
    if (isMapReady) {
       loadInitialLayers();
    }
  }, [isMapReady, handleFetchGeoServerLayers, toast]);

  // Effect for automatic GEE authentication on load
  useEffect(() => {
    const runGeeAuth = async () => {
        setIsGeeAuthenticating(true);
        try {
            const result = await authenticateWithGee();
            if (result.success) {
                toast({
                    title: "GEE Conectado",
                    description: result.message,
                });
                setIsGeeAuthenticated(true);
            }
        } catch (error: any) {
            console.error("Error de autenticación automática con GEE:", error);
            toast({
                title: "Error de Autenticación GEE",
                description: error.message || "No se pudo autenticar con Google Earth Engine.",
                variant: "destructive",
            });
            setIsGeeAuthenticated(false);
        } finally {
            setIsGeeAuthenticating(false);
        }
    };

    if (isMapReady) {
        runGeeAuth();
    }
  }, [isMapReady, toast]);

  const osmDataHook = useOSMData({ 
    mapRef, 
    drawingSourceRef, 
    addLayer: layerManagerHook.addLayer, 
    osmCategoryConfigs: osmCategoryConfig 
  });

  // Orchestration between drawing and feature inspection tools
  const drawingInteractions = useDrawingInteractions({
    mapRef, isMapReady, drawingSourceRef: drawingSourceRef,
    isInspectModeActive: featureInspectionHook.isInspectModeActive,
    toggleInspectMode: featureInspectionHook.toggleInspectMode,
  });

  const { captureMapDataUrl, isCapturing } = useMapCapture({ mapRef, activeBaseLayerId });

  // This effect sets up and cleans up the event listener for map movement.
  // It re-attaches the listener when dependencies change, ensuring it never has a "stale" state.
  useEffect(() => {
    if (!isMapReady || !mapRef.current) return;

    const view = mapRef.current.getView();

    const handleMoveEnd = async () => {
      // Logic is directly inside the listener, using the latest state from the component's render scope.
      if (panels.printComposer.isMinimized || isCapturing) {
        return;
      }

      const layoutData = await captureMapDataUrl();
      if (layoutData) {
        setPrintLayoutData(layoutData);
      } else {
        toast({
          title: "Error de Captura",
          description: "No se pudo actualizar la imagen del mapa.",
          variant: "destructive",
        });
      }
    };

    view.on('moveend', handleMoveEnd);

    // The cleanup function removes the exact listener that was added.
    return () => {
      if (view && typeof view.un === 'function') { // Ensure view and .un are available on cleanup
        view.un('moveend', handleMoveEnd);
      }
    };
  }, [isMapReady, mapRef, panels, isCapturing, captureMapDataUrl, toast]); // Dependency array ensures the listener is always fresh.


  const handleTogglePrintComposer = async () => {
    if (panels.printComposer.isMinimized) {
        const layoutData = await captureMapDataUrl();
        if (layoutData) {
            setPrintLayoutData(layoutData);
            togglePanelMinimize('printComposer');
        } else {
            toast({
                title: "Error de Captura",
                description: "No se pudo generar la imagen del mapa para la impresión.",
                variant: "destructive",
            });
        }
    } else {
        togglePanelMinimize('printComposer');
    }
  };


  const zoomToBoundingBox = useCallback((bbox: [number, number, number, number], onZoomComplete?: (completed: boolean) => void) => {
    if (!mapRef.current) {
        onZoomComplete?.(false);
        return;
    }
    const extent4326: Extent = [bbox[0], bbox[1], bbox[2], bbox[3]];
    try {
        const extent3857 = transformExtent(extent4326, 'EPSG:4326', 'EPSG:3857');

        if (extent3857 && extent3857.every(isFinite) && (extent3857[2] - extent3857[0] > 0.000001) && (extent3857[3] - extent3857[1] > 0.000001)) {
            mapRef.current.getView().fit(extent3857, {
                padding: [50, 50, 50, 50],
                duration: 1000,
                maxZoom: 17,
                callback: onZoomComplete,
            });
            setTimeout(() => {
              toast({ description: "Ubicación encontrada y centrada en el mapa." });
            }, 0);
        } else {
            setTimeout(() => {
              toast({ description: "No se pudo determinar una extensión válida para la ubicación." });
            }, 0);
            onZoomComplete?.(false);
        }
    } catch (error) {
        console.error("Error transforming extent or fitting view:", error);
        setTimeout(() => {
          toast({ description: "Error al procesar la ubicación seleccionada." });
        }, 0);
        onZoomComplete?.(false);
    }
  }, [mapRef, toast]);

  const handleAiAction = useCallback((action: MapAssistantOutput) => {
    if (action.response) {
      if (/(carg|busc|añad|mostr|quit|elimin|zoom|estilo|tabla|mapa|base|sentinel|landsat|trello)/i.test(action.response) && 
            ![action.layersToAdd, action.layersToAddAsWFS, action.layersToRemove, action.layersToStyle, action.zoomToLayer, action.showTableForLayer, action.setBaseLayer, action.zoomToBoundingBox, action.findSentinel2Footprints, action.findLandsatFootprints, action.fetchOsmForView, action.urlToOpen].some(field => field && (Array.isArray(field) ? field.length > 0 : true))) {
          toast({
              title: "Drax no identificó una acción",
              description: "No se encontró una capa o acción que coincida con tu pedido. Intenta ser más específico.",
              variant: "destructive",
              duration: 6000,
          });
      }
    }

    if (action.layersToAdd && action.layersToAdd.length > 0) {
      action.layersToAdd.forEach(layerNameToAdd => {
        const layerData = discoveredGeoServerLayers.find(l => l.name === layerNameToAdd);
        if (layerData) {
            handleAddGeoServerLayerToMap(layerData.name, layerData.title, true, initialGeoServerUrl, layerData.bbox);
        } else {
            toast({
                title: "Capa WMS no encontrada",
                description: `Drax intentó añadir una capa que no existe: "${layerNameToAdd}"`,
                variant: 'destructive'
            });
        }
      });
    }

    if (action.layersToAddAsWFS && action.layersToAddAsWFS.length > 0) {
      action.layersToAddAsWFS.forEach(layerNameToAdd => {
        const layerData = discoveredGeoServerLayers.find(l => l.name === layerNameToAdd);
        if (layerData) {
            handleAddGeoServerLayerAsWFS(layerData.name, layerData.title, initialGeoServerUrl, layerData.styleName);
        } else {
            toast({
                title: "Capa WFS no encontrada",
                description: `Drax intentó añadir una capa que no existe: "${layerNameToAdd}"`,
                variant: 'destructive'
            });
        }
      });
    }

    if (action.layersToRemove && action.layersToRemove.length > 0) {
        action.layersToRemove.forEach(layerNameToRemove => {
            const layerToRemove = layerManagerHook.layers.find(l => {
                const machineName = l.olLayer.get('gsLayerName') || l.name;
                return machineName === layerNameToRemove;
            });
            if (layerToRemove) {
                layerManagerHook.removeLayer(layerToRemove.id);
            } else {
                toast({description: `Drax intentó eliminar una capa no encontrada: ${layerNameToRemove}`});
            }
        });
    }

    if (action.zoomToLayer) {
      const layerToZoom = layerManagerHook.layers.find(l => {
          const machineName = l.olLayer.get('gsLayerName') || l.name;
          return machineName === action.zoomToLayer;
      });
       if (layerToZoom) {
        layerManagerHook.zoomToLayerExtent(layerToZoom.id);
      } else {
        toast({description: `Drax intentó hacer zoom a una capa no encontrada: ${action.zoomToLayer}`});
      }
    }

    if (action.layersToStyle && action.layersToStyle.length > 0) {
        action.layersToStyle.forEach(styleRequest => {
            const layerToStyle = layerManagerHook.layers.find(l => {
                const machineName = l.olLayer.get('gsLayerName') || l.name;
                return machineName === styleRequest.layerName;
            });
            if (layerToStyle) {
                layerManagerHook.changeLayerStyle(layerToStyle.id, {
                    strokeColor: styleRequest.strokeColor,
                    fillColor: styleRequest.fillColor,
                    lineStyle: styleRequest.lineStyle,
                    lineWidth: styleRequest.lineWidth
                });
            } else {
                toast({description: `Drax intentó aplicar un estilo a una capa no encontrada: ${styleRequest.layerName}`});
            }
        });
    }

    if (action.showTableForLayer) {
        const layerToShowTable = layerManagerHook.layers.find(l => {
            const machineName = l.olLayer.get('gsLayerName') || l.name;
            return machineName === action.showTableForLayer;
        });
        if (layerToShowTable) {
            layerManagerHook.handleShowLayerTable(layerToShowTable.id);
        } else {
            toast({description: `Drax intentó mostrar la tabla de una capa no encontrada: ${action.showTableForLayer}`});
        }
    }
    
    if (action.setBaseLayer) {
      handleChangeBaseLayer(action.setBaseLayer);
    }

    const shouldZoom = action.zoomToBoundingBox && action.zoomToBoundingBox.length === 4;
    const shouldFindSentinelFootprints = !!action.findSentinel2Footprints;
    const shouldFindLandsatFootprints = !!action.findLandsatFootprints;
    const shouldFetchOsm = action.fetchOsmForView && action.fetchOsmForView.length > 0;

    const performSearchAfterZoom = () => {
      if (action.findSentinel2Footprints) {
        layerManagerHook.findSentinel2FootprintsInCurrentView(action.findSentinel2Footprints);
      }
      if (action.findLandsatFootprints) {
        layerManagerHook.findLandsatFootprintsInCurrentView(action.findLandsatFootprints);
      }
      if (action.fetchOsmForView) {
        osmDataHook.fetchOSMForCurrentView(action.fetchOsmForView);
      }
    };
    
    if (shouldZoom) {
      const [sLat, nLat, wLon, eLon] = action.zoomToBoundingBox!;
      if ([sLat, nLat, wLon, eLon].every(c => !isNaN(c))) {
        const afterZoomAction = (shouldFindSentinelFootprints || shouldFindLandsatFootprints || shouldFetchOsm)
            ? (completed: boolean) => {
                if (completed) {
                    performSearchAfterZoom();
                } else {
                    toast({ description: "El zoom fue cancelado, no se realizarán búsquedas adicionales." });
                }
              }
            : undefined;

        zoomToBoundingBox([wLon, sLat, eLon, nLat], afterZoomAction);
      } else {
        toast({description: `Drax devolvió una ubicación inválida.`});
      }
    } else {
        if (shouldFindSentinelFootprints || shouldFindLandsatFootprints || shouldFetchOsm) {
            performSearchAfterZoom(); // handles non-zoom searches
        }
    }
    
    if (action.urlToOpen) {
      window.open(action.urlToOpen, '_blank', 'noopener,noreferrer');
      toast({ description: `Abriendo Trello en una nueva pestaña...` });
    }

  }, [discoveredGeoServerLayers, handleAddGeoServerLayerToMap, handleAddGeoServerLayerAsWFS, toast, layerManagerHook, zoomToBoundingBox, handleChangeBaseLayer, osmDataHook, initialGeoServerUrl]);

  const handleSearchTrelloCard = useCallback(async (searchTerm: string) => {
    setIsTrelloLoading(true);
    try {
      const result = await searchTrelloCard({ query: searchTerm });
      toast({ description: result.message });
      if (result.cardUrl) {
        window.open(result.cardUrl, '_blank', 'noopener,noreferrer');
        toast({ description: `Abriendo Trello en una nueva pestaña...` });
      }
    } catch (error: any) {
      console.error("Trello card search error:", error);
      toast({ description: error.message || 'Error al buscar la tarjeta en Trello.', variant: 'destructive' });
    } finally {
      setIsTrelloLoading(false);
    }
  }, [toast]);

  const handleDeasLayerToggle = useCallback((layer: GeoServerDiscoveredLayer, isChecked: boolean) => {
      if (isChecked) {
          handleAddGeoServerLayerToMap(layer.name, layer.title, true, initialGeoServerUrl, layer.bbox);
      } else {
          const layerToRemove = layerManagerHook.layers.find(
              (activeLayer) => activeLayer.olLayer.get('gsLayerName') === layer.name
          );
          if (layerToRemove) {
              layerManagerHook.removeLayer(layerToRemove.id);
          }
      }
  }, [handleAddGeoServerLayerToMap, layerManagerHook, initialGeoServerUrl]);


  return (
    <div className="flex h-screen w-screen flex-col bg-background text-foreground">
      <header className="bg-gray-800/80 backdrop-blur-md text-white p-2 shadow-md flex items-center justify-between z-30">
        <div className="flex items-center">
          <MapPin className="mr-2 h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold">Departamento de Estudios Ambientales y Sociales</h1>
        </div>
        <div className="flex flex-row space-x-1">
          <TooltipProvider delayDuration={200}>
            {panelToggleConfigs.map((panelConfig) => {
              const panelState = panels[panelConfig.id as keyof typeof panels];
              if (!panelState) return null;

              const isPanelOpen = !panelState.isMinimized;
              const tooltipText = panelConfig.name;
              
              return (
                <Tooltip key={panelConfig.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={"outline"}
                      size="icon"
                      className={`h-8 w-8 focus-visible:ring-primary ${
                        isPanelOpen
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90 border-primary/80'
                          : 'bg-gray-700/80 text-white hover:bg-gray-600/90 border-gray-600/70'
                      }`}
                      onClick={() => {
                        if (panelConfig.id === 'printComposer') {
                          handleTogglePrintComposer();
                        } else {
                          togglePanelMinimize(panelConfig.id as any);
                        }
                      }}
                      aria-label={tooltipText}
                    >
                      <panelConfig.IconComponent className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-gray-700 text-white border-gray-600">
                    <p className="text-xs">{tooltipText}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </div>
      </header>
      <div ref={mapAreaRef} className="relative flex-1 overflow-visible">
        <MapView
          setMapInstanceAndElement={setMapInstanceAndElement}
          activeBaseLayerId={activeBaseLayerId}
          baseLayerSettings={baseLayerSettings}
        />

        <WfsLoadingIndicator isVisible={isWfsLoading || wfsLibraryHook.isLoading} />

        {panels.layers && !panels.layers.isMinimized && (
          <LayersPanel
            panelRef={layersPanelRef}
            isCollapsed={panels.layers.isCollapsed}
            onToggleCollapse={() => togglePanelCollapse('layers')}
            onClosePanel={() => togglePanelMinimize('layers')}
            onMouseDownHeader={(e) => handlePanelMouseDown(e, 'layers')}
            availableBaseLayers={availableBaseLayersForSelect}
            activeBaseLayerId={activeBaseLayerId}
            onChangeBaseLayer={handleChangeBaseLayer}
            onZoomToBoundingBox={zoomToBoundingBox}
            onFindSentinel2Footprints={layerManagerHook.findSentinel2FootprintsInCurrentView}
            onClearSentinel2Footprints={layerManagerHook.clearSentinel2FootprintsLayer}
            isFindingSentinelFootprints={layerManagerHook.isFindingSentinelFootprints}
            onFindLandsatFootprints={layerManagerHook.findLandsatFootprintsInCurrentView}
            onClearLandsatFootprints={layerManagerHook.clearLandsatFootprintsLayer}
            isFindingLandsatFootprints={layerManagerHook.isFindingLandsatFootprints}
            baseLayerSettings={baseLayerSettings}
            onBaseLayerSettingsChange={handleBaseLayerSettingsChange}
            style={{ top: `${panels.layers.position.y}px`, left: `${panels.layers.position.x}px`, zIndex: panels.layers.zIndex }}
          />
        )}

        {panels.deasCatalog && !panels.deasCatalog.isMinimized && (
            <DeasCatalogPanel
                panelRef={deasCatalogPanelRef}
                isCollapsed={panels.deasCatalog.isCollapsed}
                onToggleCollapse={() => togglePanelCollapse('deasCatalog')}
                onClosePanel={() => togglePanelMinimize('deasCatalog')}
                onMouseDownHeader={(e) => handlePanelMouseDown(e, 'deasCatalog')}
                discoveredLayers={discoveredGeoServerLayers}
                onLayerToggle={handleDeasLayerToggle}
                onAddWfsLayer={(layer) => handleAddGeoServerLayerAsWFS(layer.name, layer.title, initialGeoServerUrl, layer.styleName)}
                style={{ top: `${panels.deasCatalog.position.y}px`, left: `${panels.deasCatalog.position.x}px`, zIndex: panels.deasCatalog.zIndex }}
            />
        )}

        {panels.tools && !panels.tools.isMinimized && (
          <ToolsPanel
            panelRef={toolsPanelRef}
            isCollapsed={panels.tools.isCollapsed}
            onToggleCollapse={() => togglePanelCollapse('tools')}
            onClosePanel={() => togglePanelMinimize('tools')}
            onMouseDownHeader={(e) => handlePanelMouseDown(e, 'tools')}
            activeDrawTool={drawingInteractions.activeDrawTool}
            onToggleDrawingTool={drawingInteractions.toggleDrawingTool}
            onClearDrawnFeatures={drawingInteractions.clearDrawnFeatures}
            onSaveDrawnFeaturesAsKML={drawingInteractions.saveDrawnFeaturesAsKML}
            isFetchingOSM={osmDataHook.isFetchingOSM}
            onFetchOSMDataTrigger={osmDataHook.fetchOSMData}
            osmCategoriesForSelection={osmCategoriesForSelection}
            selectedOSMCategoryIds={osmDataHook.selectedOSMCategoryIds}
            onSelectedOSMCategoriesChange={osmDataHook.setSelectedOSMCategoryIds}
            downloadFormat={osmDataHook.downloadFormat}
            onDownloadFormatChange={osmDataHook.setDownloadFormat}
            isDownloading={osmDataHook.isDownloading}
            onDownloadOSMLayers={() => osmDataHook.handleDownloadOSMLayers(layerManagerHook.layers)}
            style={{ top: `${panels.tools.position.y}px`, left: `${panels.tools.position.x}px`, zIndex: panels.tools.zIndex }}
          />
        )}

        {panels.legend && !panels.legend.isMinimized && (
          <LegendPanel
            panelRef={legendPanelRef}
            isCollapsed={panels.legend.isCollapsed}
            onToggleCollapse={() => togglePanelCollapse('legend')}
            onClosePanel={() => togglePanelMinimize('legend')}
            onMouseDownHeader={(e) => handlePanelMouseDown(e, 'legend')}
            layers={layerManagerHook.layers}
            onToggleLayerVisibility={layerManagerHook.toggleLayerVisibility}
            onRemoveLayer={layerManagerHook.removeLayer}
            onRemoveLayers={layerManagerHook.removeLayers}
            onZoomToLayerExtent={layerManagerHook.zoomToLayerExtent}
            onShowLayerTable={(layerId) => {
              layerManagerHook.handleShowLayerTable(layerId);
              if (panels.attributes.isMinimized) {
                  togglePanelMinimize('attributes');
              }
            }}
            onExtractByPolygon={(layerId) => layerManagerHook.handleExtractByPolygon(layerId)}
            onExtractBySelection={layerManagerHook.handleExtractBySelection}
            onExportSelection={layerManagerHook.handleExportSelection}
            isDrawingSourceEmptyOrNotPolygon={layerManagerHook.isDrawingSourceEmptyOrNotPolygon}
            isSelectionEmpty={featureInspectionHook.selectedFeatures.length === 0}
            onSetLayerOpacity={layerManagerHook.setLayerOpacity}
            onReorderLayers={layerManagerHook.reorderLayers}
            onAddLayer={layerManagerHook.addLayer as (layer: MapLayer) => void}
            isInteractionActive={featureInspectionHook.isInspectModeActive}
            onToggleInteraction={featureInspectionHook.toggleInspectMode}
            selectionMode={featureInspectionHook.selectionMode}
            onSetSelectionMode={featureInspectionHook.setSelectionMode}
            onClearSelection={featureInspectionHook.clearSelection}
            style={{ top: `${panels.legend.position.y}px`, left: `${panels.legend.position.x}px`, zIndex: panels.legend.zIndex }}
          />
        )}

        {panels.attributes && !panels.attributes.isMinimized && (
          <AttributesPanel
            panelRef={attributesPanelRef}
            isCollapsed={panels.attributes.isCollapsed}
            onToggleCollapse={() => togglePanelCollapse('attributes')}
            onClosePanel={() => {
              togglePanelMinimize('attributes'); 
              featureInspectionHook.clearSelection(); 
            }}
            onMouseDownHeader={(e) => handlePanelMouseDown(e, 'attributes')}
            featuresAttributes={featureInspectionHook.selectedFeatureAttributes}
            layerName={featureInspectionHook.currentInspectedLayerName}
            style={{ top: `${panels.attributes.position.y}px`, left: `${panels.attributes.position.x}px`, zIndex: panels.attributes.zIndex }}
          />
        )}
        
        {panels.printComposer && !panels.printComposer.isMinimized && printLayoutData && (
            <PrintComposerPanel
                mapImage={printLayoutData.image}
                mapExtent={printLayoutData.extent}
                scale={printLayoutData.scale}
                panelRef={printComposerPanelRef}
                isCollapsed={panels.printComposer.isCollapsed}
                onToggleCollapse={() => togglePanelCollapse('printComposer')}
                onClosePanel={() => togglePanelMinimize('printComposer')}
                onMouseDownHeader={(e) => handlePanelMouseDown(e, 'printComposer')}
                style={{ top: `${panels.printComposer.position.y}px`, left: `${panels.printComposer.position.x}px`, zIndex: panels.printComposer.zIndex }}
                isRefreshing={isCapturing}
            />
        )}

        {panels.gee && !panels.gee.isMinimized && (
          <GeeProcessingPanel
            panelRef={geePanelRef}
            isCollapsed={panels.gee.isCollapsed}
            onToggleCollapse={() => togglePanelCollapse('gee')}
            onClosePanel={() => togglePanelMinimize('gee')}
            onMouseDownHeader={(e) => handlePanelMouseDown(e, 'gee')}
            onAddGeeLayer={layerManagerHook.addGeeLayerToMap}
            mapRef={mapRef}
            isAuthenticating={isGeeAuthenticating}
            isAuthenticated={isGeeAuthenticated}
            style={{ top: `${panels.gee.position.y}px`, left: `${panels.gee.position.x}px`, zIndex: panels.gee.zIndex }}
          />
        )}

        {panels.ai && !panels.ai.isMinimized && (
          <AIPanel
            panelRef={aiPanelRef}
            isCollapsed={panels.ai.isCollapsed}
            onToggleCollapse={() => togglePanelCollapse('ai')}
            onClosePanel={() => togglePanelMinimize('ai')}
            onMouseDownHeader={(e) => handlePanelMouseDown(e, 'ai')}
            availableLayers={discoveredGeoServerLayers.map(l => ({ name: l.name, title: l.title }))}
            activeLayers={layerManagerHook.layers.map(l => {
              const machineName = l.olLayer.get('gsLayerName') || l.name;
              return { name: machineName, title: l.name, type: l.type };
            })}
            onLayerAction={handleAiAction}
            messages={chatMessages}
            setMessages={setChatMessages}
            style={{ top: `${panels.ai.position.y}px`, left: `${panels.ai.position.x}px`, zIndex: panels.ai.zIndex }}
          />
        )}

        {panels.trello && !panels.trello.isMinimized && (
          <TrelloPanel
            panelRef={trelloPanelRef}
            isCollapsed={panels.trello.isCollapsed}
            onToggleCollapse={() => togglePanelCollapse('trello')}
            onClosePanel={() => togglePanelMinimize('trello')}
            onMouseDownHeader={(e) => handlePanelMouseDown(e, 'trello')}
            onSearchCard={handleSearchTrelloCard}
            isLoading={isTrelloLoading}
            style={{ top: `${panels.trello.position.y}px`, left: `${panels.trello.position.x}px`, zIndex: panels.trello.zIndex }}
          />
        )}

        {panels.wfsLibrary && !panels.wfsLibrary.isMinimized && (
          <WfsLibraryPanel
            panelRef={wfsLibraryPanelRef}
            isCollapsed={panels.wfsLibrary.isCollapsed}
            onToggleCollapse={() => togglePanelCollapse('wfsLibrary')}
            onClosePanel={() => togglePanelMinimize('wfsLibrary')}
            onMouseDownHeader={(e) => handlePanelMouseDown(e, 'wfsLibrary')}
            style={{ top: `${panels.wfsLibrary.position.y}px`, left: `${panels.wfsLibrary.position.x}px`, zIndex: panels.wfsLibrary.zIndex }}
            predefinedServers={wfsLibraryHook.PREDEFINED_SERVERS}
            isLoading={wfsLibraryHook.isLoading}
            discoveredLayers={wfsLibraryHook.discoveredLayers}
            onFetchLayers={wfsLibraryHook.fetchCapabilities}
            onAddLayer={wfsLibraryHook.addLayer}
          />
        )}

        {panels.help && !panels.help.isMinimized && (
          <HelpPanel
            panelRef={helpPanelRef}
            isCollapsed={panels.help.isCollapsed}
            onToggleCollapse={() => togglePanelCollapse('help')}
            onClosePanel={() => togglePanelMinimize('help')}
            onMouseDownHeader={(e) => handlePanelMouseDown(e, 'help')}
            style={{ top: `${panels.help.position.y}px`, left: `${panels.help.position.x}px`, zIndex: panels.help.zIndex }}
          />
        )}
      </div>
    </div>
  );
}
