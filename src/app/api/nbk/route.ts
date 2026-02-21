
import { NextResponse } from 'next/server';
import { parseStringPromise } from 'xml2js';

export async function GET() {
  const url = 'https://nationalbank.kz/rss/rates_all.xml';

  try {
    const apiResponse = await fetch(url, {
      next: { revalidate: 3600 }
    });

    if (!apiResponse.ok) {
      return NextResponse.json({ error: 'NBK API failed' }, { status: apiResponse.status });
    }

    const xmlText = await apiResponse.text();
    const jsonData = await parseStringPromise(xmlText);
    
    const rates: Record<string, number> = {};
    const items = jsonData?.rates?.item;

    if (items) {
      items.forEach((item: any) => {
        const title = item.title[0]; // e.g. "USD"
        const description = parseFloat(item.description[0]); // rate to KZT
        const quant = parseInt(item.quant[0]);
        
        rates[title] = description / quant;
      });
      // Base for these rates is KZT, we will normalize to USD in the lib
    }

    return NextResponse.json(rates);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch from NBK', message: error.message }, { status: 500 });
  }
}
