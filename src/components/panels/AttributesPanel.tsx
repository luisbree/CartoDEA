"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import DraggablePanel from './DraggablePanel'; 
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ListChecks, Link as LinkIcon, ExternalLink, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type Feature from 'ol/Feature';
import type { Geometry } from 'ol/geom';


interface AttributesPanelProps {
  inspectedFeatures: Feature<Geometry>[] | null;
  layerName?: string | null;
  
  panelRef: React.RefObject<HTMLDivElement>;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onClosePanel: () => void; 
  onMouseDownHeader: (e: React.MouseEvent<HTMLDivElement>) => void;
  style?: React.CSSProperties;

  // Selection props
  selectedFeatureIds: string[];
  onFeatureSelect: (featureId: string, isCtrlOrMeta: boolean) => void;
}

const ITEMS_PER_PAGE = 50;

const AttributesPanel: React.FC<AttributesPanelProps> = ({
  inspectedFeatures,
  layerName,
  panelRef,
  isCollapsed,
  onToggleCollapse,
  onClosePanel, 
  onMouseDownHeader,
  style,
  selectedFeatureIds,
  onFeatureSelect,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null);


  useEffect(() => {
    if (inspectedFeatures && inspectedFeatures.length > 0) {
      setCurrentPage(1);
      setSortConfig(null); // Reset sort on new data
    }
  }, [inspectedFeatures]);

  const sortedFeatures = useMemo(() => {
    if (!inspectedFeatures) return null;
    let sortableItems = [...inspectedFeatures];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const valA = a.get(sortConfig.key);
        const valB = b.get(sortConfig.key);
        
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        
        let comparison = 0;
        if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB;
        } else {
          comparison = String(valA).localeCompare(String(valB));
        }
        
        return sortConfig.direction === 'ascending' ? comparison : -comparison;
      });
    }
    return sortableItems;
  }, [inspectedFeatures, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  
  const handleRowClick = useCallback((featureId: string, event: React.MouseEvent) => {
      onFeatureSelect(featureId, event.ctrlKey || event.metaKey);
  }, [onFeatureSelect]);

  const isValidUrl = (urlString: string): boolean => {
    try {
      new URL(urlString);
      return true;
    } catch (e) {
      return false;
    }
  };

  const hasFeatures = inspectedFeatures && inspectedFeatures.length > 0;
  const totalPages = Math.ceil((sortedFeatures?.length || 0) / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentVisibleFeatures = sortedFeatures?.slice(startIndex, endIndex) || [];

  const allKeys = useMemo(() => Array.from(
    new Set(currentVisibleFeatures.flatMap(feature => Object.keys(feature.getProperties())))
  )
  .filter(key => key !== 'description' && key !== 'gmlgeometry' && key !== 'geometry')
  .sort((a, b) => {
    const order = ['preview_url', 'browser_url']; 
    const aIsSpecial = order.includes(a);
    const bIsSpecial = order.includes(b);

    if (aIsSpecial && bIsSpecial) {
      return order.indexOf(a) - order.indexOf(b);
    }
    if (aIsSpecial) return 1;
    if (bIsSpecial) return -1;
    return a.localeCompare(b);
  }), [currentVisibleFeatures]);


  const panelTitle = layerName && hasFeatures
    ? `Atributos: ${layerName} (${inspectedFeatures.length})` 
    : 'Atributos';

  return (
    <DraggablePanel
      title={panelTitle}
      icon={ListChecks}
      panelRef={panelRef}
      initialPosition={{ x:0, y:0}} 
      onMouseDownHeader={onMouseDownHeader}
      isCollapsed={isCollapsed}
      onToggleCollapse={onToggleCollapse}
      onClose={onClosePanel} 
      showCloseButton={true}
      initialSize={{ width: 450, height: 350 }} 
      minSize={{ width: 300, height: 250 }}
      style={style} 
      overflowX="auto"
      overflowY="auto"
      zIndex={style?.zIndex as number | undefined}
    >
      <div className="flex-grow flex flex-col h-full"> 
          {hasFeatures && allKeys.length > 0 ? (
            <>
                <div className="flex-grow min-w-0"> 
                  <Table><TableHeader>
                      <TableRow className="hover:bg-gray-800/70">
                        {allKeys.map(key => (
                          <TableHead
                            key={key}
                            className="px-3 py-2 text-xs font-medium text-gray-300 whitespace-nowrap bg-gray-700/50 cursor-pointer hover:bg-gray-600/50"
                            onClick={() => requestSort(key)}
                          >
                            <div className="flex items-center gap-2">
                               {key === 'preview_url' ? 'Vista Previa' : key === 'browser_url' ? 'Navegador' : key}
                               {sortConfig?.key === key && (
                                   sortConfig.direction === 'ascending' 
                                       ? <ArrowUp className="h-3 w-3" /> 
                                       : <ArrowDown className="h-3 w-3" />
                               )}
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader><TableBody>
                      {currentVisibleFeatures.map((feature) => {
                        const featureId = feature.getId() as string;
                        const isSelected = selectedFeatureIds.includes(featureId);
                        const attrs = feature.getProperties();

                        return (
                          <TableRow 
                            key={featureId} 
                            data-state={isSelected ? "selected" : "unselected"}
                            className="cursor-pointer"
                            onClick={(e) => handleRowClick(featureId, e)}
                          >
                            {allKeys.map(key => (
                              <TableCell
                                key={key}
                                className="px-3 py-1.5 text-xs text-slate-200 dark:text-slate-200 border-b border-gray-700/50 whitespace-normal break-words"
                              >
                                {key === 'preview_url' && attrs[key] && isValidUrl(String(attrs[key])) ? (
                                  <a
                                    href={String(attrs[key])}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:text-blue-300 underline flex items-center"
                                    title={`Abrir vista previa`}
                                    onClick={(e) => e.stopPropagation()} // Prevent row click from firing
                                  >
                                    <LinkIcon className="h-3 w-3 mr-1" />
                                    Abrir Vista
                                  </a>
                                ) : key === 'browser_url' && attrs[key] && isValidUrl(String(attrs[key])) ? (
                                  <a
                                    href={String(attrs[key])}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-green-400 hover:text-green-300 underline flex items-center"
                                    title={`Ver escena en el navegador de Copernicus`}
                                    onClick={(e) => e.stopPropagation()} // Prevent row click from firing
                                  >
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    Ver en Navegador
                                  </a>
                                ) : (
                                  String(attrs[key] === null || attrs[key] === undefined ? '' : attrs[key])
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                        )
                      })}
                    </TableBody></Table>
                </div>
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
            </>
          ) : (
            <div className="flex-grow flex items-center justify-center p-3">
                <p className="text-sm text-center text-gray-300">
                    Use la herramienta de inspección para ver los atributos de una entidad.
                </p>
            </div>
          )}
      </div>
    </DraggablePanel>
  );
};

export default AttributesPanel;
