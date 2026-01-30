import { NextResponse } from 'next/server';
import { parseStringPromise } from 'xml2js';
import { format, subDays } from 'date-fns';

export async function GET() {
  const today = format(new Date(), 'dd.MM.yyyy');
  // Запрашиваем цены на металлы за последние 7 дней для надежности
  const fromDate = format(subDays(new Date(), 7), 'dd.MM.yyyy');
  const url = `http://www.cbr.ru/scripts/xml_metall.asp?date_req1=${fromDate}&date_req2=${today}`;

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
    
    const rates: Record<string, number> = {};
    if (jsonData?.Metall?.Record) {
        // Проходимся по записям и берем самые свежие цены для каждого металла
        // Code 1: Gold, 2: Silver, 3: Platinum, 4: Palladium
        // Сортируем по дате, чтобы последние записи перекрывали старые
        const sortedRecords = [...jsonData.Metall.Record].sort((a: any, b: any) => {
            const dateA = a.$.Date.split('.').reverse().join('');
            const dateB = b.$.Date.split('.').reverse().join('');
            return dateA.localeCompare(dateB);
        });

        sortedRecords.forEach((rec: any) => {
            const code = rec.$.Code;
            const price = parseFloat(rec.Buy[0].replace(',', '.'));
            rates[code] = price; // Цена в рублях за грамм
        });
    }
    
    return NextResponse.json(rates);

  } catch (error: any) {
    console.error('Failed to fetch metals from CBR:', error);
    return NextResponse.json({ error: 'Failed to fetch metals from CBR' }, { status: 500 });
  }
}
