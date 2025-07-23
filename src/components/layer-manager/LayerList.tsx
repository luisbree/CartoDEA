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
  onExportLayer: (layerId: string, format: 'geojson' | 'kml' | 'shp') => void;
  isDrawingSourceEmptyOrNotPolygon: boolean;
  isSelectionEmpty: boolean;
  onSetLayerOpacity: (layerId: string, opacity: number) => void;
  onReorderLayers?: (draggedIds: string[], targetId: string | null) => void;
  onRenameLayer: (layerId: string, newName: string) => void;

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
  onExportLayer,
  isDrawingSourceEmptyOrNotPolygon,
  isSelectionEmpty,
  onSetLayerOpacity,
  onReorderLayers,
  onRenameLayer,
  selectedLayerIds,
  onLayerClick,
}) => {
  const dragItemIndex = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLLIElement>, index: number) => {
      dragItemIndex.current = index;
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnter = (e: React.DragEvent<HTMLLIElement>, index: number) => {
      e.preventDefault();
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
    
    const isMultiDrag = selectedLayerIds.includes(draggedItem.id);
    const draggedIds = isMultiDrag ? selectedLayerIds : [draggedItem.id];

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
          onExportLayer={onExportLayer}
          onRenameLayer={onRenameLayer}
          isDrawingSourceEmptyOrNotPolygon={isDrawingSourceEmptyOrNotPolygon}
          isSelectionEmpty={isSelectionEmpty}
          onSetLayerOpacity={onSetLayerOpacity}
          isDraggable={true} // All layers are now draggable
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
