import { NextResponse, type NextRequest } from 'next/server';
import { parseStringPromise } from 'xml2js';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const dateReq = searchParams.get('date_req'); // format dd/mm/yyyy

  if (!dateReq) {
    return NextResponse.json({ error: 'date_req is required' }, { status: 400 });
  }

  const url = `http://www.cbr.ru/scripts/XML_daily.asp?date_req=${dateReq}`;

  try {
    const apiResponse = await fetch(url, {
      headers: { 'Accept': 'application/xml', 'Accept-Charset': 'windows-1251' },
      cache: 'no-store'
    });

    if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error(`CBR XML API request to ${url} failed: ${apiResponse.status} ${apiResponse.statusText}`, errorText);
        return NextResponse.json(
            { error: `CBR API request failed with status ${apiResponse.status}` },
            { status: apiResponse.status }
        );
    }

    // The XML from CBR is in windows-1251. We need to decode it correctly.
    const buffer = await apiResponse.arrayBuffer();
    const decoder = new TextDecoder('windows-1251');
    const xmlText = decoder.decode(buffer);

    const jsonData = await parseStringPromise(xmlText);
    
    return NextResponse.json(jsonData);

  } catch (error: any) {
    console.error('Failed to fetch or parse from CBR XML API:', error);
    return NextResponse.json({ error: 'Failed to fetch or parse from CBR API', message: error.message }, { status: 500 });
  }
}
