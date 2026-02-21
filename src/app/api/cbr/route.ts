import { NextResponse } from 'next/server';

export async function GET() {
  const url = 'https://www.cbr-xml-daily.ru/daily_json.js';

  try {
    const apiResponse = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });

    if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error(`CBR JSON API request to ${url} failed: ${apiResponse.status} ${apiResponse.statusText}`, errorText);
        return NextResponse.json(
            { error: `CBR API request failed with status ${apiResponse.status}` },
            { status: apiResponse.status }
        );
    }

    const data = await apiResponse.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Failed to fetch from CBR JSON API:', error);
    return NextResponse.json({ error: 'Failed to fetch from CBR API', message: error.message }, { status: 500 });
  }
}
