
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const geoServerUrl = searchParams.get('url');

  if (!geoServerUrl) {
    return NextResponse.json({ error: 'GeoServer URL is required' }, { status: 400 });
  }

  const headers = new Headers({
    'User-Agent': 'MapExplorerApp/1.0 (Proxy)',
    'Accept': 'application/xml, text/xml, application/json, */*',
  });
  
  // --- START OF NEW AUTHENTICATION LOGIC ---
  // Conditionally add authentication only for REST API requests.
  // This avoids breaking public WMS/WFS endpoints.
  const GEOSERVER_USER = process.env.GEOSERVER_USER;
  const GEOSERVER_PASSWORD = process.env.GEOSERVER_PASSWORD;

  if (geoServerUrl.includes('/rest/') && GEOSERVER_USER && GEOSERVER_PASSWORD) {
    const credentials = Buffer.from(`${GEOSERVER_USER}:${GEOSERVER_PASSWORD}`).toString('base64');
    headers.set('Authorization', `Basic ${credentials}`);
  }
  // --- END OF NEW AUTHENTICATION LOGIC ---

  try {
    const response = await fetch(geoServerUrl, {
      method: 'GET',
      cache: 'no-store',
      headers: headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
       if (response.headers.get('content-type')?.includes('xml') || response.headers.get('content-type')?.includes('html') || response.headers.get('content-type')?.includes('sld')) {
         return new NextResponse(errorText, {
          status: response.status,
          headers: { 'Content-Type': response.headers.get('content-type') || 'text/plain' },
        });
      }
      return NextResponse.json({ error: `GeoServer error: ${response.statusText}`, details: errorText }, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const data = await response.text();

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', contentType);
    responseHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    responseHeaders.set('Pragma', 'no-cache');
    responseHeaders.set('Expires', '0');

    return new NextResponse(data, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('Proxy error:', error);
    
    let details = `The application server failed to connect to the GeoServer URL. This could be due to a network issue (e.g., firewall, incorrect IP address) or the GeoServer being offline. URL: ${geoServerUrl}`;
    
    if (error.cause && typeof error.cause === 'object' && 'code' in error.cause) {
      const cause = error.cause as { code: string };
      const hostname = new URL(geoServerUrl).hostname;

      if (cause.code === 'ENOTFOUND' || cause.code === 'EAI_AGAIN') {
        details = `The hostname for the GeoServer ('${hostname}') could not be resolved. Please check the URL and your network's DNS settings.`;
      } else if (cause.code === 'ECONNREFUSED') {
        details = `The connection to the GeoServer was refused by the server at ${geoServerUrl}. Please ensure the server is running and the port is correct.`;
      }
    }