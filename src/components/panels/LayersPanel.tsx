
"use client";

import React from 'react';
import DraggablePanel from './DraggablePanel';
import BaseLayerSelector from '@/components/layer-manager/BaseLayerSelector';
import LocationSearch from '@/components/location-search/LocationSearch';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import type { BaseLayerOptionForSelect, NominatimResult, BaseLayerSettings } from '@/lib/types'; 
import { Database, Search, ImageUp, ImageOff, Loader2 } from 'lucide-react';
import BaseLayerControls from '../layer-manager/BaseLayerControls';
import { StreetViewIcon } from '@/components/icons/StreetViewIcon';

interface LayersPanelProps {
  panelRef: React.RefObject<HTMLDivElement>;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onClosePanel: () => void; 
  onMouseDownHeader: (e: React.MouseEvent<HTMLDivElement>) => void;

  availableBaseLayers: BaseLayerOptionForSelect[];
  activeBaseLayerId: string;
  onChangeBaseLayer: (id: string) => void;
  onOpenStreetView: () => void;

  onZoomToBoundingBox: (bbox: [number, number, number, number]) => void;

  onFindSentinel2Footprints: (dateRange?: { startDate?: string, completionDate?: string }) => void;
  onClearSentinel2Footprints: () => void;
  isFindingSentinelFootprints: boolean; 

  onFindLandsatFootprints: (dateRange?: { startDate?: string, completionDate?: string }) => void;
  onClearLandsatFootprints: () => void;
  isFindingLandsatFootprints: boolean;

  baseLayerSettings: BaseLayerSettings;
  onBaseLayerSettingsChange: (newSettings: Partial<BaseLayerSettings>) => void;

  style?: React.CSSProperties; 
}


const LayersPanel: React.FC<LayersPanelProps> = ({
  panelRef, isCollapsed, onToggleCollapse, onClosePanel, onMouseDownHeader,
  availableBaseLayers, activeBaseLayerId, onChangeBaseLayer, onOpenStreetView,
  onZoomToBoundingBox,
  onFindSentinel2Footprints, onClearSentinel2Footprints, isFindingSentinelFootprints,
  onFindLandsatFootprints, onClearLandsatFootprints, isFindingLandsatFootprints,
  baseLayerSettings, onBaseLayerSettingsChange,
  style, 
}) => {
  
  const handleLocationSelection = (location: NominatimResult) => {
    const [sLat, nLat, wLon, eLon] = location.boundingbox.map(coord => parseFloat(coord));
    onZoomToBoundingBox([wLon, sLat, eLon, nLat]);
  };
  
  return (
    <DraggablePanel
      title="Datos y Vista"
      icon={Database}
      panelRef={panelRef}
      initialPosition={{ x: 0, y: 0 }} 
      onMouseDownHeader={onMouseDownHeader}
      isCollapsed={isCollapsed}
      onToggleCollapse={onToggleCollapse}
      onClose={onClosePanel}
      showCloseButton={true}
      style={style} 
      zIndex={style?.zIndex as number | undefined} 
    >
      <div className="space-y-3"> 
        
        <LocationSearch onLocationSelect={handleLocationSelection} />
        
        <div className="flex items-center gap-2">
            <BaseLayerSelector
                availableBaseLayers={availableBaseLayers}
                activeBaseLayerId={activeBaseLayerId}
                onChangeBaseLayer={onChangeBaseLayer}
            />
            <Button
                onClick={onOpenStreetView}
                variant="outline"
                size="icon"
                className="h-8 w-8 flex-shrink-0 bg-black/20 hover:bg-black/40 border border-white/30 text-white/90"
                title="Abrir Google Street View en la ubicación actual"
            >
                <StreetViewIcon className="h-5 w-5" />
            </Button>
        </div>

        <BaseLayerControls settings={baseLayerSettings} onChange={onBaseLayerSettingsChange} />
        
        <Separator className="bg-white/15" />

        <div>
          <h3 className="text-xs font-semibold text-white/90 mb-1.5 flex items-center">
            <ImageUp className="h-3.5 w-3.5 mr-1.5 text-primary/80" /> 
            Sentinel-2
          </h3>
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => onFindSentinel2Footprints()} 
              className="h-8 w-8 p-0 flex items-center justify-center bg-black/20 hover:bg-black/40 border border-white/30 text-white/90"
              disabled={isFindingSentinelFootprints}
              title={isFindingSentinelFootprints ? "Buscando..." : "Buscar footprints de escenas Sentinel-2 en la vista actual del mapa"}
            >
              {isFindingSentinelFootprints ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
            <Button 
              onClick={onClearSentinel2Footprints} 
              variant="destructive"
              className="h-8 w-8 p-0 flex items-center justify-center bg-red-700/30 hover:bg-red-600/50 border border-red-500/50 text-white/90"
              title="Limpiar los footprints de Sentinel-2 del mapa"
            >
              <ImageOff className="h-4 w-4" /> 
            </Button>
          </div>
           <p className="text-xs text-gray-400/70 mt-1">Busca footprints de Sentinel-2 L2A. Puede requerir paciencia.</p>
        </div>

        <Separator className="bg-white/15" />

        <div>
          <h3 className="text-xs font-semibold text-white/90 mb-1.5 flex items-center">
            <ImageUp className="h-3.5 w-3.5 mr-1.5 text-yellow-400/80" /> 
            Landsat
          </h3>
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => onFindLandsatFootprints()} 
              className="h-8 w-8 p-0 flex items-center justify-center bg-black/20 hover:bg-black/40 border border-white/30 text-white/90"
              disabled={isFindingLandsatFootprints}
              title={isFindingLandsatFootprints ? "Buscando..." : "Buscar footprints de escenas Landsat en la vista actual del mapa"}
            >
              {isFindingLandsatFootprints ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
            <Button 
              onClick={onClearLandsatFootprints} 
              variant="destructive"
              className="h-8 w-8 p-0 flex items-center justify-center bg-red-700/30 hover:bg-red-600/50 border border-red-500/50 text-white/90"
              title="Limpiar los footprints de Landsat del mapa"
            >
              <ImageOff className="h-4 w-4" /> 
            </Button>
          </div>
           <p className="text-xs text-gray-400/70 mt-1">Busca footprints de Landsat C2 L2. Puede requerir paciencia.</p>
        </div>
      </div>
    </DraggablePanel>
  );
};

export default LayersPanel;
