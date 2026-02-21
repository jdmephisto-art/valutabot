
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
      headers: { 'Accept': 'application/xml' },
      cache: 'no-store'
    });

    if (!apiResponse.ok) {
        return NextResponse.json({ error: `CBR API request failed` }, { status: apiResponse.status });
    }

    const buffer = await apiResponse.arrayBuffer();
    const decoder = new TextDecoder('windows-1251');
    const xmlText = decoder.decode(buffer);

    const jsonData = await parseStringPromise(xmlText);
    return NextResponse.json(jsonData);

  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch from CBR API', message: error.message }, { status: 500 });
  }
}
