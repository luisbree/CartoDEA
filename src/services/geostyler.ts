
"use client";

import OlStyleParser from "geostyler-openlayers-parser";
import SldParser from "geostyler-sld-parser";
import type { Style as OlStyle, StyleFunction as OlStyleFunction } from 'ol/style/Style';

// This function fetches an SLD file from a GeoServer, parses it, and returns an OpenLayers style function.
export async function getStyleFromSld(layerName: string, styleName: string, geoServerUrl: string): Promise<OlStyleFunction | OlStyle | undefined> {
  // Ensure the URL does not have a trailing slash for consistency
  const baseUrl = geoServerUrl.replace(/\/$/, '');
  
  // To get the default style for a layer, we make a GetStyles request but *omit* the `styles` parameter.
  // GeoServer will then return the default SLD associated with the layer specified in the `layers` parameter.
  const getStylesUrl = `${baseUrl}/wms?service=WMS&version=1.1.0&request=GetStyles&layers=${layerName}`;

  // Use the application's proxy to bypass CORS issues
  const proxyUrl = `/api/geoserver-proxy?url=${encodeURIComponent(getStylesUrl)}&cacheBust=${Date.now()}`;
  
  console.log(`[DEBUG] getStyleFromSld: Fetching default SLD for layer '${layerName}' via GetStyles from proxy URL: ${proxyUrl}`);
  
  try {
    const response = await fetch(proxyUrl);
    console.log(`[DEBUG] getStyleFromSld: Proxy response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`[DEBUG] Could not fetch SLD for layer '${layerName}'. Server responded with status ${response.status}. Body: ${errorText}`);
      return undefined;
    }
    const sldString = await response.text();
    
    // Check if the response is actually an exception XML from GeoServer
    if (sldString.toLowerCase().includes('serviceexception')) {
      console.warn(`[DEBUG] GeoServer returned a service exception when requesting the default style for layer '${layerName}'.`);
      return undefined;
    }

    // Initialize the SLD parser from GeoStyler
    const sldParser = new SldParser();
    const { output: geoStylerStyle, errors } = await sldParser.readStyle(sldString);

    if (errors && errors.length > 0) {
      errors.forEach(e => console.warn('[DEBUG] GeoStyler SLD Parsing Warning:', e));
    }
    
    if (!geoStylerStyle) {
      console.warn(`[DEBUG] Could not parse SLD for layer '${layerName}'. The parsed GeoStyler object is empty.`);
      return undefined;
    }
    console.log(`[DEBUG] Successfully parsed SLD for layer '${layerName}' to GeoStyler format:`, geoStylerStyle);

    // Initialize the OpenLayers parser from GeoStyler
    const olParser = new OlStyleParser();
    const { output: olStyle, errors: olErrors } = await olParser.writeStyle(geoStylerStyle);

    if (olErrors && olErrors.length > 0) {
      olErrors.forEach(e => console.warn('[DEBUG] GeoStyler OL Parsing Warning:', e));
    }

    if (!olStyle) {
      console.warn(`[DEBUG] Could not convert GeoStyler style to OpenLayers style for '${layerName}'.`);
      return undefined;
    }
    console.log(`[DEBUG] Successfully converted GeoStyler style for '${layerName}' to OpenLayers style function:`, olStyle);

    // The parser returns a StyleFunction, which is what we need for complex styles with rules.
    return olStyle;

  } catch (error) {
    console.error(`[DEBUG] Error processing SLD for layer '${layerName}':`, error);
    return undefined; // Return undefined on error to allow fallback to default styles
  }
}
