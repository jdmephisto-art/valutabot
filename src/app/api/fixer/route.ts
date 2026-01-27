import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const endpoint = searchParams.get('endpoint');

  if (!endpoint) {
    return NextResponse.json({ error: 'Endpoint is required' }, { status: 400 });
  }

  // !!! ВАЖНО: Замените 'YOUR_FIXER_API_KEY' на ваш реальный ключ API от Fixer.io !!!
  const apiKey = '4d77f3071042556fbb6255cc47e4f9c4';
  const baseUrl = 'http://data.fixer.io/api/';

  const externalApiParams = new URLSearchParams();
  searchParams.forEach((value, key) => {
    if (key !== 'endpoint') {
      externalApiParams.set(key, value);
    }
  });
  externalApiParams.set('access_key', apiKey);

  const apiUrl = `${baseUrl}${endpoint}?${externalApiParams.toString()}`;

  try {
    const apiResponse = await fetch(apiUrl, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });

    if (!apiResponse.ok) {
        const errorBody = await apiResponse.json().catch(() => ({}));
        console.error(`Proxied Fixer.io request to ${apiUrl} failed: ${apiResponse.status} ${apiResponse.statusText}`, errorBody);
        return NextResponse.json(
            { error: `API request failed with status ${apiResponse.status}`, details: errorBody },
            { status: apiResponse.status }
        );
    }

    const data = await apiResponse.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Failed to fetch from proxied Fixer.io API:', error);
    return NextResponse.json({ error: 'Failed to fetch from external API', message: error.message }, { status: 500 });
  }
}
