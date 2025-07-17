import { type NextRequest, NextResponse } from 'next/server';

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  const nominatimParams = new URLSearchParams({
    format: 'json',
    q: query,
    limit: '10',
    addressdetails: '1',
  });

  const nominatimUrl = `${NOMINATIM_BASE_URL}?${nominatimParams.toString()}`;

  try {
    // As per Nominatim's usage policy, a custom User-Agent is required.
    const response = await fetch(nominatimUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Map Explorer App/1.0',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: `Nominatim API error: ${response.statusText}`, details: errorText }, { status: response.status });
    }

    const data = await response.json();

    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    console.error('Nominatim proxy error:', error);
    return NextResponse.json({ error: 'Failed to fetch from Nominatim', details: error.message || String(error) }, { status: 500 });
  }
}
