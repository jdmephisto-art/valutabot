import { NextResponse } from 'next/server';
import { parseStringPromise } from 'xml2js';
import { format } from 'date-fns';

export async function GET() {
  const today = format(new Date(), 'dd.MM.yyyy');
  // Запрашиваем цены на металлы за последние 3 дня для надежности
  const fromDate = format(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), 'dd.MM.yyyy');
  const url = `http://www.cbr.ru/scripts/xml_metall.asp?date_req1=${fromDate}&date_req2=${today}`;

  try {
    const apiResponse = await fetch(url, {
      headers: { 'Accept': 'application/xml' },
      cache: 'no-store'
    });

    if (!apiResponse.ok) {
        return NextResponse.json({ error: `CBR Metals API failed` }, { status: apiResponse.status });
    }

    const xmlText = await apiResponse.text();
    const jsonData = await parseStringPromise(xmlText);
    
    const rates: Record<string, number> = {};
    if (jsonData?.Metall?.Record) {
        // Проходимся по записям и берем самые свежие цены для каждого металла
        // Code 1: Gold, 2: Silver, 3: Platinum, 4: Palladium
        jsonData.Metall.Record.forEach((rec: any) => {
            const code = rec.$.Code;
            const price = parseFloat(rec.Buy[0].replace(',', '.'));
            rates[code] = price; // Это цена в рублях за грамм
        });
    }
    
    return NextResponse.json(rates);

  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch metals from CBR' }, { status: 500 });
  }
}
