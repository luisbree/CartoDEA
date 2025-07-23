"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger, 
  DropdownMenuPortal
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider"; 
import { Eye, EyeOff, Settings2, ZoomIn, Table2, Trash2, Scissors, Percent, GripVertical, CopyPlus, Download, Edit } from 'lucide-react';
import type { MapLayer } from '@/lib/types';
import VectorLayer from 'ol/layer/Vector'; 
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';


interface LayerItemProps {
  layer: MapLayer;
  onToggleVisibility: (layerId: string) => void;
  onZoomToExtent: (layerId: string) => void;
  onShowLayerTable: (layerId: string) => void;
  onRemove: (layerId: string) => void;
  onExtractByPolygon: (layerId: string) => void;
  onExtractBySelection: () => void;
  isDrawingSourceEmptyOrNotPolygon: boolean;
  isSelectionEmpty: boolean;
  onSetLayerOpacity: (layerId: string, opacity: number) => void;
  onExportLayer: (layerId: string, format: 'geojson' | 'kml' | 'shp') => void;
  onRenameLayer: (layerId: string, newName: string) => void;
  
  // Drag and Drop props
  isDraggable: boolean;
  onDragStart?: (e: React.DragEvent<HTMLLIElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLLIElement>) => void;
  onDragOver?: (e: React.DragEvent<HTMLLIElement>) => void;
  onDragEnter?: (e: React.DragEvent<HTMLLIElement>) => void;
  onDragLeave?: (e: React.DragEvent<HTMLLIElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLLIElement>) => void;
  isDragging?: boolean;
  isDragOver?: boolean;

  // Selection props
  isSelected?: boolean;
  onClick?: (event: React.MouseEvent<HTMLLIElement>) => void;
}

