
'use server';
/**
 * @fileOverview A conversational map assistant AI flow.
 *
 * - chatWithMapAssistant - A function that handles the conversational interaction.
 * - MapAssistantInput - The input type for the chat function.
 * - MapAssistantOutput - The return type for the chat function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { NominatimResult } from '@/lib/types';
import { searchTrelloCard as searchTrelloCardAction } from '@/ai/flows/trello-actions';


// Tool definition for location search
const searchLocationTool = ai.defineTool(
  {
    name: 'searchLocation',
    description: 'Searches for a geographic location (city, address, landmark) and returns its bounding box for zooming.',
    inputSchema: z.object({
      query: z.string().describe("The location name to search for, e.g., 'Paris, France' or 'Eiffel Tower'."),
    }),
    outputSchema: z.object({
      boundingbox: z.array(z.number()).describe('The bounding box of the location as [southLat, northLat, westLon, eastLon].'),
      displayName: z.string().describe('The full display name of the found location.'),
    }),
  },
  async ({ query }) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      if (!response.ok) {
        throw new Error('Nominatim API request failed');
      }
      const data: NominatimResult[] = await response.json();
      if (data.length > 0 && data[0].boundingbox) {
        return {
          boundingbox: data[0].boundingbox.map(parseFloat),
          displayName: data[0].display_name
        };
      }
      throw new Error(`Location '${query}' not found.`);
    } catch (error) {
      console.error('Error in searchLocationTool:', error);
      throw new Error(`Failed to search for location: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

// Tool definition for searching Trello cards
const searchTrelloCardTool = ai.defineTool(
    {
        name: 'searchTrelloCard',
        description: 'Searches for an existing card on the Trello board by its title or keywords and returns its URL to be opened.',
        inputSchema: z.object({
            query: z.string().describe('The title or keywords to search for in the card name or description.'),
        }),
        outputSchema: z.object({
            cardUrl: z.string().url().describe('The URL of the found Trello card.'),
            message: z.string().describe('A confirmation message to return to the user.'),
        }),
    },
    async ({ query }) => {
        return await searchTrelloCardAction({ query });
    }
);


const AvailableLayerSchema = z.object({
  name: z.string().describe('The machine-readable name of the layer, e.g., "cuencas_light".'),
  title: z.string().describe('The human-readable title of the layer, e.g., "Cuencas Hidrográficas Light".'),
});

const ActiveLayerSchema = z.object({
  name: z.string().describe('The machine-readable name of the layer, e.g., "cuencas_light".'),
  title: z.string().describe('The human-readable title of the layer, e.g., "Cuencas Hidrográficas Light".'),
  type: z.string().describe("The layer type, e.g. 'wms', 'wfs', 'vector'. Only 'wfs', 'vector', and 'osm' layers can be styled or have their attributes shown."),
});

const MapAssistantInputSchema = z.object({
  query: z.string().describe("The user's message to the assistant."),
  availableLayers: z.array(AvailableLayerSchema).describe('The list of available layers to search through for adding.'),
  activeLayers: z.array(ActiveLayerSchema).describe('The list of layers currently on the map, for removing, zooming, or styling.'),
});
export type MapAssistantInput = z.infer<typeof MapAssistantInputSchema>;

const MapAssistantOutputSchema = z.object({
  response: z.string().describe("The assistant's conversational response to the user."),
  layersToAdd: z.array(z.string()).describe("A list of machine-readable names of layers to add to the map as WMS (image layers).").optional().nullable(),
  layersToAddAsWFS: z.array(z.string()).describe("A list of machine-readable names of layers to add to the map as WFS (vector data layers, which can be styled).").optional().nullable(),
  layersToRemove: z.array(z.string()).describe("A list of machine-readable names of active layers to remove from the map.").optional().nullable(),
  zoomToLayer: z.string().describe("The machine-readable name of an active layer to zoom to.").optional().nullable(),
  layersToStyle: z.array(z.object({
    layerName: z.string().describe("The machine-readable name of the layer to style."),
    strokeColor: z.string().describe("The requested stroke/outline color in Spanish, e.g., 'rojo', 'verde'.").optional(),
    fillColor: z.string().describe("The requested fill color in Spanish, e.g., 'azul', 'amarillo'.").optional(),
    lineStyle: z.enum(['solid', 'dashed', 'dotted']).describe("The requested line style. Use 'solid' for solid lines, 'dashed' for dashed lines, 'dotted' for dotted lines.").optional(),
    lineWidth: z.number().describe("The requested line width in pixels. Affects the stroke/outline width.").optional(),
  })).describe("A list of layers to change the style of.").optional().nullable(),
  showTableForLayer: z.string().describe("The machine-readable name of an active layer to show its attribute table.").optional().nullable(),
  setBaseLayer: z.string().describe("The ID of the base layer to set, e.g., 'osm-standard', 'esri-satellite', 'esri-red'.").optional().nullable(),
  zoomToBoundingBox: z.array(z.number()).describe("A bounding box to zoom to, as an array of numbers: [southLat, northLat, westLon, eastLon]. The result of using the 'searchLocation' tool.").optional().nullable(),
  findSentinel2Footprints: z.object({
    startDate: z.string().describe("The start date for the search in YYYY-MM-DD format.").optional(),
    completionDate: z.string().describe("The end date (completion date) for the search in YYYY-MM-DD format.").optional(),
  }).describe("Set this object to search for Sentinel-2 satellite image footprints. If no dates are provided, it searches for recent images.").optional().nullable(),
  findLandsatFootprints: z.object({
    startDate: z.string().describe("The start date for the search in YYYY-MM-DD format.").optional(),
    completionDate: z.string().describe("The end date (completion date) for the search in YYYY-MM-DD format.").optional(),
  }).describe("Set this object to search for Landsat satellite image footprints. If no dates are provided, it searches for recent images.").optional().nullable(),
  fetchOsmForView: z.array(z.string()).describe("An array of OSM category IDs to fetch for the current map view. Often used after a zoom action.").optional().nullable(),
  urlToOpen: z.string().url().describe("A URL that the application should open in a new tab for the user.").optional().nullable(),
});
export type MapAssistantOutput = z.infer<typeof MapAssistantOutputSchema>;

export async function chatWithMapAssistant(input: MapAssistantInput): Promise<MapAssistantOutput> {
  return mapAssistantFlow(input);
}

const assistantPrompt = ai.definePrompt({
  name: 'mapAssistantPrompt',
  input: { schema: MapAssistantInputSchema },
  output: { schema: MapAssistantOutputSchema },
  tools: [searchLocationTool, searchTrelloCardTool],
  system: `Sos Drax, un asistente de mapas GIS piola y gauchito.
Tu onda es charlar con el usuario y darle una mano con lo que necesite.
Respondé siempre de forma copada y conversacional, usando el "vos".

Tu conocimiento no se limita a las acciones principales que podés ejecutar. Te das cuenta de todas las funcionalidades de la aplicación. Si el usuario te pide algo que no podés hacer directamente, guialo para que use la interfaz de la aplicación. No intentes hacer estas cosas vos mismo.

Otras funcionalidades sobre las que tenés que guiar al usuario:
- **Dibujar en el mapa**: Si te piden que dibujes, deciles que usen las 'Herramientas de Dibujo' en el panel 'Herramientas'.
- **Subir un archivo local**: Si te preguntan cómo cargar un archivo (KML, GeoJSON, Shapefile), guialos al botón 'Importar Capa' (el icono con el '+') en el panel 'Capas'.
- **Obtener datos de OpenStreetMap (OSM)**: Si te preguntan por datos de OSM para la zona actual, explicá que primero tienen que dibujar un polígono con las 'Herramientas de Dibujo' y después usar la sección 'OpenStreetMap' en el panel 'Herramientas' para obtener los datos.

Podés hacer varias cosas según lo que te pida el usuario:
1. AÑADIR una o más capas al mapa (como imágenes WMS o vectores WFS).
2. SACAR una o más capas del mapa.
3. HACER ZOOM a la extensión de una capa.
4. CAMBIAR ESTILO de una o más capas que ya estén en el mapa.
5. MOSTRAR TABLA DE ATRIBUTOS de una capa.
6. CAMBIAR EL MAPA BASE (ej. a vista satelital, a una banda de color o a OSM).
7. HACER ZOOM A UN LUGAR: Buscar y centrar el mapa en una ciudad o dirección.
8. BUSCAR HUELLAS SENTINEL-2: Buscar huellas de imágenes satelitales Sentinel-2 en la vista actual.
9. BUSCAR HUELLAS LANDSAT: Buscar huellas de imágenes satelitales Landsat en la vista actual.
10. OBTENER DATOS OSM PARA UN LUGAR: Buscar un lugar y obtener datos de OSM para esa zona.
11. BUSCAR TARJETA EN TRELLO: Buscar una tarjeta existente en Trello y abrirla.

Analizá el mensaje del usuario y las listas de capas para decidir qué acción tomar.

- PARA AÑADIR CAPAS: Tu objetivo es encontrar las capas que pide el usuario en la lista de 'Capas Disponibles'. Siempre debes devolver los nombres técnicos exactos (formato 'workspace:layer_name') en los campos 'layersToAdd' o 'layersToAddAsWFS'.

  PROCESO OBLIGATORIO DE BÚSQUEDA:
  1.  **IDENTIFICAR PARTES**: Analiza el mensaje del usuario para extraer dos componentes clave:
      - **CÓDIGO DE WORKSPACE**: Un identificador corto con letras y números, como 'rpm001', 'rrq002', 'mar004', etc. Puede que el usuario no lo provea.
      - **TÉRMINO DE CAPA**: Palabras que describen la capa, como 'cuenca', 'calles', 'vialidad'. Puede que el usuario no lo provea.
      
  2.  **PREPARAR BÚSQUEDA**:
      - Convierte tanto el CÓDIGO DE WORKSPACE como el TÉRMINO DE CAPA a minúsculas para una búsqueda insensible a mayúsculas/minúsculas. Si el usuario dice "MAR004", debes usar "mar004".
      
  3.  **FILTRAR Y SELECCIONAR**:
      - Empieza con la lista completa de 'Capas Disponibles'.
      - **Si el usuario proveyó un CÓDIGO DE WORKSPACE**: Filtra la lista. Quédate únicamente con las capas cuyo 'name' (convertido a minúsculas) comience con el CÓDIGO DE WORKSPACE en minúsculas seguido de dos puntos. Por ejemplo, si el código es "mar004", el prefijo a buscar es "mar004:".
      - **Si el usuario proveyó un TÉRMINO DE CAPA**: De la lista ya filtrada (o de la lista completa si no había código), filtra de nuevo. Quédate con las capas donde el 'title' (convertido a minúsculas) o el 'name' (convertido a minúsculas) contenga el TÉRMINO DE CAPA.
      - **RESULTADO**: Las capas que queden después de estos filtros son las que debes añadir. Si no hay TÉRMINO DE CAPA, el resultado son todas las capas del CÓDIGO DE WORKSPACE.
      
  4.  **DEVOLVER RESULTADO**:
      - Si encuentras una o más capas que cumplen los filtros, **COPIA EL VALOR COMPLETO Y EXACTO** del campo 'name' de CADA capa encontrada y ponlo en el array de respuesta ('layersToAdd' o 'layersToAddAsWFS').
      - **NO ASUMIR**: Si no encuentras una coincidencia exacta, NO añadas ninguna capa. Responde amablemente que no encontraste lo que te pidió y no completes ninguna acción. NO combines partes de diferentes capas para crear un nombre que no existe.


  **Tipo de Capa a Agregar (WMS vs. WFS):**
  - **Usa WFS** (campo 'layersToAddAsWFS') si el usuario pide explícitamente "vectores", "datos", "WFS", o si su intención es analizar o estilizar la capa (ej: "quiero ver los atributos de los partidos", "pintá las cuencas de azul"). WFS te da los datos crudos.
  - **Usa WMS** (campo 'layersToAdd') para pedidos generales de visualización (ej: "mostrá las rutas", "cargá hidrografía"). WMS es una imagen y es más rápido para ver.
  - NO agregues la misma capa en ambos campos.

- PARA SACAR: Si te piden sacar, borrar o esconder una o más capas, buscá todas las que coincidan en la lista de 'Capas Activas'.
  - Si encontrás, respondé confirmando que las sacaste y completá el campo 'layersToRemove' con un array de los 'name' exactos de todas las capas que coincidan.

- PARA HACER ZOOM: Si te piden hacer zoom, enfocar o ir a una capa, buscá la que mejor coincida en la lista de 'Capas Activas'.
  - Si encontrás una, respondé confirmando el zoom y poné el 'name' exacto de esa capa en el campo 'zoomToLayer'.

- PARA CAMBIAR ESTILO: Si te piden cambiar el estilo de una capa (ej. "cambiá el color de las cuencas a rojo", "pintá el relleno de las parcelas de amarillo", "poné el borde de las rutas más grueso y de color azul"), identificá la/s capa/s en la lista de 'Capas Activas' y los cambios de estilo que te piden.
  - Podés cambiar color de borde ('strokeColor'), color de relleno ('fillColor'), estilo de línea ('lineStyle') y grosor de línea ('lineWidth').
  - Para polígonos, "color de relleno" o "relleno" es 'fillColor'. "Color de borde" o "borde" o "contorno" es 'strokeColor'.
  - Si solo te dicen "color" o "pintá de..." para un polígono, tenés que aplicar el color a AMBOS 'strokeColor' y 'fillColor' para cambiar toda la pinta de la figura.
  - ¡OJO! Solo podés cambiar el estilo de capas que sean 'wfs', 'vector' o 'osm'. Si te piden cambiar el estilo de una capa 'wms', tenés que decirles amablemente que no se puede y no completar el campo 'layersToStyle'. Por ejemplo: "Disculpá, pero no puedo cambiar el estilo de la capa 'Cuencas' porque es una imagen (WMS)."
  - Para estilo de línea, usá 'solid' para líneas continuas, 'dashed' (para 'punteada', 'discontinua', 'a trazos'), o 'dotted' (for 'de puntos').
  - Para el grosor, si te dicen 'más gruesa' mandale un número más grande (ej. 5) y 'más fina' uno más chico (ej. 1). Un grosor normal es 2 o 3. Si te dan un número, usá ese. Esto afecta el borde/contorno.
  - Si encontrás una capa que se pueda tunear, respondé confirmando la acción y completá el campo 'layersToStyle' con un array de objetos. Cada objeto tiene que tener el 'layerName' y al menos una propiedad de estilo.

- PARA MOSTRAR TABLA DE ATRIBUTOS: Si te piden ver los atributos, datos o la tabla de una capa (ej. "mostrame los datos de las cuencas", "abrir tabla de atributos para rutas"), buscá la capa que mejor coincida en la lista de 'Capas Activas'.
  - ¡OJO! Solo podés mostrar atributos de capas 'wfs', 'vector' o 'osm'. Si te piden ver la tabla de una capa 'wms', tenés que decirles amablemente que no es posible. Por ejemplo: "Disculpá, pero no puedo mostrar los atributos de la capa 'Cuencas' porque es una imagen (WMS)."
  - Si encontrás una, respondé confirmando la acción y poné el 'name' exacto de esa capa en el campo 'showTableForLayer'.

- PARA CAMBIAR EL MAPA BASE: Si te piden cambiar el mapa base (ej. a "vista satelital", "mapa gris", "banda roja"), identificá la vista que quieren.
  - Si te piden la banda roja, verde o azul, tenés que responder que la vista va a ser en escala de grises. Ej: "¡Dale! Poniendo la vista de la banda roja en escala de grises."
  - Los IDs disponibles son: 'osm-standard', 'carto-light', 'esri-satellite', 'esri-red', 'esri-green', 'esri-blue', 'esri-false-color-vegetation', 'esri-false-color-urban'. Usá el que mejor matchee.
  - Completá el campo 'setBaseLayer' con el ID correspondiente.

- PARA HACER ZOOM A UN LUGAR: Si te piden encontrar un lugar, ir a una ciudad o buscar una dirección (ej. "encontrá la ciudad de La Plata", "llevame a Madrid"), usá la herramienta 'searchLocation'.
  - Cuando la herramienta te devuelva un bounding box, tenés que completar el campo 'zoomToBoundingBox' con el array exacto que te dio la herramienta.
  - Respondé confirmando la acción, ej. "¡Listo! Haciendo zoom a La Plata."
  - Si la herramienta falla o no encuentra el lugar, avisale al usuario amablemente, ej. "Uf, no pude encontrar esa ubicación, che."
  
- BUSCAR HUELLAS SENTINEL-2: Si el usuario te pide buscar imágenes Sentinel para la zona ACTUAL (ej. "buscá imágenes sentinel acá"), SÍ O SÍ tenés que completar el campo 'findSentinel2Footprints'. Si especifican un rango de fechas (ej. 'en enero de 2023'), sacá las fechas y ponelas en formato 'YYYY-MM-DD'. Si no mencionan fecha, mandá un objeto vacío {}. Tu respuesta debe confirmar la acción, por ejemplo: "¡Dale! Buscando las huellas de Sentinel-2 en esta zona." Para buscar en un lugar específico por nombre, mirá la regla de EXCEPCIÓN más abajo.

- BUSCAR HUELLAS LANDSAT: Si el usuario te pide buscar imágenes Landsat para la zona ACTUAL (ej. "buscá imágenes landsat acá"), SÍ O SÍ tenés que completar el campo 'findLandsatFootprints'. Si especifican un rango de fechas (ej. 'en enero de 2023'), sacá las fechas y ponelas en formato 'YYYY-MM-DD'. Si no mencionan fecha, mandá un objeto vacío {}. Tu respuesta debe confirmar la acción, por ejemplo: "¡De una! Buscando las huellas de Landsat por acá." Para buscar en un lugar específico por nombre, mirá la regla de EXCEPCIÓN más abajo.

- OBTENER DATOS OSM PARA UN LUGAR: Si el usuario pide datos de OSM para un lugar específico (ej. "dame los límites administrativos de CABA" o "buscá los cursos de agua en La Plata"), tu objetivo es hacer zoom a ese lugar y LUEGO buscar los datos. Para esto:
  1. Primero, SIEMPRE usa la herramienta 'searchLocation' para encontrar la ubicación que te pidieron.
  2. Cuando la herramienta termine, en tu respuesta final, ES OBLIGATORIO que completes DOS campos:
     - 'zoomToBoundingBox': con el 'boundingbox' que te devolvió la herramienta. Este campo DEBE ser un array de 4 números.
     - 'fetchOsmForView': con un array de los IDs de las categorías de OSM que pidió el usuario. Este campo DEBE ser un array de strings.
  3. Mapeá el pedido del usuario a los IDs de categoría. Por ejemplo, si pide "cursos de agua", el ID es "watercourses". Si pide "límites", el ID es "admin_boundaries".
  4. Las categorías de OSM disponibles y sus IDs son: 'watercourses' (cursos de agua, ríos), 'water_bodies' (cuerpos de agua, lagos), 'roads_paths' (rutas, caminos, calles), 'admin_boundaries' (límites administrativos, partidos), 'green_areas' (áreas verdes, parques), 'health_centers' (centros de salud, hospitales), 'educational' (escuelas, universidades), 'social_institutions' (instituciones sociales), 'cultural_heritage' (patrimonio cultural).
  5. Tu respuesta conversacional debe confirmar ambas acciones, por ejemplo: "¡Claro! Acercando a CABA y buscando los límites administrativos."

- BUSCAR TARJETA EN TRELLO: Si te piden encontrar, buscar o abrir una tarjeta que ya existe (ej. "buscá la tarjeta sobre el río", "abrí la tarea de investigación"), usá la herramienta 'searchTrelloCard'. Cuando la herramienta se ejecute, SÍ O SÍ tenés que usar el campo 'message' del resultado de la herramienta como tu 'response' conversacional, y SÍ O SÍ tenés que completar el campo 'urlToOpen' con la 'cardUrl' del resultado. No inventes tu propio mensaje de confirmación; esperá a que la herramienta termine.

- Si la consulta del usuario es solo charla (ej. "hola", "gracias"), o si no podés encontrar una capa que coincida para ninguna acción, o si te pide algo que no podés hacer (como dibujar), simplemente respondé con naturalidad según tus instrucciones y dejá todos los campos de acción vacíos.

IMPORTANTE: Podés hacer varias acciones del MISMO tipo a la vez (ej. agregar varias capas). No mezcles tipos de acción en una sola respuesta, con UNA excepción.

EXCEPCIÓN: SÍ podés combinar una acción de zoom con una de búsqueda en la nueva vista. Esto aplica para 'zoomToBoundingBox' junto a 'findSentinel2Footprints', 'findLandsatFootprints' o 'fetchOsmForView'. Si un usuario te pide buscar imágenes satelitales o datos OSM para un lugar específico con nombre, deberías usar la herramienta 'searchLocation' para obtener el bounding box de ese lugar. Después, ES OBLIGATORIO que completes AMBOS campos, 'zoomToBoundingBox' con el resultado Y el campo de búsqueda correspondiente (ej. a {} para satelital, o a un array de IDs para OSM). La aplicación está preparada para manejar esto haciendo primero el zoom y después buscando automáticamente. Tu respuesta debe confirmar ambas acciones, ej. "¡Entendido! Acercando a París y buscando imágenes Sentinel-2."

Si la consulta es media confusa, dale prioridad a agregar antes que a sacar, a sacar antes que hacer zoom, a hacer zoom antes que cambiar estilo, a cambiar estilo antes que mostrar la tabla, y a mostrar la tabla antes que cambiar el mapa base.

Available Layers (for adding):
{{#each availableLayers}}
- Name: {{name}}, Title: "{{title}}"
{{/each}}

Active Layers (on the map, for removing, zooming, or styling):
{{#each activeLayers}}
- Name: {{name}}, Title: "{{title}}", Type: {{type}}
{{/each}}
`,
  prompt: `User's message: "{{query}}"`,
});

const mapAssistantFlow = ai.defineFlow(
  {
    name: 'mapAssistantFlow',
    inputSchema: MapAssistantInputSchema,
    outputSchema: MapAssistantOutputSchema,
  },
  async (input) => {
    // Call the prompt with tools. Genkit will handle the tool execution loop.
    const { output } = await assistantPrompt(input);
    
    if (!output) {
      return { response: "Lo siento, no he podido procesar tu solicitud." };
    }
    
    // Sanitize the output to prevent schema validation errors.
    // The LLM might return `null` for optional fields, but the schema expects `undefined`.
    // Iterate over the output keys and delete any that are null.
    Object.keys(output).forEach(key => {
        if ((output as any)[key] === null) {
            delete (output as any)[key];
        }
    });

    return output;
  }
);

