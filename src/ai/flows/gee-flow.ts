
'use server';
/**
 * @fileOverview A flow for generating Google Earth Engine tile layers.
 *
 * - getGeeTileLayer - Generates a tile layer URL for a given Area of Interest.
 */

import { ai } from '@/ai/genkit';
import ee from '@google/earthengine';
import { promisify } from 'util';
import type { GeeTileLayerInput, GeeTileLayerOutput } from './gee-types';
import { GeeTileLayerInputSchema, GeeTileLayerOutputSchema } from './gee-types';
import { z } from 'zod';

// Main exported function for the frontend to call
export async function getGeeTileLayer(input: GeeTileLayerInput): Promise<GeeTileLayerOutput> {
  return geeTileLayerFlow(input);
}

// New exported function for authentication
export async function authenticateWithGee(): Promise<{ success: boolean; message: string; }> {
    try {
        await initializeEe();
        return { success: true, message: 'Autenticación con Google Earth Engine exitosa.' };
    } catch (error: any) {
        // Re-throw the error so the frontend can catch the specific message and its details.
        // The previous implementation was catching the error and returning an object,
        // which breaks the error propagation chain for Next.js Server Actions.
        throw new Error(`Fallo en la autenticación con GEE: ${error.message}`);
    }
}


// Define the Genkit flow
const geeTileLayerFlow = ai.defineFlow(
  {
    name: 'geeTileLayerFlow',
    inputSchema: GeeTileLayerInputSchema,
    outputSchema: GeeTileLayerOutputSchema,
  },
  async (input) => {
    try {
      await initializeEe();

      const { aoi, bandCombination, startDate, endDate, zoom, minElevation, maxElevation } = input;
      const geometry = ee.Geometry.Rectangle([aoi.minLon, aoi.minLat, aoi.maxLon, aoi.maxLat]);
      
      let finalImage;
      let visParams: { bands?: string[]; min: number; max: number; gamma?: number, palette?: string[] };
      
      const DYNAMIC_WORLD_PALETTE = [
        '#419BDF', // water
        '#397D49', // trees
        '#88B053', // grass
        '#7A87C6', // flooded_vegetation
        '#E49635', // crops
        '#DFC35A', // shrub_and_scrub
        '#C4281B', // built
        '#A59B8F', // bare
        '#B39FE1', // snow_and_ice
      ];

      // Base Sentinel-2 Image Collection
      if (bandCombination !== 'JRC_WATER_OCCURRENCE' && bandCombination !== 'OPENLANDMAP_SOC' && bandCombination !== 'DYNAMIC_WORLD' && bandCombination !== 'NASADEM_ELEVATION') {
          let s2ImageCollection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
            .filterBounds(geometry)
            .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20));
          
          // Apply date filter if provided
          if (startDate && endDate) {
              s2ImageCollection = s2ImageCollection.filterDate(startDate, endDate);
          } else {
              // Default to the last year if no dates are provided
              s2ImageCollection = s2ImageCollection.filterDate(ee.Date(Date.now()).advance(-1, 'year'), ee.Date(Date.now()));
          }

          // Using median() is a good way to get a composite with low cloud cover
          const s2Image = s2ImageCollection.median();
          
          switch (bandCombination) {
            case 'SWIR_FALSE_COLOR':
              finalImage = s2Image;
              visParams = {
                bands: ['B12', 'B8A', 'B4'], // SWIR, NIR, Red
                min: 0,
                max: 3000,
              };
              break;

            case 'BSI':
              // Bare Soil Index formula: BSI = ((B11+B4) - (B8+B2)) / ((B11+B4) + (B8+B2))
              finalImage = s2Image.expression(
                '((B11 + B4) - (B8 + B2)) / ((B11 + B4) + (B8 + B2))',
                {
                  'B11': s2Image.select('B11'), // SWIR 1
                  'B4': s2Image.select('B4'),   // Red
                  'B8': s2Image.select('B8'),   // NIR
                  'B2': s2Image.select('B2')    // Blue
                }
              ).rename('BSI');
              visParams = {
                min: -1, 
                max: 1, 
                palette: ['#2ca25f', '#ffffbf', '#fdae61', '#d7191c'] // Green -> Yellow -> Orange -> Red (vegetation to bare soil)
              };
              break;
              
            case 'NDVI':
              // NDVI formula: NDVI = (NIR - Red) / (NIR + Red)
              // For Sentinel-2, this is (B8 - B4) / (B8 + B4)
              finalImage = s2Image.normalizedDifference(['B8', 'B4']).rename('NDVI');
              visParams = {
                min: -0.2, // Min NDVI for non-vegetated areas
                max: 1.0,  // Max NDVI for dense vegetation
                palette: [
                  '#a50026', '#d73027', '#f46d43', '#fdae61', '#fee08b', // Reds to Yellows (low NDVI)
                  '#ffffbf', // Yellow-Green
                  '#d9ef8b', '#a6d96a', '#66bd63', '#1a9850', '#006837'  // Greens (high NDVI)
                ]
              };
              break;
            
            case 'URBAN_FALSE_COLOR':
            default:
              finalImage = s2Image;
              visParams = {
                bands: ['B8', 'B4', 'B3'], // NIR, Red, Green -> False Color for Urban
                min: 0,
                max: 3000,
              };
              break;
          }
      } else if (bandCombination === 'DYNAMIC_WORLD') {
          const dwCollection = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')
            .filterBounds(geometry)
            .filterDate(startDate, endDate);
            
          finalImage = ee.Image(dwCollection.mode()).select('label');
          visParams = {
            min: 0,
            max: 8,
            palette: DYNAMIC_WORLD_PALETTE
          };
          
      } else if (bandCombination === 'NASADEM_ELEVATION') {
          finalImage = ee.Image('NASA/NASADEM_HGT/001').select('elevation');
          visParams = {
              min: minElevation ?? 0,
              max: maxElevation ?? 4000,
              palette: ['006633', 'E5FFCC', '662A00', 'D8D8D8', 'FFFFFF'] // Terrain palette
          };

      } else if (bandCombination === 'OPENLANDMAP_SOC') {
          finalImage = ee.Image("OpenLandMap/SOL/SOL_ORGANIC-CARBON_USDA-6A1C_M/v02").select('b0');
          visParams = {
            min: 0,
            max: 100, // The values are in dg/kg (g/kg * 10)
            palette: ['#FFFFE5', '#FFF7BC', '#FEE391', '#FEC44F', '#FE9929', '#EC7014', '#CC4C02', '#8C2D04'] // Yellow to brown
          };
      } else { // JRC_WATER_OCCURRENCE
          finalImage = ee.Image('JRC/GSW1_4/GlobalSurfaceWater').select('occurrence');
          visParams = {
            min: 0,
            max: 100,
            palette: ['#FFFFFF', 'lightblue', 'blue'] // White to light blue to dark blue
          };
      }
      
      const mapDetails = await new Promise<any>((resolve, reject) => {
        finalImage.getMap(visParams, (map: any, error: string | null) => {
            if (error) {
                return reject(new Error(error));
            }
            if (!map || !map.urlFormat) {
                return reject(new Error('Respuesta inválida de getMap.'));
            }
            resolve(map);
        });
      });
      
      const tileUrl = mapDetails.urlFormat.replace('{x}', '{x}').replace('{y}', '{y}').replace('{z}', '{z}');
      
      return { tileUrl };

    } catch (error: any) {
        console.error("Earth Engine Error:", error);
        // Provide more specific error messages if possible
        if (error.message && error.message.includes('Service account not specified')) {
            throw new Error('El servidor no está configurado para la autenticación con Earth Engine. Contacte al administrador.');
        } else if (error.message && error.message.includes('computation timed out')) {
            throw new Error('El procesamiento en Earth Engine tardó demasiado. Intente con un área más pequeña.');
        }
        // Throw a more informative error message
        throw new Error(`Ocurrió un error al generar la capa de Earth Engine: ${error.message || 'Error desconocido'}`);
    }
  }
);


