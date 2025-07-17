
"use client";

import React, { useState } from 'react';
import DraggablePanel from './DraggablePanel';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, ClipboardCheck, Search } from 'lucide-react';
import { Label } from '../ui/label';

interface TrelloPanelProps {
  panelRef: React.RefObject<HTMLDivElement>;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onClosePanel: () => void;
  onMouseDownHeader: (e: React.MouseEvent<HTMLDivElement>) => void;
  onSearchCard: (searchTerm: string) => Promise<void>;
  isLoading: boolean;
  style?: React.CSSProperties;
}

const TrelloPanel: React.FC<TrelloPanelProps> = ({
  panelRef,
  isCollapsed,
  onToggleCollapse,
  onClosePanel,
  onMouseDownHeader,
  onSearchCard,
  isLoading,
  style,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim() || isLoading) return;
    await onSearchCard(searchTerm);
    setSearchTerm('');
  };

  return (
    <DraggablePanel
      title="Integración con Trello"
      icon={ClipboardCheck}
      panelRef={panelRef}
      initialPosition={{ x: 0, y: 0 }}
      onMouseDownHeader={onMouseDownHeader}
      isCollapsed={isCollapsed}
      onToggleCollapse={onToggleCollapse}
      onClose={onClosePanel}
      showCloseButton={true}
      style={style}
      zIndex={style?.zIndex as number | undefined}
      initialSize={{ width: 350, height: "auto" }} // Auto height
    >
      <div className="bg-white/5 rounded-md p-3">
        <h3 className="text-sm font-semibold text-white mb-2">Buscar Tarjeta</h3>
        <form onSubmit={handleSearchSubmit} className="space-y-3">
            <div className="space-y-1">
            <Label htmlFor="trello-search" className="text-xs text-white/90">Término de Búsqueda</Label>
            <Input
                id="trello-search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Palabra clave o título..."
                disabled={isLoading}
                className="text-xs h-8 border-white/30 bg-black/20 text-white/90 focus:ring-primary"
            />
            </div>
            <Button type="submit" disabled={isLoading || !searchTerm.trim()} className="w-full">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Buscar y Abrir Tarjeta
            </Button>
        </form>
      </div>
    </DraggablePanel>
  );
};

export default TrelloPanel;
