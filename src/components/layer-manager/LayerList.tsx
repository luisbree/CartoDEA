
"use client";

import React, { useRef, useState } from 'react';
import LayerItem from './LayerItem';
import type { MapLayer } from '@/lib/types';
import { Layers } from 'lucide-react';

interface LayerListProps {
  layers: MapLayer[];
  onToggleVisibility: (layerId: string) => void;
  onZoomToExtent: (layerId: string) => void; 
  onShowLayerTable: (layerId: string) => void;
  onRemoveLayer: (layerId: string) => void;
  onExtractByPolygon: (layerId: string) => void;
  onExtractBySelection: () => void;
  onExportSelection: (format: 'geojson' | 'kml') => void;
  isDrawingSourceEmptyOrNotPolygon: boolean;
  isSelectionEmpty: boolean;
  onSetLayerOpacity: (layerId: string, opacity: number) => void;
  onReorderLayers?: (draggedIds: string[], targetId: string | null) => void;

  // Selection props
  selectedLayerIds: string[];
  onLayerClick: (index: number, event: React.MouseEvent<HTMLLIElement>) => void;
}

const LayerList: React.FC<LayerListProps> = ({
  layers,
  onToggleVisibility,
  onZoomToExtent, 
  onShowLayerTable,
  onRemoveLayer,
  onExtractByPolygon,
  onExtractBySelection,
  onExportSelection,
  isDrawingSourceEmptyOrNotPolygon,
  isSelectionEmpty,
  onSetLayerOpacity,
  onReorderLayers,
  selectedLayerIds,
  onLayerClick,
}) => {
  const dragItemIndex = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLLIElement>, index: number) => {
      if (layers[index].isDeas) {
          e.preventDefault();
          return;
      }
      dragItemIndex.current = index;
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnter = (e: React.DragEvent<HTMLLIElement>, index: number) => {
      e.preventDefault();
      if (layers[index].isDeas) {
          setDragOverIndex(null);
          return;
      }
      setDragOverIndex(index);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLLIElement>) => {
      e.preventDefault();
      setDragOverIndex(null);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLLIElement>, dropIndex: number) => {
    e.preventDefault();
    if (dragItemIndex.current === null || !onReorderLayers) return;

    const draggedItem = layers[dragItemIndex.current];
    const dropTargetItem = layers[dropIndex];
    
    // Prevent dropping on DEAS layers
    if (dropTargetItem.isDeas) {
        dragItemIndex.current = null;
        setDragOverIndex(null);
        return;
    }
    
    const isMultiDrag = selectedLayerIds.includes(draggedItem.id);
    const draggedIds = isMultiDrag ? selectedLayerIds : [draggedItem.id];

    // Prevent dropping a selection onto one of its own members
    if (draggedIds.includes(dropTargetItem.id)) {
        dragItemIndex.current = null;
        setDragOverIndex(null);
        return;
    }
    
    onReorderLayers(draggedIds, dropTargetItem.id);
  
    dragItemIndex.current = null;
    setDragOverIndex(null);
  };
  
  const handleDragEnd = (e: React.DragEvent<HTMLLIElement>) => {
      e.preventDefault();
      dragItemIndex.current = null;
      setDragOverIndex(null);
  };

  if (layers.length === 0) {
    return (
      <div className="text-center py-6 px-3">
        <Layers className="mx-auto h-10 w-10 text-gray-400/40" />
        <p className="mt-1.5 text-xs text-gray-300/90">No hay capas cargadas.</p>
        <p className="text-xs text-gray-400/70">Use el botón "Importar" para añadir.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-1.5">
      {layers.map((layer, index) => (
        <LayerItem
          key={layer.id}
          layer={layer}
          onToggleVisibility={onToggleVisibility}
          onZoomToExtent={onZoomToExtent}
          onShowLayerTable={onShowLayerTable}
          onRemove={onRemoveLayer}
          onExtractByPolygon={onExtractByPolygon}
          onExtractBySelection={onExtractBySelection}
          onExportSelection={onExportSelection}
          isDrawingSourceEmptyOrNotPolygon={isDrawingSourceEmptyOrNotPolygon}
          isSelectionEmpty={isSelectionEmpty}
          onSetLayerOpacity={onSetLayerOpacity}
          isDraggable={!layer.isDeas}
          onDragStart={(e) => handleDragStart(e, index)}
          onDragEnter={(e) => handleDragEnter(e, index)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, index)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => e.preventDefault()}
          isDragging={dragItemIndex.current === index}
          isDragOver={dragOverIndex === index}
          isSelected={selectedLayerIds.includes(layer.id)}
          onClick={(e) => onLayerClick(index, e)}
        />
      ))}
    </ul>
  );
};

export default LayerList;
