
'use client';

import GeoJSON from 'ol/format/GeoJSON';
import Feature from 'ol/Feature';
import { Geometry } from 'ol/geom';
import { transformExtent, type ProjectionLike } from 'ol/proj';
import type { Extent } from 'ol/extent';
import { nanoid } from 'nanoid';

// Point to the specific collection search endpoint, similar to Sentinel's
const LANDSAT_API_URL = 'https://catalogue.dataspace.copernicus.eu/resto/api/collections/Landsat-8-9-C2-L2/search.json';


/**
 * Finds Landsat Collection 2 Level-2 footprints within a given map extent.
 * @param extent The map extent in the map's projection.
 * @param mapProjection The projection of the map.
 * @param startDate Optional start date for the search (YYYY-MM-DD).
 * @param completionDate Optional end date for the search (YYYY-MM-DD).
 * @returns A promise that resolves to an array of OpenLayers Features.
 */
export async function findLandsatFootprints(
    extent: Extent,
    mapProjection: ProjectionLike,
    startDate?: string,
    completionDate?: string
): Promise<Feature<Geometry>[]> {
  try {
    const extent4326 = transformExtent(extent, mapProjection, 'EPSG:4326');
    const [minX, minY, maxX, maxY] = extent4326;

    // With a collection-specific URL, we no longer need to specify the collection in parameters
    const params = new URLSearchParams({
      maxRecords: '50',
      productType: 'L2SP', // Landsat Collection 2 Level-2 Science Products
      cloudCover: '[0,90]',
      box: `${minX},${minY},${maxX},${maxY}`,
    });

    if (startDate) {
      params.append('startDate', `${startDate}T00:00:00.000Z`);
    }
    if (completionDate) {
      params.append('completionDate', `${completionDate}T23:59:59.999Z`);
    }

    const fullUrl = `${LANDSAT_API_URL}?${params.toString()}`;
    const response = await fetch(fullUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Landsat API request URL failed:", fullUrl);
      throw new Error(`Landsat API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.features || data.features.length === 0) {
      return [];
    }

    const geojsonFormat = new GeoJSON({
      featureProjection: mapProjection,
      dataProjection: 'EPSG:4326',
    });

    const features = geojsonFormat.readFeatures(data);
    features.forEach((feature, index) => {
        // Ensure every feature has a unique ID for selection purposes
        if (!feature.getId()) {
            feature.setId(nanoid());
        }
        const originalFeature = data.features[index];
        if(originalFeature.properties.thumbnail) {
            feature.set('preview_url', originalFeature.properties.thumbnail);
        }
        if (originalFeature.id) {
            feature.set('browser_url', `https://browser.dataspace.copernicus.eu/?uuid=${originalFeature.id}`);
        }
    });

    return features;

  } catch (error) {
    console.error('Failed to fetch Landsat footprints:', error);
    throw error;
  }
}
