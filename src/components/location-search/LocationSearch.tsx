
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2, X as ClearIcon, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { NominatimResult } from '@/lib/types';


interface LocationSearchProps {
  onLocationSelect: (location: NominatimResult) => void;
  className?: string;
}

const LocationSearch: React.FC<LocationSearchProps> = ({ onLocationSelect, className }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false); // Controls Popover visibility
  const { toast } = useToast();
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null); // Ref for the main div to handle PopoverTrigger

  const handleSearch = useCallback(async (query: string) => {
    if (query.trim().length < 3) {
      setResults([]);
      // Don't hide suggestions immediately, allow "No results" or loader
      // setIsSuggestionsVisible(false); 
      return;
    }
    setIsLoading(true);
    // Ensure suggestions popover is open when a search is initiated
    setIsSuggestionsVisible(true); 
    try {
      const response = await fetch(`/api/nominatim-proxy?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Error al buscar la ubicación.');
      }
      const data: NominatimResult[] = await response.json();
      setResults(data);
      // setIsSuggestionsVisible(data.length > 0 || query.trim().length >=3); // Keep visible to show "no results"
    } catch (error) {
      console.error("Error fetching from Nominatim:", error);
      toast({ description: "Error al buscar ubicaciones. Intente nuevamente." });
      setResults([]);
      // setIsSuggestionsVisible(query.trim().length >=3); // Keep visible to show error/empty
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    if (searchTerm.trim().length >= 3) {
      debounceTimeoutRef.current = setTimeout(() => {
        handleSearch(searchTerm);
      }, 500);
    } else {
      setResults([]);
      setIsSuggestionsVisible(false); // Close if search term is too short
    }
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchTerm, handleSearch]);

  // Note: Popover's onOpenChange and internal focus/click management
  // might handle some outside click cases. Explicitly keeping this
  // for now, but it might need adjustment if Popover handles it fully.
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        // Check if the click is outside the PopoverContent as well
        const popoverContent = document.querySelector('[data-radix-popper-content-wrapper]');
        if (popoverContent && !popoverContent.contains(event.target as Node)) {
          setIsSuggestionsVisible(false);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

  const handleSelectResult = (result: NominatimResult) => {
    setSearchTerm(result.display_name.split(',')[0]); 
    setIsSuggestionsVisible(false);
    onLocationSelect(result);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setResults([]);
    setIsSuggestionsVisible(false);
  };

  return (
    <div ref={wrapperRef} className={cn("relative w-full", className)}>
      <Popover open={isSuggestionsVisible} onOpenChange={setIsSuggestionsVisible}>
        <PopoverTrigger asChild>
          <div className="relative flex items-center">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400/80 pointer-events-none" />
            <Input
              type="text"
              placeholder="Buscar ubicación..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                // Suggestions will open/close based on useEffect for searchTerm
              }}
              onFocus={() => {
                if (searchTerm.trim().length >= 3 || results.length > 0) {
                  setIsSuggestionsVisible(true);
                }
              }}
              className="text-xs h-8 pl-7 pr-7 border-white/30 bg-black/20 text-white/90 focus:ring-primary placeholder:text-gray-400/70"
            />
            {searchTerm && !isLoading && (
              <button
                onClick={clearSearch}
                className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-gray-400/80 hover:text-white"
                aria-label="Limpiar búsqueda"
              >
                <ClearIcon className="h-3.5 w-3.5" />
              </button>
            )}
            {/* Loader is now shown inside PopoverContent if it's for initial results */}
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0 border-gray-600 bg-gray-700/95 backdrop-blur-sm shadow-lg"
          align="start"
          sideOffset={5}
          onOpenAutoFocus={(e) => e.preventDefault()} // Prevent PopoverContent from stealing focus from input
        >
          {isLoading && (
            <div className="p-2.5 text-center text-xs text-gray-300">
              <Loader2 className="inline-block mr-2 h-3.5 w-3.5 animate-spin" />
              Buscando...
            </div>
          )}
          {!isLoading && searchTerm.trim().length >= 3 && results.length === 0 && (
            <div className="p-2.5 text-center text-xs text-gray-300">
              No se encontraron resultados para "{searchTerm}".
            </div>
          )}
          {!isLoading && results.length > 0 && (
            <ul className="py-1 max-h-60 overflow-y-auto">
              {results.map((result) => (
                <li key={result.place_id}>
                  <button
                    onClick={() => handleSelectResult(result)}
                    className="w-full px-2.5 py-1.5 text-left text-xs text-white hover:bg-primary/30"
                    title={result.display_name}
                  >
                    <span className="block truncate">{result.display_name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default LocationSearch;
