import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const endpoint = searchParams.get('endpoint');

  if (!endpoint) {
    return NextResponse.json({ error: 'Endpoint is required' }, { status: 400 });
  }

  const apiKey = '6431078d4fc8bf5d4097027ee62c2c0dc4e0';
  const baseUrl = 'https://currencyapi.net/api/v1/';

  // Re-create the search params for the external API, excluding our 'endpoint' param.
  const externalApiParams = new URLSearchParams();
  searchParams.forEach((value, key) => {
    if (key !== 'endpoint') {
      externalApiParams.set(key, value);
    }
  });
  externalApiParams.set('key', apiKey);
  externalApiParams.set('output', 'json');

  const apiUrl = `${baseUrl}${endpoint}?${externalApiParams.toString()}`;

  try {
    const apiResponse = await fetch(apiUrl, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });

    if (!apiResponse.ok) {
        const errorBody = await apiResponse.json().catch(() => ({}));
        console.error(`Proxied WorldCurrencyAPI request to ${apiUrl} failed: ${apiResponse.status} ${apiResponse.statusText}`, errorBody);
        return NextResponse.json(
            { error: `API request failed with status ${apiResponse.status}`, details: errorBody },
            { status: apiResponse.status }
        );
    }

    const data = await apiResponse.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Failed to fetch from proxied WorldCurrencyAPI API:', error);
    return NextResponse.json({ error: 'Failed to fetch from external API', message: error.message }, { status: 500 });
  }
}