// --- Earth Engine Initialization ---
let eeInitialized: Promise<void> | null = null;

async function authenticateAndInitialize() {
  const authType = process.env.EE_AUTH_TYPE;

  if (authType === 'SERVICE_ACCOUNT') {
    const serviceAccountKey = process.env.EE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
      throw new Error('La variable de entorno EE_SERVICE_ACCOUNT_KEY no está configurada para la autenticación GEE.');
    }
    try {
      const keyObject = JSON.parse(serviceAccountKey);
      
      const privateKeyAuth = promisify(ee.data.authenticateViaPrivateKey).bind(ee.data);
      await privateKeyAuth(keyObject);

    } catch (e: any) {
      if (e instanceof SyntaxError) {
        throw new Error('No se pudo parsear el JSON de la clave de la cuenta de servicio (EE_SERVICE_ACCOUNT_KEY). Verifique que sea una cadena JSON válida de una sola línea.');
      }
      throw new Error(`Fallo en la autenticación con la cuenta de servicio de Earth Engine: ${e.message}`);
    }
  } else {
    try {
      const adcAuth = promisify(ee.data.authenticateViaAADC).bind(ee.data);
      await adcAuth({});
    } catch(e: any) {
       throw new Error(`La autenticación a través de Credenciales Predeterminadas de Aplicación falló. Asegúrese de que su entorno esté configurado correctamente (por ejemplo, a través de 'gcloud auth application-default login'). Error: ${e.message}`);
    }
  }

  // After authentication, initialize the library
  try {
    const initialize = promisify(ee.initialize).bind(ee);
    await initialize(null, null);
    console.log('Earth Engine initialized successfully.');
  } catch (e: any) {
    throw new Error(`Fallo al inicializar Earth Engine después de la autenticación: ${e.message}`);
  }
}

function initializeEe(): Promise<void> {
  if (eeInitialized === null) {
    eeInitialized = authenticateAndInitialize().catch(err => {
      eeInitialized = null; // Reset on failure to allow retry
      throw err;
    });
  }
  return eeInitialized;
}
