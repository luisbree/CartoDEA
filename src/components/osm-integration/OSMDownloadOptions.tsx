
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, CloudDownload, Download } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface OSMDownloadOptionsProps {
  isFetchingOSM: boolean;
  onFetchOSMDataTrigger: () => void;
  // isActiveDrawToolPresent prop removed as it's no longer used

  downloadFormat: string;
  onDownloadFormatChange: (format: string) => void;
  isDownloading: boolean;
  onDownloadOSMLayers: () => void;
  uniqueIdPrefix?: string;
}

const OSMDownloadOptions: React.FC<OSMDownloadOptionsProps> = ({
  isFetchingOSM,
  onFetchOSMDataTrigger,
  downloadFormat, // downloadFormat prop is kept as it might be used for display or other logic if needed
  onDownloadFormatChange,
  isDownloading,
  onDownloadOSMLayers,
  uniqueIdPrefix = "osmdownload"
}) => {

  const handleDownloadWithFormat = (format: string) => {
    onDownloadFormatChange(format); // Set the format
    onDownloadOSMLayers(); // Then trigger download
  };

  const getFetchButtonTooltipContent = () => {
    if (isFetchingOSM) return "Cargando...";
    // if (isActiveDrawToolPresent) return "Detenga la herramienta de dibujo para obtener datos OSM.";
    return "Obtener Datos OSM para la entidad dibujada más reciente.";
  };

  const getDownloadButtonTooltipContent = () => {
    if (isDownloading) return "Descargando...";
    // if (isActiveDrawToolPresent) return "Detenga la herramienta de dibujo para descargar capas OSM.";
    return "Descargar capas OSM cargadas en el formato seleccionado.";
  };

  const iconButtonBaseClass = "h-8 w-8 p-0 flex items-center justify-center focus-visible:ring-primary";
  const buttonActiveFetchingClass = "bg-primary/70 hover:bg-primary/90 text-primary-foreground animate-pulse";
  const buttonDefaultClass = "border border-white/30 text-white/90 bg-black/20 hover:bg-black/40";
  const buttonDisabledClass = "opacity-50 cursor-not-allowed";


  return (
      <div className="flex items-center gap-1">
            <Button
              onClick={onFetchOSMDataTrigger}
              className={`${iconButtonBaseClass} ${
                isFetchingOSM ? buttonActiveFetchingClass : buttonDefaultClass
              } ${isFetchingOSM ? buttonDisabledClass : ""}`}
              disabled={isFetchingOSM}
              aria-label={getFetchButtonTooltipContent()}
              title={getFetchButtonTooltipContent()}
            >
              {isFetchingOSM ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudDownload className="h-4 w-4" />}
            </Button>

        <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className={`${iconButtonBaseClass} ${
                    isDownloading ? buttonActiveFetchingClass : buttonDefaultClass
                  } ${isDownloading ? buttonDisabledClass : ""}`}
                  disabled={isDownloading}
                  aria-label={getDownloadButtonTooltipContent()}
                  title={getDownloadButtonTooltipContent()}
                >
                  {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                </Button>
              </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-gray-700 text-white border-gray-600 w-[180px]">
            <DropdownMenuItem
              className="text-xs hover:bg-gray-600 focus:bg-gray-600 cursor-pointer"
              onSelect={() => handleDownloadWithFormat('geojson')}
            >
              Como GeoJSON
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs hover:bg-gray-600 focus:bg-gray-600 cursor-pointer"
              onSelect={() => handleDownloadWithFormat('kml')}
            >
              Como KML
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs hover:bg-gray-600 focus:bg-gray-600 cursor-pointer"
              onSelect={() => handleDownloadWithFormat('shp')}
            >
              Como Shapefile (ZIP)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
  );
};

export default OSMDownloadOptions;
