
"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

type PanelId = 'layers' | 'tools' | 'legend' | 'attributes' | 'ai' | 'trello' | 'wfsLibrary' | 'help' | 'printComposer' | 'deasCatalog' | 'gee';

interface PanelState {
  isMinimized: boolean;
  isCollapsed: boolean;
  position: { x: number; y: number };
  zIndex: number;
}

interface UseFloatingPanelsProps {
  layersPanelRef: React.RefObject<HTMLDivElement>;
  toolsPanelRef: React.RefObject<HTMLDivElement>;
  legendPanelRef: React.RefObject<HTMLDivElement>;
  attributesPanelRef: React.RefObject<HTMLDivElement>;
  aiPanelRef: React.RefObject<HTMLDivElement>;
  trelloPanelRef: React.RefObject<HTMLDivElement>;
  wfsLibraryPanelRef: React.RefObject<HTMLDivElement>;
  helpPanelRef: React.RefObject<HTMLDivElement>;
  printComposerPanelRef: React.RefObject<HTMLDivElement>;
  deasCatalogPanelRef: React.RefObject<HTMLDivElement>;
  geePanelRef: React.RefObject<HTMLDivElement>;
  mapAreaRef: React.RefObject<HTMLDivElement>;
  panelWidth: number;
  panelPadding: number;
}

const initialZIndex = 30;

