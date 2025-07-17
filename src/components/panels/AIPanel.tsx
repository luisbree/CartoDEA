
"use client";

import React, { useState, useRef, useEffect } from 'react';
import DraggablePanel from './DraggablePanel';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Loader2, Send, User, Bot } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import * as ai from '@/ai/flows/find-layer-flow';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/lib/types';


interface AIPanelProps {
  panelRef: React.RefObject<HTMLDivElement>;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onClosePanel: () => void;
  onMouseDownHeader: (e: React.MouseEvent<HTMLDivElement>) => void;
  availableLayers: { name: string; title: string }[];
  activeLayers: { name: string; title: string; type: string }[];
  onLayerAction: (action: ai.MapAssistantOutput) => void;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  style?: React.CSSProperties;
}


const AIPanel: React.FC<AIPanelProps> = ({
  panelRef,
  isCollapsed,
  onToggleCollapse,
  onClosePanel,
  onMouseDownHeader,
  availableLayers,
  activeLayers,
  onLayerAction,
  messages,
  setMessages,
  style,
}) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    // Focus the input when Drax finishes responding or on initial load.
    if (!isLoading) {
        inputRef.current?.focus();
    }
  }, [isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: query };
    setMessages(prev => [...prev, userMessage]);
    const currentQuery = query;
    setQuery('');
    setIsLoading(true);

    try {
      const result = await ai.chatWithMapAssistant({
        query: currentQuery,
        availableLayers: availableLayers,
        activeLayers: activeLayers,
      });

      const assistantMessage: ChatMessage = { role: 'assistant', content: result.response };
      setMessages(prev => [...prev, assistantMessage]);

      const hasAction = [
        result.layersToAdd,
        result.layersToAddAsWFS,
        result.layersToRemove,
        result.layersToStyle,
        result.zoomToLayer,
        result.showTableForLayer,
        result.setBaseLayer,
        result.zoomToBoundingBox,
        result.findSentinel2Footprints,
        result.findLandsatFootprints,
        result.fetchOsmForView,
        result.urlToOpen,
      ].some(actionField => 
        actionField && (Array.isArray(actionField) ? actionField.length > 0 : true)
      );

      if (hasAction) {
        onLayerAction(result);
      } else {
        // No action was returned. Check if the user query was an action-like request.
        if (/(carg|busc|añad|mostr|quit|elimin|zoom|estilo|tabla|mapa|base|sentinel|landsat|osm|trello)/i.test(currentQuery)) {
            toast({
                title: "Drax no identificó una acción",
                description: "No se encontró una capa o acción que coincida con tu pedido. Intenta ser más específico.",
                variant: "destructive",
                duration: 6000,
            });
        }
      }
    } catch (error: any) {
      console.error("AI chat error:", error);
      
      const errorMessageText = error instanceof Error ? error.message.toLowerCase() : '';

      if (errorMessageText.includes('503') || errorMessageText.includes('overloaded')) {
        const overloadMessage: ChatMessage = { 
          role: 'assistant', 
          content: "Lo siento, el servicio de IA está sobrecargado en este momento. Por favor, inténtalo de nuevo en unos instantes." 
        };
        setMessages(prev => [...prev, overloadMessage]);
        toast({ 
            description: 'El modelo de IA está sobrecargado. Inténtelo más tarde.',
            variant: 'destructive',
        });
      } else {
        const genericErrorMessage: ChatMessage = { role: 'assistant', content: "Lo siento, ocurrió un error inesperado. Por favor intenta de nuevo." };
        setMessages(prev => [...prev, genericErrorMessage]);
        toast({ 
            description: 'Ocurrió un error al comunicarse con la IA.',
            variant: 'destructive'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const lastUserMessage = messages.filter(m => m.role === 'user').pop();
      if (lastUserMessage) {
        setQuery(lastUserMessage.content);
      }
    }
  };

  return (
    <DraggablePanel
      title="Asistente Drax"
      icon={Sparkles}
      panelRef={panelRef}
      initialPosition={{ x: 0, y: 0 }}
      onMouseDownHeader={onMouseDownHeader}
      isCollapsed={isCollapsed}
      onToggleCollapse={onToggleCollapse}
      onClose={onClosePanel}
      showCloseButton={true}
      style={style}
      zIndex={style?.zIndex as number | undefined}
      initialSize={{ width: 350, height: 450 }}
    >
      <div className="flex flex-col h-full">
        <ScrollArea className="flex-grow pr-4 -mr-4 mb-3">
            <div className="flex flex-col gap-4">
                {messages.map((message, index) => (
                    <div key={index} className={cn("flex items-start gap-3 text-sm", message.role === 'user' && 'justify-end')}>
                        {message.role === 'assistant' && (
                            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                                <Bot className="w-4 h-4 text-primary" />
                            </div>
                        )}
                        <div className={cn("max-w-[85%] rounded-lg px-3 py-2 leading-relaxed", message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-gray-700/60')}>
                            {message.content}
                        </div>
                         {message.role === 'user' && (
                             <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-600 flex items-center justify-center">
                                <User className="w-4 h-4 text-gray-300" />
                            </div>
                        )}
                    </div>
                ))}
                 {isLoading && (
                    <div className="flex items-start gap-3 text-sm">
                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                            <Bot className="w-4 h-4 text-primary" />
                        </div>
                        <div className="rounded-lg px-3 py-2 bg-gray-700/60 flex items-center">
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            <span>Pensando...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
        </ScrollArea>
        <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-auto border-t border-gray-700/80 pt-3">
          <Input
            ref={inputRef}
            type="text"
            placeholder="Pide una capa o chatea..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            autoComplete="off"
            className="flex-grow text-xs h-8 border-white/30 bg-black/20 text-white/90 focus:ring-primary placeholder:text-gray-400/70"
          />
          <Button
            type="submit"
            size="icon"
            className="h-8 w-8 flex-shrink-0 bg-primary/80 hover:bg-primary text-primary-foreground p-0"
            disabled={isLoading || !query.trim()}
          >
           <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </DraggablePanel>
  );
};

export default AIPanel;
