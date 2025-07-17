
"use client";

import React from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

interface OSMCategory {
  id: string;
  name: string;
}

interface OSMCategorySelectorProps {
  osmCategoriesForSelection: OSMCategory[];
  selectedOSMCategoryIds: string[];
  onSelectedOSMCategoriesChange: (ids: string[]) => void;
}

const OSMCategorySelector: React.FC<OSMCategorySelectorProps> = ({
  osmCategoriesForSelection,
  selectedOSMCategoryIds,
  onSelectedOSMCategoriesChange,
}) => {

  const handleOSMCategoryChange = (categoryId: string, checked: boolean) => {
    const newSelectedIds = checked
      ? [...selectedOSMCategoryIds, categoryId]
      : selectedOSMCategoryIds.filter(id => id !== categoryId);
    onSelectedOSMCategoriesChange(newSelectedIds);
  };

  return (
    <div>
      {/* <Label className="text-xs font-medium text-white/90 mb-1 block">Categorías OSM a Incluir</Label> */}
      <ScrollArea className="h-32 border border-white/10 p-2 rounded-md bg-black/10"> 
        <div className="space-y-1">
          {osmCategoriesForSelection.map(category => (
            <div key={category.id} className="flex items-center space-x-2 p-1 rounded-md hover:bg-white/5">
              <Checkbox
                id={`osm-cat-${category.id}`}
                checked={selectedOSMCategoryIds.includes(category.id)}
                onCheckedChange={(checked) => handleOSMCategoryChange(category.id, !!checked)}
                className="data-[state=checked]:bg-accent data-[state=checked]:border-accent-foreground border-muted-foreground/70"
              />
              <Label htmlFor={`osm-cat-${category.id}`} className="text-xs font-medium text-white/90 cursor-pointer">
                {category.name}
              </Label>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default OSMCategorySelector;
