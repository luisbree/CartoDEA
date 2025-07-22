"use client";

import React, { useMemo } from 'react';
import DraggablePanel from './DraggablePanel';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from '@/components/ui/button';
import { Server, Database } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import type { GeoServerDiscoveredLayer } from '@/lib/types';


interface DeasCatalogPanelProps {
    panelRef: React.RefObject<HTMLDivElement>;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    onClosePanel: () => void;
    onMouseDownHeader: (e: React.MouseEvent<HTMLDivElement>) => void;
    discoveredLayers: GeoServerDiscoveredLayer[];
    onAddWfsLayer: (layer: GeoServerDiscoveredLayer) => void;
    style?: React.CSSProperties;
}

const DeasCatalogPanel: React.FC<DeasCatalogPanelProps> = ({
    panelRef,
    isCollapsed,
    onToggleCollapse,
    onClosePanel,
    onMouseDownHeader,
    discoveredLayers,
    onAddWfsLayer,
    style,
}) => {
    const groupedLayers = useMemo(() => {
        return discoveredLayers.reduce<Record<string, GeoServerDiscoveredLayer[]>>((acc, layer) => {
            const [workspace, ...rest] = layer.name.split(':');
            if (!acc[workspace]) {
                acc[workspace] = [];
            }
            const layerTitle = layer.title || rest.join(':').replace(/_/g, ' ') || workspace;
            acc[workspace].push({ ...layer, title: layerTitle });
            return acc;
        }, {});
    }, [discoveredLayers]);

    const sortedWorkspaces = Object.keys(groupedLayers).sort((a, b) => a.localeCompare(b));

    const sortedGroupedLayers = sortedWorkspaces.reduce<Record<string, GeoServerDiscoveredLayer[]>>((acc, key) => {
        acc[key] = groupedLayers[key].sort((a,b) => a.title.localeCompare(b.title));
        return acc;
    }, {});


    return (
        <DraggablePanel
            title="Capas Predefinidas (DEAS)"
            icon={Server}
            panelRef={panelRef}
            initialPosition={{ x: 0, y: 0 }}
            onMouseDownHeader={onMouseDownHeader}
            isCollapsed={isCollapsed}
            onToggleCollapse={onToggleCollapse}
            onClose={onClosePanel}
            showCloseButton={true}
            style={style}
            zIndex={style?.zIndex as number | undefined}
            initialSize={{ width: 350, height: "80vh" }}
            minSize={{ width: 300, height: 200 }}
        >
            <ScrollArea className="h-full">
                {discoveredLayers.length > 0 ? (
                    <Accordion type="multiple" className="w-full">
                      {sortedWorkspaces.map((workspace) => (
                        <AccordionItem value={workspace} key={workspace} className="border-b border-gray-700/50">
                          <AccordionTrigger className="p-2 text-xs font-semibold text-white/90 hover:no-underline hover:bg-gray-700/30 rounded-t-md">
                            {workspace}
                          </AccordionTrigger>
                          <AccordionContent className="p-1 pl-4 bg-black/20">
                            <div className="space-y-1">
                              {sortedGroupedLayers[workspace].map((layer) => (
                                <div key={layer.name} className="flex items-center space-x-2 p-1 rounded-md hover:bg-white/5">
                                   <Button 
                                     variant="outline" 
                                     size="icon" 
                                     className="h-6 w-6 p-0"
                                     title={`Añadir capa de datos interactiva`}
                                     onClick={() => onAddWfsLayer(layer)}
                                     disabled={layer.wfsAddedToMap}
                                    >
                                     <Database className="h-3.5 w-3.5" />
                                   </Button>
                                  <Label
                                    htmlFor={layer.name}
                                    className="text-xs font-medium text-white/80 cursor-pointer flex-1 capitalize"
                                    title={layer.name}
                                  >
                                    {layer.title.toLowerCase()}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                ) : (
                    <p className="p-4 text-center text-xs text-gray-400">Cargando capas de DEAS...</p>
                )}
            </ScrollArea>
        </DraggablePanel>
    );
};

export default DeasCatalogPanel;
