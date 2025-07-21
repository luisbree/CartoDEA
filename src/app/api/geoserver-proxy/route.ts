
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const geoServerUrl = searchParams.get('url');

  if (!geoServerUrl) {
    return NextResponse.json({ error: 'GeoServer URL is required' }, { status: 400 });
  }

  // --- START OF AUTHENTICATION LOGIC ---
  const geoserverUser = process.env.GEOSERVER_USER;
  const geoserverPassword = process.env.GEOSERVER_PASSWORD;

  const headers = new Headers({
    'User-Agent': 'MapExplorerApp/1.0 (Proxy)',
    'Accept': 'application/xml, text/xml, application/json, */*',
  });

  // Conditionally add Basic Authentication header ONLY for REST API requests
  // This prevents sending auth to public WMS/WFS endpoints that don't need it.
  if (geoServerUrl.includes('/rest/') && geoserverUser && geoserverPassword) {
    const basicAuth = btoa(`${geoserverUser}:${geoserverPassword}`);
    headers.set('Authorization', `Basic ${basicAuth}`);
  }
  // --- END OF AUTHENTICATION LOGIC ---

  try {
    const response = await fetch(geoServerUrl, {
      method: 'GET',
      cache: 'no-store',
      headers: headers, // Use the new headers object with potential auth
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

    return NextResponse.json({ error: 'Proxy Connection Failed', details: details }, { status: 502 });
  }
}
