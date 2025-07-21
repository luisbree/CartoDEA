"use client";

import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from '@/components/ui/button';
import { Image as ImageIcon, Database } from 'lucide-react';
import type { GeoServerDiscoveredLayer } from '@/lib/types';

interface DeasLayerTreeProps {
  groupedLayers: Record<string, GeoServerDiscoveredLayer[]>;
  onLayerToggle: (layer: GeoServerDiscoveredLayer, isVisible: boolean) => void;
  onAddWfsLayer: (layer: GeoServerDiscoveredLayer) => void;
}

const DeasLayerTree: React.FC<DeasLayerTreeProps> = ({ groupedLayers, onLayerToggle, onAddWfsLayer }) => {
  const sortedWorkspaces = Object.keys(groupedLayers).sort((a, b) => a.localeCompare(b));

  return (
    <Accordion type="multiple" className="w-full">
      {sortedWorkspaces.map((workspace) => (
        <AccordionItem value={workspace} key={workspace} className="border-b border-gray-700/50">
          <AccordionTrigger className="p-2 text-xs font-semibold text-white/90 hover:no-underline hover:bg-gray-700/30 rounded-t-md">
            {workspace}
          </AccordionTrigger>
          <AccordionContent className="p-1 pl-4 bg-black/20">
            <div className="space-y-1">
              {groupedLayers[workspace].map((layer) => (
                <div key={layer.name} className="flex items-center space-x-2 p-1 rounded-md hover:bg-white/5">
                  <div className="flex items-center space-x-1">
                     <Button 
                       variant="outline" 
                       size="icon" 
                       className="h-6 w-6 p-0" 
                       title={`Añadir como capa de imagen (WMS)`}
                       onClick={() => onLayerToggle(layer, true)}
                       disabled={layer.wmsAddedToMap}
                      >
                       <ImageIcon className="h-3.5 w-3.5" />
                     </Button>
                     <Button 
                       variant="outline" 
                       size="icon" 
                       className="h-6 w-6 p-0"
                       title={`Añadir como capa de datos (WFS)`}
                       onClick={() => onAddWfsLayer(layer)}
                       disabled={layer.wfsAddedToMap}
                      >
                       <Database className="h-3.5 w-3.5" />
                     </Button>
                  </div>
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
  );
};

export default DeasLayerTree;
