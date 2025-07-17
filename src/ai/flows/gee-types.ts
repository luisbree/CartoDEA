/**
 * @fileOverview Types and schemas for the GEE flow.
 *
 * - GeeTileLayerInput - The input type for the GEE flow.
 * - GeeTileLayerOutput - The return type for the GEE flow.
 * - GeeTileLayerInputSchema - The Zod schema for the GEE flow input.
 * - GeeTileLayerOutputSchema - The Zod schema for the GEE flow output.
 */

import { z } from 'zod';

const GeeAoiSchema = z.object({
    minLon: z.number(),
    minLat: z.number(),
    maxLon: z.number(),
    maxLat: z.number(),
});

export const GeeTileLayerInputSchema = z.object({
  aoi: GeeAoiSchema.describe("The Area of Interest as a bounding box."),
  zoom: z.number().describe("The current zoom level of the map."),
  bandCombination: z.enum(['URBAN_FALSE_COLOR', 'SWIR_FALSE_COLOR', 'BSI', 'JRC_WATER_OCCURRENCE']).describe("The band combination or index to use for the layer."),
});
export type GeeTileLayerInput = z.infer<typeof GeeTileLayerInputSchema>;

export const GeeTileLayerOutputSchema = z.object({
  tileUrl: z.string().describe("The XYZ tile URL template for the generated GEE layer."),
});
export type GeeTileLayerOutput = z.infer<typeof GeeTileLayerOutputSchema>;
