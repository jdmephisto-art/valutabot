import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const endpoint = searchParams.get('endpoint');

  if (!endpoint) {
    return NextResponse.json({ error: 'Endpoint is required' }, { status: 400 });
  }

  // API Key provided by user
  const apiKey = 'eab00afd65b24d16b9ff1a3151727ec9';
  const baseUrl = 'https://pro-api.coinmarketcap.com/v1/';

  const externalParams = new URLSearchParams();
  searchParams.forEach((value, key) => {
    if (key !== 'endpoint') {
      externalParams.set(key, value);
    }
  });

  const apiUrl = `${baseUrl}${endpoint}?${externalParams.toString()}`;

  try {
    const apiResponse = await fetch(apiUrl, {
      headers: { 
        'Accept': 'application/json',
        'X-CMC_PRO_API_KEY': apiKey
      },
      next: { revalidate: 60 } 
    });

    if (!apiResponse.ok) {
        const errorBody = await apiResponse.json().catch(() => ({}));
        return NextResponse.json(
            { error: `CoinMarketCap API failed`, details: errorBody },
            { status: apiResponse.status }
        );
    }

    const data = await apiResponse.json();
    return NextResponse.json(data);

  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch from CoinMarketCap', message: error.message }, { status: 500 });
  }
}
