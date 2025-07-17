"use client";

import React, { useState, useCallback } from 'react';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import SidebarContentComponent from '@/components/geo-explorer/sidebar-content';
import MapComponent from '@/components/geo-explorer/map-component';

export type POI = {
  id: number;
  name: string;
  coords: [number, number];
};

export default function Home() {
  const [layer, setLayer] = useState('osm');
  const [pois, setPois] = useState<POI[]>([]);
  // Start with a view of Europe
  const [viewState, setViewState] = useState({ center: [8.2275, 46.8182], zoom: 5 });


  const addPoi = useCallback((coords: [number, number]) => {
    const name = prompt("Enter a name for this Point of Interest:");
    if (name && name.trim() !== "") {
      const newPoi: POI = {
        id: Date.now(),
        name,
        coords,
      };
      setPois(prevPois => [...prevPois, newPoi]);
    }
  }, []);

  const removePoi = useCallback((id: number) => {
    setPois(pois => pois.filter(p => p.id !== id));
  }, []);

  const panTo = useCallback((coords: [number, number]) => {
    setViewState({ center: coords, zoom: 14 });
  }, []);

  return (
    <main className="h-screen w-screen overflow-hidden">
      <SidebarProvider>
        <Sidebar>
          <SidebarContentComponent
            onLayerChange={setLayer}
            pois={pois}
            onRemovePoi={removePoi}
            onPanTo={panTo}
          />
        </Sidebar>
        <SidebarInset>
          <MapComponent
            layer={layer}
            pois={pois}
            onMapClick={addPoi}
            center={viewState.center as [number, number]}
            zoom={viewState.zoom}
          />
        </SidebarInset>
      </SidebarProvider>
    </main>
  );
}
