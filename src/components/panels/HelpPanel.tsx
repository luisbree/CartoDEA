
"use client";

import React from 'react';
import DraggablePanel from './DraggablePanel';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LifeBuoy, Map, Layers, Wrench, Sparkles, ClipboardCheck, Library, MousePointerClick, Square, CloudDownload, ImageUp, Plus, Trash2, Server, BrainCircuit, Printer } from 'lucide-react';

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
              <HelpSectionTrigger icon={Map} title="Navegación y Vista" />
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pl-4">
              <p>Controla la vista del mapa y los datos base desde el <strong>Panel de Datos y Vista</strong>:</p>
              <ul className="list-disc list-inside space-y-2 pl-2 text-xs text-gray-300">
                <li><strong>Buscador de Ubicaciones:</strong> Escribe el nombre de una ciudad o lugar para centrar el mapa.</li>
                <li><strong>Selector de Capa Base:</strong> Cambia el mapa de fondo entre vistas como OpenStreetMap, Satelital (color natural, falso color) y más.</li>
                <li><strong>Controles de Capa Base:</strong> Ajusta la opacidad, brillo y contraste del mapa de fondo.</li>
                <li><ImageUp className="inline-block h-4 w-4 mr-1" /><strong>Buscador de Escenas Satelitales:</strong> Busca las huellas (footprints) de imágenes Sentinel-2 y Landsat en la vista actual. Los resultados se añaden como capas vectoriales con sus atributos, incluyendo enlaces de previsualización.</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="layers">
            <AccordionTrigger>
              <HelpSectionTrigger icon={Layers} title="Gestión de Capas" />
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pl-4">
              <p>El <strong>Panel de Capas en Mapa</strong> es tu centro de control para todos los datos:</p>
              <ul className="list-disc list-inside space-y-2 pl-2 text-xs text-gray-300">
                <li><Plus className="inline-block h-4 w-4 mr-1" /><strong>Importar Capa:</strong> Carga archivos desde tu computadora (KML, GeoJSON, Shapefiles en formato .zip).</li>
                <li><Trash2 className="inline-block h-4 w-4 mr-1" /><strong>Eliminar Selección:</strong> Borra una o varias capas seleccionadas de la lista.</li>
                <li><MousePointerClick className="inline-block h-4 w-4 mr-1" /><strong>Inspección/Selección:</strong> Activa el modo interactivo para cliquear en las entidades del mapa, ver sus atributos o seleccionarlas para otras acciones.</li>
                <li><strong>Arrastrar y Soltar:</strong> Reordena las capas de usuario simplemente arrastrándolas en la lista.</li>
                <li><strong>Menú de Capa (rueda dentada):</strong> Accede a opciones avanzadas como hacer zoom, ver la tabla de atributos, cambiar la opacidad o extraer datos.</li>
                <li><strong>Extracción de Datos:</strong> Crea nuevas capas extrayendo entidades por un polígono dibujado o a partir de una selección manual.</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="tools">
            <AccordionTrigger>
              <HelpSectionTrigger icon={Wrench} title="Herramientas de Dibujo y Análisis" />
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pl-4">
              <p>El <strong>Panel de Herramientas</strong> te da funciones de creación y análisis:</p>
              <ul className="list-disc list-inside space-y-2 pl-2 text-xs text-gray-300">
                <li><Square className="inline-block h-4 w-4 mr-1" /><strong>Dibujo Vectorial:</strong> Dibuja polígonos, rectángulos, líneas o puntos en el mapa. Puedes guardar tus creaciones como un archivo KML.</li>
                <li><CloudDownload className="inline-block h-4 w-4 mr-1" /><strong>Datos de OpenStreetMap (OSM):</strong> Dibuja un polígono y luego usa esta herramienta para descargar datos de OSM (como ríos, calles, etc.) de esa zona específica.</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="integrations">
            <AccordionTrigger>
              <HelpSectionTrigger icon={Server} title="Datos Externos e Integraciones" />
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pl-4">
              <p>Conecta la aplicación con servicios y servidores externos:</p>
              <ul className="list-disc list-inside space-y-2 pl-2 text-xs text-gray-300">
                <li><Server className="inline-block h-4 w-4 mr-1" /><strong>Capas Predefinidas (DEAS):</strong> Explora el catálogo de capas del servidor de DEAS y añádelas como imagen (WMS) o como datos vectoriales (WFS) con su estilo original.</li>
                <li><Library className="inline-block h-4 w-4 mr-1" /><strong>Biblioteca de Servidores:</strong> Conéctate a otros servidores WMS/WFS (predefinidos o personalizados) para traer capas desde cualquier fuente externa.</li>
                 <li><BrainCircuit className="inline-block h-4 w-4 mr-1" /><strong>Procesamiento GEE:</strong> Genera capas raster al vuelo usando Google Earth Engine. Selecciona un índice (como BSI) o una combinación de bandas de Sentinel-2, define un rango de fechas y obtén una nueva capa para la vista actual.</li>
                <li><ClipboardCheck className="inline-block h-4 w-4 mr-1" /><strong>Trello:</strong> Busca tarjetas existentes en tus tableros de Trello.</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="ai">
            <AccordionTrigger>
              <HelpSectionTrigger icon={Sparkles} title="Asistente Drax (IA)" />
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pl-4">
              <p>Chatea con <strong>Drax</strong> para manejar el mapa con lenguaje natural. Es ideal para acelerar tareas complejas. Prueba con comandos como:</p>
              <ul className="list-disc list-inside space-y-2 pl-2 text-xs text-gray-300">
                <li>"Cargá la capa de cuencas como WFS"</li>
                <li>"Buscame imágenes Sentinel en Buenos Aires para enero de 2023"</li>
                <li>"Pintá el borde de las rutas de color rojo y más grueso"</li>
                <li>"Sacá todas las capas de hidrografía"</li>
                <li>"Buscá la tarjeta de Trello sobre el análisis de suelo"</li>
                <li>"Centrá el mapa en la Torre Eiffel y buscá los hospitales de OSM"</li>
              </ul>
            </AccordionContent>
          </AccordionItem>
          
           <AccordionItem value="print">
            <AccordionTrigger>
              <HelpSectionTrigger icon={Printer} title="Impresión y Exportación" />
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pl-4">
               <p>El <strong>Panel de Impresión</strong> te permite crear un diseño de mapa profesional para exportar.</p>
              <ul className="list-disc list-inside space-y-2 pl-2 text-xs text-gray-300">
                <li><strong>Composición Dinámica:</strong> El mapa en el compositor se actualiza automáticamente a medida que te mueves en el mapa principal.</li>
                <li><strong>Personalización:</strong> Edita el título y el subtítulo del mapa.</li>
                <li><strong>Exportación:</strong> Imprime tu diseño directamente, guárdalo como PDF desde el diálogo de impresión, o descárgalo como una imagen JPEG de alta calidad (96, 150 o 300 DPI).</li>
              </ul>
            </AccordionContent>
          </AccordionItem>
          
        </Accordion>
      </div>
    </DraggablePanel>
  );
};

export default HelpPanel;
