import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const endpoint = searchParams.get('endpoint');

  if (!endpoint) {
    return NextResponse.json({ error: 'Endpoint is required' }, { status: 400 });
  }

  const apiKey = 'b676ecb8db4d746383bfced2a2cbe94e';
  const baseUrl = 'http://api.coinlayer.com/';

  const externalApiParams = new URLSearchParams();
  searchParams.forEach((value, key) => {
    if (key !== 'endpoint' && key !== 'access_key') {
      externalApiParams.set(key, value);
    }
  });
  externalApiParams.set('access_key', apiKey);

  const apiUrl = `${baseUrl}${endpoint}?${externalApiParams.toString()}`;

  try {
    const apiResponse = await fetch(apiUrl, {
      headers: { 
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      cache: 'no-store'
    });

    if (!apiResponse.ok) {
        const errorBody = await apiResponse.json().catch(() => ({}));
        console.error(`Proxied Coinlayer request to ${apiUrl} failed: ${apiResponse.status} ${apiResponse.statusText}`, errorBody);
        return NextResponse.json(
            { error: `API request failed with status ${apiResponse.status}`, details: errorBody },
            { status: apiResponse.status }
        );
    }

    const data = await apiResponse.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Failed to fetch from proxied Coinlayer API:', error);
    return NextResponse.json({ error: 'Failed to fetch from external API', message: error.message }, { status: 500 });
  }
}
