import { NextResponse, type NextRequest } from 'next/server';
import { parseStringPromise } from 'xml2js';
import { format, subDays } from 'date-fns';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const dateFrom = searchParams.get('date_req1'); // dd.mm.yyyy
  const dateTo = searchParams.get('date_req2');   // dd.mm.yyyy

  const todayStr = format(new Date(), 'dd.MM.yyyy');
  const fromDate = dateFrom || format(subDays(new Date(), 7), 'dd.MM.yyyy');
  const toDate = dateTo || todayStr;

  const url = `http://www.cbr.ru/scripts/xml_metall.asp?date_req1=${fromDate}&date_req2=${toDate}`;

  try {
    const apiResponse = await fetch(url, {
      headers: { 'Accept': 'application/xml' },
      cache: 'no-store'
    });

    if (!apiResponse.ok) {
        return NextResponse.json({ error: `CBR Metals API failed` }, { status: apiResponse.status });
    }

    const buffer = await apiResponse.arrayBuffer();
    const decoder = new TextDecoder('windows-1251');
    const xmlText = decoder.decode(buffer);

    const jsonData = await parseStringPromise(xmlText);
    
    if (dateFrom && dateTo) {
        return NextResponse.json(jsonData);
    }

    const rates: Record<string, number> = {};
    if (jsonData?.Metall?.Record) {
        const records = Array.isArray(jsonData.Metall.Record) ? jsonData.Metall.Record : [jsonData.Metall.Record];
        const sortedRecords = [...records].sort((a: any, b: any) => {
            const dateA = a.$.Date.split('.').reverse().join('');
            const dateB = b.$.Date.split('.').reverse().join('');
            return dateA.localeCompare(dateB);
        });

        sortedRecords.forEach((rec: any) => {
            const code = rec.$.Code;
            if (rec.Buy && rec.Buy[0]) {
                const price = parseFloat(rec.Buy[0].replace(',', '.'));
                rates[code] = price;
            }
        });
    }
    
    return NextResponse.json(rates);

  } catch (error: any) {
    console.error('Failed to fetch metals from CBR:', error);
    return NextResponse.json({ error: 'Failed to fetch metals from CBR' }, { status: 500 });
  }
}
