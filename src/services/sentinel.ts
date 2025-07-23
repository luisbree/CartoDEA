
'use client';

import GeoJSON from 'ol/format/GeoJSON';
import Feature from 'ol/Feature';
import { Geometry } from 'ol/geom';
import { transformExtent, type ProjectionLike } from 'ol/proj';
import type { Extent } from 'ol/extent';
import { nanoid } from 'nanoid';

const SENTINEL_API_URL = 'https://catalogue.dataspace.copernicus.eu/resto/api/collections/Sentinel2/search.json';

/**
 * Finds Sentinel-2 footprints within a given map extent.
 * @param extent The map extent in the map's projection.
 * @param mapProjection The projection of the map.
 * @param startDate Optional start date for the search (YYYY-MM-DD).
 * @param completionDate Optional end date for the search (YYYY-MM-DD).
 * @returns A promise that resolves to an array of OpenLayers Features.
 */
export async function findSentinel2Footprints(
    extent: Extent, 
    mapProjection: ProjectionLike, 
    startDate?: string, 
    completionDate?: string
): Promise<Feature<Geometry>[]> {
  try {
    const extent4326 = transformExtent(extent, mapProjection, 'EPSG:4326');
    const [minX, minY, maxX, maxY] = extent4326;

    const params = new URLSearchParams({
      maxRecords: '50',
      productType: 'S2MSI2A',
      cloudCover: '[0,90]',
      box: `${minX},${minY},${maxX},${maxY}`,
    });

    if (startDate) {
      params.append('startDate', `${startDate}T00:00:00.000Z`);
    }
    if (completionDate) {
      params.append('completionDate', `${completionDate}T23:59:59.999Z`);
    }

    const fullUrl = `${SENTINEL_API_URL}?${params.toString()}`;
    const response = await fetch(fullUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Sentinel API request URL failed:", fullUrl);
      throw new Error(`Sentinel API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.features || data.features.length === 0) {
      return [];
    }

    // Format the GeoJSON features into OpenLayers features
    const geojsonFormat = new GeoJSON({
      featureProjection: mapProjection, // Project GeoJSON (EPSG:4326) to our map's projection
      dataProjection: 'EPSG:4326',
    });

    // Add a preview URL and a browser URL to the properties
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
        // The UUID is the feature's top-level ID. Use it to build a link to the data browser.
        if (originalFeature.id) {
            feature.set('browser_url', `https://browser.dataspace.copernicus.eu/?uuid=${originalFeature.id}`);
        }
    });

    return features;

  } catch (error) {
    console.error('Failed to fetch Sentinel-2 footprints:', error);
    // Re-throw the error to be caught by the calling hook
    throw error;
  }
}
