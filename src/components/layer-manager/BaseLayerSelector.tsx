
"use client";

import React from 'react';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BaseLayerOptionForSelect } from '@/lib/types';

interface BaseLayerSelectorProps {
  availableBaseLayers: BaseLayerOptionForSelect[];
  activeBaseLayerId: string;
  onChangeBaseLayer: (id: string) => void;
  uniqueIdPrefix?: string;
}

const BaseLayerSelector: React.FC<BaseLayerSelectorProps> = ({
  availableBaseLayers,
  activeBaseLayerId,
  onChangeBaseLayer,
  uniqueIdPrefix = "baselayer"
}) => {
  return (
    <div className="flex-grow">
      {/* <Label htmlFor={`${uniqueIdPrefix}-select`} className="text-xs font-medium text-white/90 mb-1 block">Capa Base</Label> */}
      <Select value={activeBaseLayerId} onValueChange={onChangeBaseLayer}>
        <SelectTrigger id={`${uniqueIdPrefix}-select`} className="w-full text-xs h-8 border-white/30 bg-black/20 text-white/90 focus:ring-primary">
          <SelectValue placeholder="Seleccionar capa base" />
        </SelectTrigger>
        <SelectContent className="bg-gray-700 text-white border-gray-600">
          {availableBaseLayers.map(bl => (
            <SelectItem key={bl.id} value={bl.id} className="text-xs hover:bg-gray-600 focus:bg-gray-600">{bl.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default BaseLayerSelector;
