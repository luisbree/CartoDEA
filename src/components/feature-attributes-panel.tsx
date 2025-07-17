
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import DraggablePanel from './panels/DraggablePanel'; // Updated path
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ListChecks } from 'lucide-react'; // Added ListChecks for icon

interface AttributesPanelProps {
  featuresAttributes: Record<string, any>[] | null;
  layerName?: string | null;
  
  panelRef: React.RefObject<HTMLDivElement>;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onClosePanel: () => void;
  onMouseDownHeader: (e: React.MouseEvent<HTMLDivElement>) => void;
  style?: React.CSSProperties;
}

const ITEMS_PER_PAGE = 50;

const AttributesPanelComponent: React.FC<AttributesPanelProps> = ({ // Renamed component function
  featuresAttributes,
  layerName,
  panelRef,
  isCollapsed,
  onToggleCollapse,
  onClosePanel,
  onMouseDownHeader,
  style,
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (featuresAttributes && featuresAttributes.length > 0) {
      setCurrentPage(1);
    }
  }, [featuresAttributes]);

  if (!featuresAttributes || featuresAttributes.length === 0) {
    // If panel is not minimized but has no data, show a message.
    // Visibility (minimization) is handled by GeoMapperClient.
    return (
       <DraggablePanel
        title="Atributos"
        icon={ListChecks}
        panelRef={panelRef}
        initialPosition={{ x:0, y:0}} // Position controlled by useFloatingPanels
        onMouseDownHeader={onMouseDownHeader}
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
        onClose={onClosePanel}
        showCloseButton={true}
        style={style}
        zIndex={style?.zIndex as number | undefined}
      >
        <div className="p-3 text-sm text-gray-300 text-center">
          No hay atributos para mostrar. Haga clic en una entidad en el mapa con la herramienta de inspección activa.
        </div>
      </DraggablePanel>
    );
  }

  const totalPages = Math.ceil(featuresAttributes.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentVisibleFeatures = featuresAttributes.slice(startIndex, endIndex);

  const allKeys = Array.from(
    new Set(currentVisibleFeatures.flatMap(attrs => Object.keys(attrs)))
  ).sort();

  const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

  const panelTitle = layerName 
    ? `${layerName} (${featuresAttributes.length})` 
    : `Atributos (${featuresAttributes.length})`;

  return (
    <DraggablePanel
      title={panelTitle}
      icon={ListChecks}
      panelRef={panelRef}
      initialPosition={{ x:0, y:0}} // Position controlled by useFloatingPanels
      onMouseDownHeader={onMouseDownHeader}
      isCollapsed={isCollapsed}
      onToggleCollapse={onToggleCollapse}
      onClose={onClosePanel}
      initialSize={{ width: 450, height: 350 }}
      minSize={{ width: 300, height: 250 }}
      style={style}
      overflowX="auto" 
      overflowY="auto"
      zIndex={style?.zIndex as number | undefined}
    >
      <div className="flex-grow flex flex-col h-full">
          {allKeys.length > 0 && currentVisibleFeatures.length > 0 ? (
            <div className="overflow-x-auto flex-grow min-w-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-gray-800/70">
                    {allKeys.map(key => (
                      <TableHead
                        key={key}
                        className="px-3 py-2 text-xs font-medium text-gray-300 whitespace-nowrap bg-gray-700/50"
                      >
                        {key}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentVisibleFeatures.map((attrs, idx) => (
                    <TableRow key={`${currentPage}-${startIndex + idx}`} className="hover:bg-gray-700/30">
                      {allKeys.map(key => (
                        <TableCell
                          key={key}
                          className="px-3 py-1.5 text-xs text-slate-200 dark:text-slate-200 border-b border-gray-700/50 whitespace-normal break-words"
                        >
                          {String(attrs[key] === null || attrs[key] === undefined ? '' : attrs[key])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex-grow flex items-center justify-center p-3">
                <p className="text-sm text-center text-gray-300">
                {featuresAttributes.length > 0
                    ? 'No hay atributos para mostrar para la selección actual.'
                    : 'No se encontraron atributos para las entidades seleccionadas.'}
                </p>
            </div>
          )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center p-2 border-t border-gray-700/50 bg-gray-800/50 mt-auto shrink-0 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="text-xs h-7 bg-gray-600/70 hover:bg-gray-500/70 border-gray-500 text-white"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              Anterior
            </Button>
            <span className="text-xs text-gray-300 whitespace-nowrap">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="text-xs h-7 bg-gray-600/70 hover:bg-gray-500/70 border-gray-500 text-white"
            >
              Siguiente
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </DraggablePanel>
  );
};

export default AttributesPanelComponent; // Renamed export