export const useFloatingPanels = ({
  layersPanelRef,
  toolsPanelRef,
  legendPanelRef,
  attributesPanelRef,
  aiPanelRef,
  trelloPanelRef,
  wfsLibraryPanelRef,
  helpPanelRef,
  printComposerPanelRef,
  deasCatalogPanelRef,
  geePanelRef,
  mapAreaRef,
  panelWidth,
  panelPadding
}: UseFloatingPanelsProps) => {

  const panelRefs = useMemo(() => ({
    layers: layersPanelRef,
    tools: toolsPanelRef,
    legend: legendPanelRef,
    attributes: attributesPanelRef,
    ai: aiPanelRef,
    trello: trelloPanelRef,
    wfsLibrary: wfsLibraryPanelRef,
    help: helpPanelRef,
    printComposer: printComposerPanelRef,
    deasCatalog: deasCatalogPanelRef,
    gee: geePanelRef,
  }), [attributesPanelRef, aiPanelRef, layersPanelRef, legendPanelRef, toolsPanelRef, trelloPanelRef, wfsLibraryPanelRef, helpPanelRef, printComposerPanelRef, deasCatalogPanelRef, geePanelRef]);
  
  const [panels, setPanels] = useState<Record<PanelId, PanelState>>(() => {
    const initialX = panelPadding;
    const initialY = panelPadding;
    const cascadeOffsetX = 42;
    const cascadeOffsetY = 42;
    
    return {
      // Order reflects the toggle buttons in the UI
      legend: { isMinimized: false, isCollapsed: false, position: { x: initialX + cascadeOffsetX, y: initialY + cascadeOffsetY }, zIndex: initialZIndex + 1 },
      deasCatalog: { isMinimized: false, isCollapsed: false, position: { x: initialX, y: initialY }, zIndex: initialZIndex + 2 },
      wfsLibrary: { isMinimized: true, isCollapsed: false, position: { x: initialX + cascadeOffsetX * 2, y: initialY + cascadeOffsetY * 2 }, zIndex: initialZIndex },
      layers: { isMinimized: true, isCollapsed: false, position: { x: initialX + cascadeOffsetX * 3, y: initialY + cascadeOffsetY * 3 }, zIndex: initialZIndex },
      tools: { isMinimized: true, isCollapsed: false, position: { x: initialX + cascadeOffsetX * 4, y: initialY + cascadeOffsetY * 4 }, zIndex: initialZIndex },
      trello: { isMinimized: true, isCollapsed: false, position: { x: initialX + cascadeOffsetX * 5, y: initialY + cascadeOffsetY * 5 }, zIndex: initialZIndex },
      attributes: { isMinimized: true, isCollapsed: false, position: { x: initialX + cascadeOffsetX * 6, y: initialY + cascadeOffsetY * 6 }, zIndex: initialZIndex },
      printComposer: { isMinimized: true, isCollapsed: false, position: { x: initialX + cascadeOffsetX * 7, y: initialY + cascadeOffsetY * 7 }, zIndex: initialZIndex },
      gee: { isMinimized: true, isCollapsed: false, position: { x: initialX + cascadeOffsetX * 8, y: initialY + cascadeOffsetY * 8 }, zIndex: initialZIndex },
      ai: { isMinimized: false, isCollapsed: false, position: { x: -9999, y: panelPadding }, zIndex: initialZIndex + 3 }, // Positioned dynamically
      help: { isMinimized: true, isCollapsed: false, position: { x: -9999, y: panelPadding }, zIndex: initialZIndex }, // Positioned dynamically
    };
  });


  const activeDragRef = useRef<{ panelId: PanelId | null, offsetX: number, offsetY: number }>({ panelId: null, offsetX: 0, offsetY: 0 });
  const zIndexCounterRef = useRef(initialZIndex + 3); // Start above AI panel
  const positionInitialized = useRef(false);
  
  useEffect(() => {
    // This effect runs once to set the initial position of the AI and Help panels on the right side.
    if (mapAreaRef.current && !positionInitialized.current) {
        const mapWidth = mapAreaRef.current.clientWidth;
        const helpPanelWidth = 400; // Use the specific width of the help panel
        const aiPanelX = mapWidth - panelWidth - panelPadding;
        const helpPanelX = mapWidth - panelWidth - helpPanelWidth - (panelPadding * 2);

        setPanels(prev => ({
            ...prev,
            ai: {
                ...prev.ai,
                position: { x: aiPanelX, y: prev.ai.position.y }
            },
            help: {
                ...prev.help,
                position: { x: helpPanelX, y: prev.help.position.y }
            }
        }));
        positionInitialized.current = true;
    }
  }, [mapAreaRef, panelWidth, panelPadding]);


  const bringToFront = useCallback((panelId: PanelId) => {
    zIndexCounterRef.current += 1;
    setPanels(prev => ({
      ...prev,
      [panelId]: { ...prev[panelId], zIndex: zIndexCounterRef.current }
    }));
  }, []);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    const { panelId, offsetX, offsetY } = activeDragRef.current;
    if (!panelId) return;

    const mapArea = mapAreaRef.current;
    const panelRef = panelRefs[panelId].current;
    if (!mapArea || !panelRef) return;

    const mapRect = mapArea.getBoundingClientRect();
    let newX = event.clientX - mapRect.left - offsetX;
    let newY = event.clientY - mapRect.top - offsetY;

    setPanels(prev => ({
      ...prev,
      [panelId]: { ...prev[panelId], position: { x: newX, y: newY } }
    }));
  }, [mapAreaRef, panelRefs]);

  const handleMouseUp = useCallback(() => {
    activeDragRef.current = { panelId: null, offsetX: 0, offsetY: 0 };
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);
  
  const handlePanelMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>, panelId: PanelId) => {
    const panelRef = panelRefs[panelId].current;
    if (!panelRef) return;
    
    bringToFront(panelId);

    const rect = panelRef.getBoundingClientRect();
    activeDragRef.current = {
      panelId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    event.preventDefault();
  }, [panelRefs, bringToFront, handleMouseMove, handleMouseUp]);

  const togglePanelCollapse = useCallback((panelId: PanelId) => {
    setPanels(prev => ({
      ...prev,
      [panelId]: { ...prev[panelId], isCollapsed: !prev[panelId].isCollapsed }
    }));
  }, []);
  
  const togglePanelMinimize = useCallback((panelId: PanelId) => {
    setPanels(prev => {
        const panelState = prev[panelId];
        const newIsMinimized = !panelState.isMinimized;
        // If restoring, bring to front
        if (!newIsMinimized) {
            zIndexCounterRef.current += 1;
            return {
                ...prev,
                [panelId]: { ...panelState, isMinimized: newIsMinimized, zIndex: zIndexCounterRef.current }
            }
        }
        return {
            ...prev,
            [panelId]: { ...panelState, isMinimized: newIsMinimized }
        }
    });
  }, []);

  useEffect(() => {
    const mm = (e: MouseEvent) => handleMouseMove(e);
    const mu = (e: MouseEvent) => handleMouseUp();
    
    // Add event listeners with proper types
    document.addEventListener('mousemove', mm);
    document.addEventListener('mouseup', mu);
    
    return () => {
      // Clean up event listeners
      document.removeEventListener('mousemove', mm);
      document.removeEventListener('mouseup', mu);
    };
  }, [handleMouseMove, handleMouseUp]);
  
  return {
    panels,
    handlePanelMouseDown,
    togglePanelCollapse,
    togglePanelMinimize,
  };
};

    
