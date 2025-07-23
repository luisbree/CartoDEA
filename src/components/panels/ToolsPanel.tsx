
"use client";

import React, { useState } from 'react';
import DraggablePanel from './DraggablePanel';
import DrawingToolbar from '@/components/drawing-tools/DrawingToolbar';
import OSMCategorySelector from '@/components/osm-integration/OSMCategorySelector';
import OSMDownloadOptions from '@/components/osm-integration/OSMDownloadOptions';
import { Wrench, Map as MapIcon, Search } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from '@/components/ui/separator';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

interface OSMCategory {
  id: string;
  name: string;
}

interface ToolsPanelProps {
  panelRef: React.RefObject<HTMLDivElement>;
  // position: { x: number; y: number }; // Removed, controlled by style
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onClosePanel: () => void; 
  onMouseDownHeader: (e: React.MouseEvent<HTMLDivElement>) => void;

  // Drawing props
  activeDrawTool: string | null;
  onToggleDrawingTool: (toolType: 'Polygon' | 'LineString' | 'Point' | 'Rectangle' | 'FreehandPolygon') => void;
  onClearDrawnFeatures: () => void;
  onSaveDrawnFeaturesAsKML: () => void;

  // OSM props
  isFetchingOSM: boolean;
  onFetchOSMDataTrigger: () => void;
  onFetchCustomOSMData: (key: string, value: string) => void;
  osmCategoriesForSelection: OSMCategory[];
  selectedOSMCategoryIds: string[];
  onSelectedOSMCategoriesChange: (ids: string[]) => void;
  isDownloading: boolean;
  onDownloadOSMLayers: () => void;
  style?: React.CSSProperties; // Added for position and zIndex
}

const SectionHeader: React.FC<{ title: string; description?: string; icon: React.ElementType }> = ({ title, description, icon: Icon }) => (
  <div className="flex items-center w-full">
    <Icon className="mr-2 h-4 w-4 text-primary" />
    <div className="flex-1 text-left">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {description && <p className="text-xs text-gray-300/80">{description}</p>}
    </div>
  </div>
);

const ToolsPanel: React.FC<ToolsPanelProps> = ({
  panelRef, /*position,*/ isCollapsed, onToggleCollapse, onClosePanel, onMouseDownHeader,
  activeDrawTool, onToggleDrawingTool, onClearDrawnFeatures, onSaveDrawnFeaturesAsKML,
  isFetchingOSM, onFetchOSMDataTrigger, onFetchCustomOSMData, osmCategoriesForSelection, selectedOSMCategoryIds, 
  onSelectedOSMCategoriesChange,
  isDownloading, onDownloadOSMLayers,
  style, // Destructure style
}) => {

  const [activeAccordionItem, setActiveAccordionItem] = React.useState<string | undefined>('openstreetmap-section');
  const [customKey, setCustomKey] = useState('');
  const [customValue, setCustomValue] = useState('');

  const handleCustomSearch = () => {
    if (customKey.trim()) {
      onFetchCustomOSMData(customKey.trim(), customValue.trim());
    }
  };

  return (
    <DraggablePanel
      title="Herramientas"
      icon={Wrench}
      panelRef={panelRef}
      initialPosition={{ x:0, y:0 }} // initialPosition is less relevant now
      onMouseDownHeader={onMouseDownHeader}
      isCollapsed={isCollapsed}
      onToggleCollapse={onToggleCollapse}
      onClose={onClosePanel} 
      showCloseButton={true} 
      style={style} // Pass the style from parent (includes top, left, zIndex)
      zIndex={style?.zIndex as number | undefined} // Pass zIndex explicitly
    >
        <div className="w-full bg-white/5 rounded-md p-2">
            <DrawingToolbar
                activeDrawTool={activeDrawTool}
                onToggleDrawingTool={onToggleDrawingTool}
                onClearDrawnFeatures={onClearDrawnFeatures}
                onSaveDrawnFeaturesAsKML={onSaveDrawnFeaturesAsKML}
            />
        </div>

        <Separator className="my-2 bg-white/10" />

        <Accordion
          type="single"
          collapsible
          value={activeAccordionItem}
          onValueChange={setActiveAccordionItem}
          className="w-full space-y-1"
        >
            <AccordionItem value="openstreetmap-section" className="border-b-0 bg-white/5 rounded-md">
              <AccordionTrigger className="p-3 hover:no-underline hover:bg-white/10 rounded-t-md data-[state=open]:rounded-b-none">
                <SectionHeader
                  title="OpenStreetMap"
                  icon={MapIcon}
                />
              </AccordionTrigger>
              <AccordionContent className="p-3 pt-2 space-y-3 border-t border-white/10 bg-transparent rounded-b-md">
                <OSMCategorySelector
                    osmCategoriesForSelection={osmCategoriesForSelection}
                    selectedOSMCategoryIds={selectedOSMCategoryIds}
                    onSelectedOSMCategoriesChange={onSelectedOSMCategoriesChange} 
                />
                <OSMDownloadOptions
                    isFetchingOSM={isFetchingOSM}
                    onFetchOSMDataTrigger={onFetchOSMDataTrigger}
                    isDownloading={isDownloading}
                    onDownloadOSMLayers={onDownloadOSMLayers}
                />
                <Separator className="my-2 bg-white/10" />
                 <div className="space-y-3">
                    <p className="text-xs text-gray-300/80">Busque por clave/valor. Use comas en "Valor" para una consulta OR.</p>
                    <div className="flex gap-2">
                      <div className="flex-1 space-y-1">
                          <Label htmlFor="osm-key" className="text-xs text-white/90">Clave (Key)</Label>
                          <Input id="osm-key" value={customKey} onChange={e => setCustomKey(e.target.value)} placeholder="amenity" className="h-8 text-xs bg-black/20" />
                      </div>
                      <div className="flex-1 space-y-1">
                          <Label htmlFor="osm-value" className="text-xs text-white/90">Valor (Value)</Label>
                          <Input id="osm-value" value={customValue} onChange={e => setCustomValue(e.target.value)} placeholder="hospital,clinic" className="h-8 text-xs bg-black/20" />
                      </div>
                    </div>
                    <Button onClick={handleCustomSearch} disabled={!customKey.trim() || isFetchingOSM} className="w-full h-9">
                        <Search className="mr-2 h-4 w-4" />
                        Buscar y Añadir Capa Personalizada
                    </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
        </Accordion>
    </DraggablePanel>
  );
};

export default ToolsPanel;
