"use client";

import React, { useState } from 'react';
import DraggablePanel from './DraggablePanel';
import LayerList from '@/components/layer-manager/LayerList';
import FileUploadControl from '@/components/layer-manager/FileUploadControl';
import FeatureInteractionToolbar from '@/components/feature-inspection/FeatureInteractionToolbar';
import { Separator } from '@/components/ui/separator';
import type { MapLayer } from '@/lib/types';
import { ListTree, Trash2 } from 'lucide-react'; 
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


interface LegendPanelProps {
  panelRef: React.RefObject<HTMLDivElement>;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onClosePanel: () => void;
  onMouseDownHeader: (e: React.MouseEvent<HTMLDivElement>) => void;

  layers: MapLayer[];
  onToggleLayerVisibility: (layerId: string) => void;
  onRemoveLayer: (layerId: string) => void;
  onRemoveLayers: (layerIds: string[]) => void;
  onZoomToLayerExtent: (layerId: string) => void;
  onShowLayerTable: (layerId: string) => void;
  onExtractByPolygon: (layerId: string, onSuccess?: () => void) => void;
  onExtractBySelection: (onSuccess?: () => void) => void;
  onExportLayer: (layerId: string, format: 'geojson' | 'kml' | 'shp') => void;
  isDrawingSourceEmptyOrNotPolygon: boolean;
  isSelectionEmpty: boolean;
  onSetLayerOpacity: (layerId: string, opacity: number) => void; 
  onReorderLayers: (draggedIds: string[], targetId: string | null) => void;
  onRenameLayer: (layerId: string, newName: string) => void;


  onAddLayer: (layer: MapLayer) => void;

  isInteractionActive: boolean;
  onToggleInteraction: () => void;
  selectionMode: 'click' | 'box';
  onSetSelectionMode: (mode: 'click' | 'box') => void;
  onClearSelection: () => void;

  style?: React.CSSProperties;
}


const LegendPanel: React.FC<LegendPanelProps> = ({
  panelRef, isCollapsed, onToggleCollapse, onClosePanel, onMouseDownHeader,
  layers, onToggleLayerVisibility, onRemoveLayer, onRemoveLayers, onZoomToLayerExtent, onShowLayerTable,
  onExtractByPolygon, onExtractBySelection, onExportLayer, isDrawingSourceEmptyOrNotPolygon, isSelectionEmpty, onSetLayerOpacity, onReorderLayers, onRenameLayer,
  onAddLayer, 
  isInteractionActive, onToggleInteraction, selectionMode, onSetSelectionMode, onClearSelection,
  style,
}) => {
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>([]);
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);

  const handleLayerClick = (clickedIndex: number, event: React.MouseEvent<HTMLLIElement>) => {
    const clickedLayerId = layers[clickedIndex].id;

    if (event.ctrlKey || event.metaKey) { // Ctrl/Cmd click
      setSelectedLayerIds(prev =>
        prev.includes(clickedLayerId)
          ? prev.filter(id => id !== clickedLayerId) // Deselect if already selected
          : [...prev, clickedLayerId] // Select if not selected
      );
    } else if (event.shiftKey && lastClickedIndex !== null) { // Shift click
      const start = Math.min(lastClickedIndex, clickedIndex);
      const end = Math.max(lastClickedIndex, clickedIndex);
      const rangeIds = layers.slice(start, end + 1).map(l => l.id);
      setSelectedLayerIds(rangeIds);
    } else { // Normal click
      setSelectedLayerIds([clickedLayerId]);
    }
    setLastClickedIndex(clickedIndex);
  };
  
  const handleDeleteSelected = () => {
    if (selectedLayerIds.length > 0) {
      onRemoveLayers(selectedLayerIds);
      setSelectedLayerIds([]);
      setLastClickedIndex(null);
    }
  };

  const clearLayerSelection = () => {
    setSelectedLayerIds([]);
    setLastClickedIndex(null);
  };


  return (
    <DraggablePanel
      title="Capas"
      icon={ListTree} 
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
      <div className="space-y-2"> 
        <div className="flex items-center gap-1 p-1 bg-white/5 rounded-md"> 
          <FileUploadControl onAddLayer={onAddLayer} uniqueIdPrefix="legendpanel-upload" />
          <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div> {/* Wrapper for disabled button */}
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 bg-red-700/30 hover:bg-red-600/50 border border-red-500/50 text-white/90 disabled:opacity-50 disabled:bg-black/20 disabled:text-white/90 disabled:border-white/30"
                      onClick={handleDeleteSelected}
                      disabled={selectedLayerIds.length === 0}
                      aria-label="Eliminar capas seleccionadas"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-gray-700 text-white border-gray-600">
                  <p className="text-xs">Eliminar seleccionadas</p>
                </TooltipContent>
              </Tooltip>
          </TooltipProvider>
          <FeatureInteractionToolbar
            isInteractionActive={isInteractionActive}
            onToggleInteraction={onToggleInteraction}
            selectionMode={selectionMode}
            onSetSelectionMode={onSetSelectionMode}
            onClearSelection={onClearSelection}
          />
        </div>
        <Separator className="bg-white/10" /> 
        <LayerList
          layers={layers}
          onToggleVisibility={onToggleLayerVisibility}
          onZoomToExtent={onZoomToLayerExtent}
          onShowLayerTable={onShowLayerTable}
          onRemoveLayer={onRemoveLayer}
          onExtractByPolygon={(layerId) => onExtractByPolygon(layerId, clearLayerSelection)}
          onExtractBySelection={() => onExtractBySelection(clearLayerSelection)}
          onExportLayer={onExportLayer}
          isDrawingSourceEmptyOrNotPolygon={isDrawingSourceEmptyOrNotPolygon}
          isSelectionEmpty={isSelectionEmpty}
          onSetLayerOpacity={onSetLayerOpacity}
          onReorderLayers={onReorderLayers}
          onRenameLayer={onRenameLayer}
          selectedLayerIds={selectedLayerIds}
          onLayerClick={handleLayerClick}
        />
      </div>
    </DraggablePanel>
  );
};

export default LegendPanel;
