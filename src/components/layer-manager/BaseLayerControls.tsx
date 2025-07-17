
"use client";

import React from 'react';
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { BaseLayerSettings } from '@/lib/types';

interface BaseLayerControlsProps {
  settings: BaseLayerSettings;
  onChange: (newSettings: Partial<BaseLayerSettings>) => void;
}

const BaseLayerControls: React.FC<BaseLayerControlsProps> = ({ settings, onChange }) => {
  return (
    <div className="p-2 bg-white/5 rounded-md space-y-3">
        <Separator className="bg-white/15" />
        <div>
            <Label htmlFor="opacity-slider" className="text-xs font-medium text-white/90 mb-1 block">Opacidad: {Math.round(settings.opacity * 100)}%</Label>
            <Slider
                id="opacity-slider"
                min={0}
                max={100}
                step={1}
                value={[settings.opacity * 100]}
                onValueChange={(value) => onChange({ opacity: value[0] / 100 })}
            />
        </div>
        <div>
            <Label htmlFor="brightness-slider" className="text-xs font-medium text-white/90 mb-1 block">Brillo: {settings.brightness}%</Label>
            <Slider
                id="brightness-slider"
                min={0}
                max={200}
                step={1}
                value={[settings.brightness]}
                onValueChange={(value) => onChange({ brightness: value[0] })}
            />
        </div>
        <div>
            <Label htmlFor="contrast-slider" className="text-xs font-medium text-white/90 mb-1 block">Contraste: {settings.contrast}%</Label>
            <Slider
                id="contrast-slider"
                min={0}
                max={200}
                step={1}
                value={[settings.contrast]}
                onValueChange={(value) => onChange({ contrast: value[0] })}
            />
        </div>
    </div>
  );
};

export default BaseLayerControls;
