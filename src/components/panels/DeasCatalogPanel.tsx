
"use client";

import React, { useMemo } from 'react';
import DraggablePanel from './DraggablePanel';
import DeasLayerTree from '../geoserver-connection/DeasLayerTree';
import type { GeoServerDiscoveredLayer } from '@/lib/types';
import { Server } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DeasCatalogPanelProps {
    panelRef: React.RefObject<HTMLDivElement>;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    onClosePanel: () => void;
    onMouseDownHeader: (e: React.MouseEvent<HTMLDivElement>) => void;
    discoveredLayers: GeoServerDiscoveredLayer[];
    onLayerToggle: (layer: GeoServerDiscoveredLayer, isVisible: boolean) => void;
    style?: React.CSSProperties;
}

const DeasCatalogPanel: React.FC<DeasCatalogPanelProps> = ({
    panelRef,
    isCollapsed,
    onToggleCollapse,
    onClosePanel,
    onMouseDownHeader,
    discoveredLayers,
    onLayerToggle,
    style,
}) => {
    const groupedLayers = useMemo(() => {
        return discoveredLayers.reduce<Record<string, GeoServerDiscoveredLayer[]>>((acc, layer) => {
            const [workspace, ...rest] = layer.name.split(':');
            if (!acc[workspace]) {
                acc[workspace] = [];
            }
            // Use the layer title provided by GeoServer, fall back to name part if empty
            const layerTitle = layer.title || rest.join(':').replace(/_/g, ' ') || workspace;
            acc[workspace].push({ ...layer, title: layerTitle });
            return acc;
        }, {});
    }, [discoveredLayers]);

    // Sort workspaces alphabetically
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
                     <DeasLayerTree
                        groupedLayers={sortedGroupedLayers}
                        onLayerToggle={onLayerToggle}
                    />
                ) : (
                    <p className="p-4 text-center text-xs text-gray-400">Cargando capas de DEAS...</p>
                )}
            </ScrollArea>
        </DraggablePanel>
    );
};

export default DeasCatalogPanel;
