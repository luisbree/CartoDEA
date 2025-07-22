
"use client";

import OlStyleParser from "geostyler-openlayers-parser";
import SldParser from "geostyler-sld-parser";
import type { Style as OlStyle, StyleFunction as OlStyleFunction } from 'ol/style/Style';

// This function fetches an SLD file from GeoServer's REST API and returns an OpenLayers style function.
export async function getStyleFromSld(layerName: string, styleName: string, geoServerUrl: string): Promise<OlStyleFunction | OlStyle | undefined> {
  const baseUrl = geoServerUrl.replace(/\/$/, '');
  
  // Construct the URL to the SLD file via the REST API
  const getStyleUrl = `${baseUrl}/rest/styles/${styleName}.sld`;

  const proxyUrl = `/api/geoserver-proxy?url=${encodeURIComponent(getStyleUrl)}&cacheBust=${Date.now()}`;
  
  console.log(`[DEBUG] getStyleFromSld: Fetching SLD for style '${styleName}' via REST API from proxy URL: ${proxyUrl}`);
  
  try {
    const response = await fetch(proxyUrl);
    console.log(`[DEBUG] getStyleFromSld: Proxy response status for style '${styleName}': ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`[DEBUG] Could not fetch SLD for style '${styleName}'. Server responded with status ${response.status}. Body: ${errorText}`);
      return undefined;
    }
    const sldString = await response.text();
    
    if (!sldString || sldString.toLowerCase().includes('no such style')) {
        console.warn(`[DEBUG] GeoServer indicates no style named '${styleName}' was found.`);
        return undefined;
    }

    const sldParser = new SldParser();
    const { output: geoStylerStyle, errors } = await sldParser.readStyle(sldString);

    if (errors && errors.length > 0) {
      errors.forEach(e => console.warn('[DEBUG] GeoStyler SLD Parsing Warning:', e));
    }
    
    if (!geoStylerStyle) {
      console.warn(`[DEBUG] Could not parse SLD for style '${styleName}'. The parsed GeoStyler object is empty.`);
      return undefined;
    }
    console.log(`[DEBUG] Successfully parsed SLD for style '${styleName}' to GeoStyler format:`, geoStylerStyle);

    const olParser = new OlStyleParser();
    const { output: olStyle, errors: olErrors } = await olParser.writeStyle(geoStylerStyle);

    if (olErrors && olErrors.length > 0) {
      olErrors.forEach(e => console.warn('[DEBUG] GeoStyler OL Parsing Warning:', e));
    }

    if (!olStyle) {
      console.warn(`[DEBUG] Could not convert GeoStyler style to OpenLayers style for '${styleName}'.`);
      return undefined;
    }
    console.log(`[DEBUG] Successfully converted GeoStyler style for '${styleName}' to OpenLayers style function.`);

    return olStyle;

  } catch (error) {
    console.error(`[DEBUG] An unexpected error occurred in getStyleFromSld for style '${styleName}':`, error);
    return undefined;
  }
}
