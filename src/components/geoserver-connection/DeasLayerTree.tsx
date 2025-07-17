
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
import type { GeoServerDiscoveredLayer } from '@/lib/types';

interface DeasLayerTreeProps {
  groupedLayers: Record<string, GeoServerDiscoveredLayer[]>;
  onLayerToggle: (layer: GeoServerDiscoveredLayer, isVisible: boolean) => void;
}

const DeasLayerTree: React.FC<DeasLayerTreeProps> = ({ groupedLayers, onLayerToggle }) => {
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
                  <Checkbox
                    id={layer.name}
                    checked={layer.wmsAddedToMap}
                    onCheckedChange={(checked) => onLayerToggle(layer, !!checked)}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary border-muted-foreground/70"
                  />
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
