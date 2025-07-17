
"use client";

import React from 'react';
import DraggablePanel from './DraggablePanel';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LifeBuoy, Map, Layers, Wrench, Sparkles, ClipboardCheck, Library, MousePointerClick, Square, CloudDownload, ImageUp, Plus, Trash2 } from 'lucide-react';

interface HelpPanelProps {
  panelRef: React.RefObject<HTMLDivElement>;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onClosePanel: () => void;
  onMouseDownHeader: (e: React.MouseEvent<HTMLDivElement>) => void;
  style?: React.CSSProperties;
}

const HelpSectionTrigger: React.FC<{ icon: React.ElementType; title: string }> = ({ icon: Icon, title }) => (
    <div className="flex items-center w-full">
        <Icon className="h-5 w-5 mr-3 text-primary/90" />
        <span className="text-sm font-semibold">{title}</span>
    </div>
);

const HelpPanel: React.FC<HelpPanelProps> = ({
  panelRef,
  isCollapsed,
  onToggleCollapse,
  onClosePanel,
  onMouseDownHeader,
  style,
}) => {
  return (
    <DraggablePanel
      title="Guía Rápida"
      icon={LifeBuoy}
      panelRef={panelRef}
      initialPosition={{ x: 0, y: 0 }}
      onMouseDownHeader={onMouseDownHeader}
      isCollapsed={isCollapsed}
      onToggleCollapse={onToggleCollapse}
      onClose={onClosePanel}
      showCloseButton={true}
      style={style}
      zIndex={style?.zIndex as number | undefined}
      initialSize={{ width: 400, height: 600 }}
      minSize={{ width: 350, height: 300 }}
    >
      <div className="text-sm leading-relaxed text-gray-200">
        <Accordion type="multiple" defaultValue={['navigation']} className="w-full">
          <AccordionItem value="navigation">
            <AccordionTrigger>
              <HelpSectionTrigger icon={Map} title="Navegación y Datos Base" />
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pl-4">
              <p>Desde el <strong>Panel de Datos</strong> podés controlar la vista del mapa:</p>
              <ul className="list-disc list-inside space-y-1 pl-2 text-xs text-gray-300">
                <li><strong>Buscador de Ubicaciones:</strong> Escribí el nombre de una ciudad o lugar para centrar el mapa ahí.</li>
                <li><strong>Selector de Capa Base:</strong> Cambiá el mapa de fondo entre vistas como OpenStreetMap, Satelital y más.</li>
                <li><ImageUp className="inline-block h-4 w-4 mr-1" /><strong>Buscador de Escenas Satelitales:</strong> Buscá las huellas (footprints) de imágenes Sentinel-2 y Landsat en la vista actual del mapa. Los resultados se agregan como capas vectoriales con sus atributos.</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="layers">
            <AccordionTrigger>
              <HelpSectionTrigger icon={Layers} title="Manejo de Capas" />
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pl-4">
              <p>El <strong>Panel de Capas</strong> es tu centro de control para todos los datos:</p>
              <ul className="list-disc list-inside space-y-1 pl-2 text-xs text-gray-300">
                <li><Plus className="inline-block h-4 w-4 mr-1" /><strong>Importar Capa:</strong> Cargá archivos de tu compu como KML, GeoJSON o Shapefiles (en formato .zip).</li>
                <li><Trash2 className="inline-block h-4 w-4 mr-1" /><strong>Eliminar Selección:</strong> Borrá una o varias capas que hayas seleccionado de la lista.</li>
                <li><MousePointerClick className="inline-block h-4 w-4 mr-1" /><strong>Inspección/Selección:</strong> Activá el modo interactivo para cliquear en las entidades, ver sus atributos o seleccionarlas para otras acciones.</li>
                <li><strong>Lista de Capas:</strong> Arrastrá para reordenar, usá el ojo para mostrar u ocultar una capa y entrá al menú (la ruedita) para más opciones como hacer zoom, ver la tabla de atributos, cambiar la opacidad o extraer datos.</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="tools">
            <AccordionTrigger>
              <HelpSectionTrigger icon={Wrench} title="Herramientas" />
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pl-4">
              <p>El <strong>Panel de Herramientas</strong> te da funciones de dibujo y análisis:</p>
              <ul className="list-disc list-inside space-y-1 pl-2 text-xs text-gray-300">
                <li><Square className="inline-block h-4 w-4 mr-1" /><strong>Herramientas de Dibujo:</strong> Dibujá polígonos, líneas o puntos en el mapa. Podés guardar tus dibujos como un archivo KML.</li>
                <li><CloudDownload className="inline-block h-4 w-4 mr-1" /><strong>Datos de OpenStreetMap:</strong> Primero dibujá un polígono y después usá esta herramienta para bajar datos de OSM (como ríos, calles, etc.) de esa zona.</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="ai">
            <AccordionTrigger>
              <HelpSectionTrigger icon={Sparkles} title="Asistente Drax (IA)" />
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pl-4">
              <p>Chateá con <strong>Drax</strong> para manejar el mapa con lenguaje normal. Probá con comandos como:</p>
              <ul className="list-disc list-inside space-y-1 pl-2 text-xs text-gray-300">
                <li>"Cargá la capa de cuencas como WFS"</li>
                <li>"Buscame imágenes Sentinel en Buenos Aires"</li>
                <li>"Pintá el borde de las rutas de color rojo y más grueso"</li>
                <li>"Sacá todas las capas de hidrografía"</li>
                <li>"Creá una tarjeta en Trello para revisar este análisis"</li>
              </ul>
            </AccordionContent>
          </AccordionItem>
          
           <AccordionItem value="integrations">
            <AccordionTrigger>
              <HelpSectionTrigger icon={ClipboardCheck} title="Integraciones" />
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pl-4">
              <p>Conectá la aplicación con otros servicios:</p>
              <ul className="list-disc list-inside space-y-1 pl-2 text-xs text-gray-300">
                <li><Library className="inline-block h-4 w-4 mr-1" /><strong>Biblioteca WFS:</strong> Conectate a servidores WFS que ya vienen cargados o poné uno tuyo para traer capas vectoriales desde afuera.</li>
                <li><ClipboardCheck className="inline-block h-4 w-4 mr-1" /><strong>Trello:</strong> Configurá tus credenciales en el archivo `.env.local` para poder crear y buscar tarjetas de Trello desde la app o pidiéndoselo a Drax.</li>
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </DraggablePanel>
  );
};

export default HelpPanel;
