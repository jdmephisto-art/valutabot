
import { NextResponse } from 'next/server';
import { parseStringPromise } from 'xml2js';

export async function GET() {
  const url = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';

  try {
    const apiResponse = await fetch(url, {
      next: { revalidate: 3600 }
    });

    if (!apiResponse.ok) {
      return NextResponse.json({ error: 'ECB API failed' }, { status: apiResponse.status });
    }

    const xmlText = await apiResponse.text();
    const jsonData = await parseStringPromise(xmlText);
    
    const rates: Record<string, number> = {};
    const cubeWrap = jsonData?.['gesmes:Envelope']?.Cube?.[0]?.Cube?.[0]?.Cube;
    
    if (cubeWrap) {
      cubeWrap.forEach((item: any) => {
        const currency = item.$.currency;
        const rate = parseFloat(item.$.rate);
        rates[currency] = rate;
      });
      // Base is EUR
      rates['EUR'] = 1;
    }

    return NextResponse.json(rates);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch from ECB', message: error.message }, { status: 500 });
  }
}