const LayerItem: React.FC<LayerItemProps> = ({
  layer,
  onToggleVisibility,
  onZoomToExtent,
  onShowLayerTable,
  onRemove,
  onExtractByPolygon,
  onExtractBySelection,
  isDrawingSourceEmptyOrNotPolygon,
  isSelectionEmpty,
  onSetLayerOpacity,
  onExportLayer,
  onRenameLayer,
  isDraggable,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  isDragging,
  isDragOver,
  isSelected,
  onClick,
}) => {
  const isVectorLayer = layer.olLayer instanceof VectorLayer;
  const currentOpacityPercentage = Math.round(layer.opacity * 100);

  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState(layer.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      // Use a timeout to ensure the input is rendered before focusing/selecting
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 0);
    }
  }, [isEditing]);
  
  const handleDoubleClick = () => {
    setIsEditing(true);
  };
  
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingName(e.target.value);
  };

  const handleNameSubmit = () => {
    if (editingName.trim() && editingName.trim() !== layer.name) {
      onRenameLayer(layer.id, editingName.trim());
    }
    setIsEditing(false);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNameSubmit();
    } else if (e.key === 'Escape') {
      setEditingName(layer.name);
      setIsEditing(false);
    }
  };

  const handleRenameSelect = (e: Event) => {
    e.preventDefault(); // Prevent the dropdown from closing
    setIsEditing(true);
  };


  return (
    <li 
      className={cn(
        "flex items-center px-1.5 py-1 transition-all overflow-hidden relative",
        "hover:bg-gray-700/30",
        isSelected ? "bg-primary/20 ring-1 ring-primary/70 rounded-md" : "",
        isDraggable && "cursor-grab",
        isDragging && "opacity-50 bg-primary/30",
        isDragOver && "border-t-2 border-accent"
      )}
      draggable={isDraggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClick}
    >
      <GripVertical className="h-4 w-4 text-gray-500 mr-1 flex-shrink-0 cursor-grab" />
      
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => { e.stopPropagation(); onToggleVisibility(layer.id); }}
        className="h-6 w-6 text-white hover:bg-gray-600/80 p-0 mr-2 flex-shrink-0"
        aria-label={`Alternar visibilidad para ${layer.name}`}
        title={layer.visible ? "Ocultar capa" : "Mostrar capa"}
      >
        {layer.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
      </Button>

      {isEditing ? (
         <Input
            ref={inputRef}
            type="text"
            value={editingName}
            onChange={handleNameChange}
            onBlur={handleNameSubmit}
            onKeyDown={handleKeyDown}
            className="h-6 text-xs p-1 bg-gray-900/80 border-primary focus-visible:ring-primary/50"
            onClick={(e) => e.stopPropagation()} // Prevent list item click handler from firing
          />
      ) : (
        <span
          className={cn(
            "flex-1 cursor-pointer text-xs font-medium truncate min-w-0 select-none",
            layer.visible ? "text-white" : "text-gray-400"
          )}
          title={layer.name}
          onDoubleClick={handleDoubleClick}
        >
          {layer.name}
        </span>
      )}
      <div className="flex items-center space-x-0.5 flex-shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-white hover:bg-gray-600/80 p-0"
              aria-label={`Acciones para ${layer.name}`}
              title="Más acciones"
              onClick={(e) => e.stopPropagation()}
            >
              <Settings2 className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" className="bg-gray-700 text-white border-gray-600 w-56">
             <DropdownMenuItem
              className="text-xs hover:bg-gray-600 focus:bg-gray-600 cursor-pointer"
              onSelect={handleRenameSelect}
            >
              <Edit className="mr-2 h-3.5 w-3.5" />
              Renombrar Capa
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs hover:bg-gray-600 focus:bg-gray-600 cursor-pointer"
              onSelect={() => onZoomToExtent(layer.id)}
            >
              <ZoomIn className="mr-2 h-3.5 w-3.5" />
              Ir a la extensión
            </DropdownMenuItem>

            {isVectorLayer && (
              <DropdownMenuItem
                className="text-xs hover:bg-gray-600 focus:bg-gray-600 cursor-pointer"
                onSelect={() => onShowLayerTable(layer.id)}
              >
                <Table2 className="mr-2 h-3.5 w-3.5" />
                Ver tabla de atributos
              </DropdownMenuItem>
            )}

            {isVectorLayer && (
               <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-xs hover:bg-gray-600 focus:bg-gray-600 cursor-pointer data-[state=open]:bg-gray-600">
                  <Download className="mr-2 h-3.5 w-3.5" />
                  <span>Exportar Capa</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="bg-gray-700 text-white border-gray-600">
                    <DropdownMenuItem onSelect={() => onExportLayer(layer.id, 'geojson')} className="text-xs hover:bg-gray-600 focus:bg-gray-600 cursor-pointer">GeoJSON</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onExportLayer(layer.id, 'kml')} className="text-xs hover:bg-gray-600 focus:bg-gray-600 cursor-pointer">KML</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onExportLayer(layer.id, 'shp')} className="text-xs hover:bg-gray-600 focus:bg-gray-600 cursor-pointer">Shapefile (.zip)</DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            )}

            <DropdownMenuSeparator className="bg-gray-500/50" />

            {isVectorLayer && (
              <>
                <DropdownMenuItem
                  className="text-xs hover:bg-gray-600 focus:bg-gray-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  onSelect={() => onExtractByPolygon(layer.id)}
                  disabled={isDrawingSourceEmptyOrNotPolygon}
                >
                  <Scissors className="mr-2 h-3.5 w-3.5" />
                  <span title={isDrawingSourceEmptyOrNotPolygon ? "Dibuje un polígono primero" : `Extraer de ${layer.name} por polígono`}>
                    Extraer por polígono
                  </span>
                </DropdownMenuItem>
            
                <DropdownMenuItem
                  className="text-xs hover:bg-gray-600 focus:bg-gray-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  onSelect={() => onExtractBySelection()}
                  disabled={isSelectionEmpty}
                >
                  <CopyPlus className="mr-2 h-3.5 w-3.5" />
                  <span title={isSelectionEmpty ? "Seleccione una o más entidades primero" : `Crear una nueva capa a partir de la selección actual`}>
                    Crear capa desde selección
                  </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-500/50" />
              </>
            )}
            
            <DropdownMenuLabel className="text-xs text-gray-300 px-2 py-1 flex items-center">
                <Percent className="mr-2 h-3.5 w-3.5" /> Opacidad: {currentOpacityPercentage}%
            </DropdownMenuLabel>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="focus:bg-transparent hover:bg-transparent cursor-default p-2">
                <Slider
                    defaultValue={[currentOpacityPercentage]}
                    max={100}
                    step={1}
                    onValueChange={(value) => onSetLayerOpacity(layer.id, value[0] / 100)}
                    className="w-full"
                    aria-label={`Opacidad para ${layer.name}`}
                />
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-500/50" />
            <DropdownMenuItem
              className="text-xs hover:bg-red-500/30 focus:bg-red-500/40 text-red-300 focus:text-red-200 cursor-pointer"
              onSelect={() => onRemove(layer.id)}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Eliminar capa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
};

export default LayerItem;
