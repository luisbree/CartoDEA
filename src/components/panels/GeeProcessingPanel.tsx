
"use client";

import React, { useState } from 'react';
import { addDays, format } from "date-fns";
import type { DateRange } from "react-day-picker";
import DraggablePanel from './DraggablePanel';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BrainCircuit, Loader2, Image as ImageIcon, CheckCircle, AlertTriangle, Calendar as CalendarIcon } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { getGeeTileLayer } from '@/ai/flows/gee-flow';
import type { Map } from 'ol';
import { transformExtent } from 'ol/proj';
import type { GeeTileLayerInput } from '@/ai/flows/gee-types';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';


interface GeeProcessingPanelProps {
  panelRef: React.RefObject<HTMLDivElement>;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onClosePanel: () => void;
  onMouseDownHeader: (e: React.MouseEvent<HTMLDivElement>) => void;
  onAddGeeLayer: (tileUrl: string, layerName: string) => void;
  mapRef: React.RefObject<Map | null>;
  isAuthenticating: boolean;
  isAuthenticated: boolean;
  style?: React.CSSProperties;
}

type BandCombination = GeeTileLayerInput['bandCombination'];

const GeeProcessingPanel: React.FC<GeeProcessingPanelProps> = ({
  panelRef,
  isCollapsed,
  onToggleCollapse,
  onClosePanel,
  onMouseDownHeader,
  onAddGeeLayer,
  mapRef,
  isAuthenticating,
  isAuthenticated,
  style,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedCombination, setSelectedCombination] = useState<BandCombination>('URBAN_FALSE_COLOR');
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -365),
    to: new Date(),
  });
  const [elevationRange, setElevationRange] = useState<[number, number]>([0, 150]);
  const { toast } = useToast();

  const handleGenerateLayer = async () => {
    if (!mapRef.current) {
        toast({ description: "El mapa no está listo.", variant: "destructive" });
        return;
    }
    if (!isAuthenticated) {
        toast({ description: "Debe autenticarse con GEE primero.", variant: "destructive" });
        return;
    }
    setIsGenerating(true);
    
    try {
        const view = mapRef.current.getView();
        const extent = view.calculateExtent(mapRef.current.getSize()!);
        const zoom = view.getZoom() || 2;
        
        const extent4326 = transformExtent(extent, view.getProjection(), 'EPSG:4326');

        const result = await getGeeTileLayer({
            aoi: {
                minLon: extent4326[0],
                minLat: extent4326[1],
                maxLon: extent4326[2],
                maxLat: extent4326[3],
            },
            zoom: zoom,
            bandCombination: selectedCombination,
            startDate: date?.from ? format(date.from, 'yyyy-MM-dd') : undefined,
            endDate: date?.to ? format(date.to, 'yyyy-MM-dd') : undefined,
            minElevation: selectedCombination === 'NASADEM_ELEVATION' ? elevationRange[0] : undefined,
            maxElevation: selectedCombination === 'NASADEM_ELEVATION' ? elevationRange[1] : undefined,
        });
        
        if (result && result.tileUrl) {
            let layerName;
            switch(selectedCombination) {
                case 'URBAN_FALSE_COLOR':
                    layerName = 'Sentinel-2 (Urbano) GEE';
                    break;
                case 'SWIR_FALSE_COLOR':
                    layerName = 'Sentinel-2 (SWIR) GEE';
                    break;
                case 'BSI':
                    layerName = 'Índice de Suelo Desnudo (BSI) GEE';
                    break;
                case 'NDVI':
                    layerName = 'Índice de Vegetación (NDVI) GEE';
                    break;
                case 'JRC_WATER_OCCURRENCE':
                    layerName = 'Agua Superficial (JRC)';
                    break;
                case 'OPENLANDMAP_SOC':
                    layerName = 'Carbono Org. del Suelo (OpenLandMap)';
                    break;
                case 'DYNAMIC_WORLD':
                    layerName = 'Dynamic World Land Cover';
                    break;
                case 'NASADEM_ELEVATION':
                    layerName = `NASADEM Elevación (${elevationRange[0]}-${elevationRange[1]}m)`;
                    break;
                default:
                    layerName = 'Capa GEE';
            }
            onAddGeeLayer(result.tileUrl, layerName);
        } else {
            throw new Error("La respuesta del servidor no contenía una URL de teselas.");
        }

    } catch (error: any) {
      console.error("Error generating GEE layer:", error);
      toast({
        title: "Error de GEE",
        description: error.message || "No se pudo generar la capa de Earth Engine.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getAuthStatusContent = () => {
    if (isAuthenticating) {
      return (
        <div className="flex items-center text-xs text-yellow-300">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Autenticando con Google Earth Engine...
        </div>
      );
    }
    if (isAuthenticated) {
      return (
        <div className="flex items-center text-xs text-green-400">
          <CheckCircle className="mr-2 h-4 w-4" />
          Autenticación con GEE exitosa.
        </div>
      );
    }
    return (
      <div className="flex items-center text-xs text-red-400">
        <AlertTriangle className="mr-2 h-4 w-4" />
        Fallo en la autenticación con GEE. Verifique la consola.
      </div>
    );
  };

  const isDateSelectionDisabled = ['JRC_WATER_OCCURRENCE', 'OPENLANDMAP_SOC', 'NASADEM_ELEVATION'].includes(selectedCombination);
  const showElevationControls = selectedCombination === 'NASADEM_ELEVATION';

  return (
    <DraggablePanel
      title="Procesamiento GEE"
      icon={BrainCircuit}
      panelRef={panelRef}
      initialPosition={{ x: 0, y: 0 }}
      onMouseDownHeader={onMouseDownHeader}
      isCollapsed={isCollapsed}
      onToggleCollapse={onToggleCollapse}
      onClose={onClosePanel}
      showCloseButton={true}
      style={style}
      zIndex={style?.zIndex as number | undefined}
      initialSize={{ width: 350, height: "auto" }}
    >
      <div className="bg-white/5 rounded-md p-3 space-y-3">
        <div className="p-2 rounded-md bg-black/20 text-center">
            {getAuthStatusContent()}
        </div>
        <div>
            <h3 className="text-sm font-semibold text-white mb-2">Composición de Bandas / Índices</h3>
            <RadioGroup defaultValue={selectedCombination} onValueChange={(value: BandCombination) => setSelectedCombination(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="URBAN_FALSE_COLOR" id="urban-combo" />
                <Label htmlFor="urban-combo" className="text-xs font-normal">Falso Color (Urbano - B8, B4, B3)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="SWIR_FALSE_COLOR" id="swir-combo" />
                <Label htmlFor="swir-combo" className="text-xs font-normal">Falso Color (SWIR - B12, B8A, B4)</Label>
              </div>
               <div className="flex items-center space-x-2">
                <RadioGroupItem value="BSI" id="bsi-combo" />
                <Label htmlFor="bsi-combo" className="text-xs font-normal">Índice de Suelo Desnudo (BSI)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="NDVI" id="ndvi-combo" />
                <Label htmlFor="ndvi-combo" className="text-xs font-normal">Índice de Vegetación (NDVI)</Label>
              </div>
               <div className="flex items-center space-x-2">
                <RadioGroupItem value="DYNAMIC_WORLD" id="dw-combo" />
                <Label htmlFor="dw-combo" className="text-xs font-normal">Cobertura del Suelo (Dynamic World)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="NASADEM_ELEVATION" id="nasadem-combo" />
                <Label htmlFor="nasadem-combo" className="text-xs font-normal">Modelo de Elevación (NASADEM)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="JRC_WATER_OCCURRENCE" id="jrc-combo" />
                <Label htmlFor="jrc-combo" className="text-xs font-normal">Agua Superficial (JRC)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="OPENLANDMAP_SOC" id="soc-combo" />
                <Label htmlFor="soc-combo" className="text-xs font-normal">Carbono Org. Suelo (OpenLandMap)</Label>
              </div>
            </RadioGroup>
        </div>

        {showElevationControls && (
          <div className="pt-2 border-t border-white/10 space-y-3">
              <Label className="text-sm font-semibold text-white">Controles de Elevación</Label>
              <div>
                  <Label htmlFor="min-elevation-slider" className="text-xs font-medium text-white/90 mb-1 block">Elevación Mínima: {elevationRange[0]} m</Label>
                  <Slider
                      id="min-elevation-slider"
                      min={-100}
                      max={5000}
                      step={1}
                      value={[elevationRange[0]]}
                      onValueChange={(value) => setElevationRange(prev => [value[0], Math.max(value[0], prev[1])])}
                  />
              </div>
              <div>
                  <Label htmlFor="max-elevation-slider" className="text-xs font-medium text-white/90 mb-1 block">Elevación Máxima: {elevationRange[1]} m</Label>
                  <Slider
                      id="max-elevation-slider"
                      min={-100}
                      max={8000}
                      step={1}
                      value={[elevationRange[1]]}
                      onValueChange={(value) => setElevationRange(prev => [Math.min(value[0], prev[0]), value[0]])}
                  />
              </div>
          </div>
        )}

        <div className="pt-2 border-t border-white/10">
          <Label className={cn("text-sm font-semibold text-white mb-2 block", isDateSelectionDisabled && "text-gray-500")}>
              Rango de Fechas (Sentinel-2 / Dynamic World)
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                disabled={isDateSelectionDisabled}
                className={cn(
                  "w-full justify-start text-left font-normal h-9 text-xs border-white/30 bg-black/20 text-white/90 focus:ring-primary",
                  !date && "text-muted-foreground",
                   isDateSelectionDisabled && "bg-gray-800/50 text-gray-500 border-gray-700 cursor-not-allowed"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "LLL dd, y")} -{" "}
                      {format(date.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(date.from, "LLL dd, y")
                  )
                ) : (
                  <span>Seleccionar rango</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-gray-700 text-white border-gray-600" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
                classNames={{
                    day_selected: "bg-primary text-primary-foreground hover:bg-primary/90",
                    day_today: "bg-accent/50 text-accent-foreground",
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="space-y-2 pt-2 border-t border-white/10">
          <Button 
             onClick={handleGenerateLayer} 
             disabled={isGenerating || isAuthenticating || !isAuthenticated || (isDateSelectionDisabled ? false : (!date?.from || !date?.to))} 
             className="w-full"
           >
            {isGenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ImageIcon className="mr-2 h-4 w-4" />
            )}
            {isGenerating ? "Procesando..." : "Generar y Añadir Capa"}
          </Button>
        </div>
      </div>
    </DraggablePanel>
  );
};

export default GeeProcessingPanel;
