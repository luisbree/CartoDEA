
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const geoServerUrl = searchParams.get('url');

  if (!geoServerUrl) {
    return NextResponse.json({ error: 'GeoServer URL is required' }, { status: 400 });
  }

  // No special headers or auth needed for public WMS/WFS requests
  try {
    const response = await fetch(geoServerUrl, {
      method: 'GET',
      cache: 'no-store', // Important for GetCapabilities and dynamic data
    });

    if (!response.ok) {
      const errorText = await response.text();
       // If the error response is XML or HTML, pass it through with the correct content type.
       // This is common for GeoServer's service exceptions.
       if (response.headers.get('content-type')?.includes('xml') || response.headers.get('content-type')?.includes('html')) {
         return new NextResponse(errorText, {
          status: response.status,
          headers: { 'Content-Type': response.headers.get('content-type') || 'text/plain' },
        });
      }
      return NextResponse.json({ error: `GeoServer error: ${response.statusText}`, details: errorText }, { status: response.status });
    }
    
    // For successful image or data responses, stream the data back.
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const data = await response.arrayBuffer();

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
    console.error('[SERVER PROXY ERROR] Proxy request failed:', error);
    
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
    
    return NextResponse.json({ error: 'Proxy request failed', details }, { status: 502 });
  }
}
