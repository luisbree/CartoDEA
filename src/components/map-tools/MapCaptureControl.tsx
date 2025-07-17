
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Camera, Loader2 } from 'lucide-react';

interface MapCaptureControlProps {
  onCapture: (outputType: 'jpeg-full' | 'jpeg-red' | 'jpeg-green' | 'jpeg-blue') => void;
  isCapturing: boolean;
}

const MapCaptureControl: React.FC<MapCaptureControlProps> = ({ onCapture, isCapturing }) => {
  const iconButtonBaseClass = "h-8 w-8 p-0 flex items-center justify-center focus-visible:ring-primary";
  const buttonDefaultClass = "border border-white/30 text-white/90 bg-black/20 hover:bg-black/40";
  const buttonDisabledClass = "opacity-50 cursor-not-allowed";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={`${iconButtonBaseClass} ${buttonDefaultClass} ${isCapturing ? buttonDisabledClass : ""}`}
          disabled={isCapturing}
          title="Opciones de Captura de Mapa (ESRI Satelital)"
        >
          {isCapturing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-gray-700 text-white border-gray-600 w-[220px]">
        <DropdownMenuItem
          className="text-xs hover:bg-gray-600 focus:bg-gray-600 cursor-pointer"
          onSelect={() => onCapture('jpeg-full')}
          disabled={isCapturing}
        >
          Descargar JPG Completo
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-xs hover:bg-gray-600 focus:bg-gray-600 cursor-pointer"
          onSelect={() => onCapture('jpeg-red')}
          disabled={isCapturing}
        >
          Descargar Banda Roja (JPG)
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-xs hover:bg-gray-600 focus:bg-gray-600 cursor-pointer"
          onSelect={() => onCapture('jpeg-green')}
          disabled={isCapturing}
        >
          Descargar Banda Verde (JPG)
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-xs hover:bg-gray-600 focus:bg-gray-600 cursor-pointer"
          onSelect={() => onCapture('jpeg-blue')}
          disabled={isCapturing}
        >
          Descargar Banda Azul (JPG)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default MapCaptureControl;
