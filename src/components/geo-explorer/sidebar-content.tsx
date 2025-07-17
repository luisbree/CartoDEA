"use client";

import React, { useState } from 'react';
import type { POI } from '@/app/page';
import { suggestExplorationAreas, type SuggestExplorationAreasOutput } from '@/ai/flows/suggest-exploration-areas';
import { SidebarHeader, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarGroupContent } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Globe, Map as MapIcon, Compass, BrainCircuit, Trash2, Eye, MapPin, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface SidebarContentProps {
  onLayerChange: (layer: string) => void;
  pois: POI[];
  onRemovePoi: (id: number) => void;
  onPanTo: (coords: [number, number]) => void;
}

const SidebarContentComponent: React.FC<SidebarContentProps> = ({ onLayerChange, pois, onRemovePoi, onPanTo }) => {
  const { toast } = useToast();
  const [preferences, setPreferences] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestExplorationAreasOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSuggest = async () => {
    setIsLoading(true);
    setSuggestions(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const result = await suggestExplorationAreas({
            userPreferences: preferences || 'anything interesting',
            currentLocation: `${latitude},${longitude}`,
          });
          setSuggestions(result);
        } catch (error) {
          console.error("AI suggestion error:", error);
          toast({
            variant: "destructive",
            title: "AI Suggestion Error",
            description: "Failed to get suggestions from the AI. Please try again later.",
          });
        } finally {
          setIsLoading(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast({
          variant: "destructive",
          title: "Geolocation Error",
          description: "Could not get your location. Please enable location services in your browser.",
        });
        setIsLoading(false);
      }
    );
  };

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-3 p-2">
          <div className="bg-primary text-primary-foreground p-2 rounded-lg">
            <Globe className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-headline font-semibold">Geo Explorer</h1>
        </div>
      </SidebarHeader>
      <Separator />
      <SidebarContent>
        <ScrollArea className="h-full px-2">
          <div className="py-4 space-y-6">
            <div className="space-y-2">
              <h3 className="font-semibold font-headline text-lg flex items-center gap-2 px-2"><MapIcon size={18} /> Map Layers</h3>
              <RadioGroup defaultValue="osm" onValueChange={onLayerChange} className="grid grid-cols-1 gap-2 p-2">
                <Label htmlFor="osm" className="flex items-center justify-center rounded-md border-2 border-muted bg-popover p-3 font-medium hover:bg-accent hover:text-accent-foreground cursor-pointer peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary transition-all">
                  <RadioGroupItem value="osm" id="osm" className="sr-only peer" />
                  Road Map
                </Label>
                <Label htmlFor="satellite" className="flex items-center justify-center rounded-md border-2 border-muted bg-popover p-3 font-medium hover:bg-accent hover:text-accent-foreground cursor-pointer peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary transition-all">
                  <RadioGroupItem value="satellite" id="satellite" className="sr-only peer" />
                  Satellite
                </Label>
                <Label htmlFor="terrain" className="flex items-center justify-center rounded-md border-2 border-muted bg-popover p-3 font-medium hover:bg-accent hover:text-accent-foreground cursor-pointer peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary transition-all">
                  <RadioGroupItem value="terrain" id="terrain" className="sr-only peer" />
                  Terrain
                </Label>
              </RadioGroup>
            </div>
            
            <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
              <AccordionItem value="item-1" className="border-b-0">
                <AccordionTrigger className="font-semibold font-headline text-lg flex items-center gap-2 p-2 hover:no-underline"><Compass size={18}/> AI Explorer</AccordionTrigger>
                <AccordionContent className="p-2">
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">Describe what you want to see (e.g., "quiet hiking trails", "historical landmarks").</p>
                    <Textarea placeholder="e.g. mountain views, coastal walks..." value={preferences} onChange={(e) => setPreferences(e.target.value)} />
                    <Button onClick={handleSuggest} disabled={isLoading} className="w-full bg-primary hover:bg-primary/90">
                      {isLoading ? <Loader2 className="animate-spin mr-2" /> : <BrainCircuit className="mr-2"/>}
                      Suggest Areas
                    </Button>
                    {suggestions && (
                      <Card className="mt-4">
                        <CardHeader>
                          <CardTitle className="font-headline text-primary">Exploration Ideas</CardTitle>
                          <CardDescription>{suggestions.reasoning}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-3">
                            {suggestions.suggestedAreas.map((area, i) => (
                              <li key={i} className="text-sm flex items-start gap-3">
                                <MapPin className="text-accent h-5 w-5 mt-0.5 shrink-0" />
                                <span>{area}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            
            <div className="space-y-2">
              <h3 className="font-semibold font-headline text-lg flex items-center gap-2 px-2"><MapPin size={18} /> Points of Interest</h3>
              <div className="p-2 space-y-2">
                {pois.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-3 bg-muted rounded-md text-center">Click on the map to add a point.</p>
                ) : (
                  <ul className="space-y-2">
                    {pois.map((poi) => (
                      <li key={poi.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors group">
                        <span className="font-medium text-sm truncate pr-2">{poi.name}</span>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onPanTo(poi.coords)}>
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">Pan to {poi.name}</span>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onRemovePoi(poi.id)}>
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete {poi.name}</span>
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </SidebarContent>
    </>
  );
};

export default SidebarContentComponent;
