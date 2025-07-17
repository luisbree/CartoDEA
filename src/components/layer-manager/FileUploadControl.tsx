"use client";

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus } from 'lucide-react';
import { handleFileUpload as processUploadedFiles } from '@/services/file-parsers';
import { useToast } from "@/hooks/use-toast";
import type { MapLayer } from '@/lib/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FileUploadControlProps {
  onAddLayer: (layer: MapLayer) => void;
  uniqueIdPrefix?: string;
}

const FileUploadControl: React.FC<FileUploadControlProps> = ({ 
  onAddLayer, 
  uniqueIdPrefix = "fileupload" 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast(); 

  const handleFilesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;

    setIsLoading(true);
    const files = event.target.files;

    if (files.length > 1) {
       await processUploadedFiles({ selectedFile: null, selectedMultipleFiles: files, onAddLayer, toast, uniqueIdPrefix });
    } else if (files.length === 1) {
       await processUploadedFiles({ selectedFile: files[0], selectedMultipleFiles: null, onAddLayer, toast, uniqueIdPrefix });
    }
    
    setIsLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = ''; 
  };

  const iconButtonBaseClass = "h-8 w-8 p-0 flex items-center justify-center focus-visible:ring-primary";
  const buttonDefaultClass = "border border-white/30 text-white/90 bg-black/20 hover:bg-black/40";

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div> {/* Wrap button in a div for TooltipTrigger when button is disabled */}
            <Input
              id={`${uniqueIdPrefix}-input`}
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFilesSelected}
              accept=".kml,.kmz,.geojson,.json,.zip,.shp,.dbf,.shx,.prj,.cpg"
              className="hidden"
              disabled={isLoading}
            />
            <Button 
              onClick={() => fileInputRef.current?.click()}
              className={`${iconButtonBaseClass} ${buttonDefaultClass}`}
              disabled={isLoading}
              aria-label={isLoading ? 'Procesando archivo...' : 'Importar capa desde archivo'}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-gray-700 text-white border-gray-600">
          <p className="text-xs">{isLoading ? 'Procesando...' : 'Importar Capa'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default FileUploadControl;
