"use client";

import OlStyleParser from "geostyler-openlayers-parser";
import SldParser from "geostyler-sld-parser";
import type { Style as OlStyle, StyleFunction as OlStyleFunction } from 'ol/style/Style';

// This function fetches an SLD file from a GeoServer, parses it, and returns an OpenLayers style function.
export async function getStyleFromSld(styleName: string, geoServerUrl: string): Promise<OlStyleFunction | OlStyle | undefined> {
  // Ensure the URL does not have a trailing slash for consistency
  const baseUrl = geoServerUrl.replace(/\/$/, '');
  
  // Construct the URL to fetch the SLD file using GeoServer's REST API
  const sldUrl = `${baseUrl}/rest/styles/${styleName}.sld`;

  // Use the application's proxy to bypass CORS issues
  const proxyUrl = `/api/geoserver-proxy?url=${encodeURIComponent(sldUrl)}&cacheBust=${Date.now()}`;
  
  try {
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      console.warn(`Could not fetch SLD style '${styleName}'. Server responded with status ${response.status}.`);
      return undefined;
    }
    const sldString = await response.text();
    
    if (sldString.toLowerCase().includes('nosuchstyle')) {
      console.warn(`SLD style '${styleName}' not found on GeoServer.`);
      return undefined;
    }

    // Initialize the SLD parser from GeoStyler
    const sldParser = new SldParser();
    const { output: geoStylerStyle, errors } = await sldParser.readStyle(sldString);

    if (errors && errors.length > 0) {
      errors.forEach(e => console.warn('GeoStyler SLD Parsing Warning:', e));
    }
    
    if (!geoStylerStyle) {
      console.warn(`Could not parse SLD style '${styleName}'.`);
      return undefined;
    }

    // Initialize the OpenLayers parser from GeoStyler
    const olParser = new OlStyleParser();
    const { output: olStyle, errors: olErrors } = await olParser.writeStyle(geoStylerStyle);

    if (olErrors && olErrors.length > 0) {
      olErrors.forEach(e => console.warn('GeoStyler OL Parsing Warning:', e));
    }

    if (!olStyle) {
      console.warn(`Could not convert GeoStyler style to OpenLayers style for '${styleName}'.`);
      return undefined;
    }

    // The parser returns a StyleFunction, which is what we need for complex styles with rules.
    return olStyle;

  } catch (error) {
    console.error(`Error processing SLD style '${styleName}':`, error);
    return undefined; // Return undefined on error to allow fallback to default styles
  }
}
