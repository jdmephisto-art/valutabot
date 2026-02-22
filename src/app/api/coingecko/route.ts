
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const endpoint = searchParams.get('endpoint');

  if (!endpoint) {
    return NextResponse.json({ error: 'Endpoint is required' }, { status: 400 });
  }

  // Ваш Demo API Key
  const apiKey = 'CG-6yHB5LdyyUmGeK3GPxzzsUYH';
  const baseUrl = 'https://api.coingecko.com/api/v3/';

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
        'x-cg-demo-api-key': apiKey
      },
      next: { revalidate: 60 } // Кэшируем на стороне сервера на 1 минуту
    });

    if (!apiResponse.ok) {
        const errorBody = await apiResponse.json().catch(() => ({}));
        return NextResponse.json(
            { error: `CoinGecko API failed`, details: errorBody },
            { status: apiResponse.status }
        );
    }

    const data = await apiResponse.json();
    return NextResponse.json(data);

  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch from CoinGecko', message: error.message }, { status: 500 });
  }
}
