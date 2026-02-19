import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * Telegram Webhook Route
 * Handles bot commands and Inline Queries for instant rate checks.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Use new token from request or fallback to process.env
    const token = process.env.TELEGRAM_BOT_TOKEN || '8586154483:AAE9H5rBSHs3Z0qIfZtNOW6Vi5QcfaXnTSI';
    const { firestore } = initializeFirebase();

    // 1. Handle Inline Query (@CurrencyAll_bot USD BYN)
    if (body.inline_query) {
      const queryId = body.inline_query.id;
      const queryText = body.inline_query.query.trim().toUpperCase();
      
      if (queryText.length >= 3) {
        // Expected format: "USD BYN" or "100 USD BYN"
        const parts = queryText.split(/\s+/);
        let amount = 1;
        let from = 'USD';
        let to = 'BYN';

        if (parts.length === 2) {
          from = parts[0];
          to = parts[1];
        } else if (parts.length === 3) {
          amount = parseFloat(parts[0].replace(',', '.')) || 1;
          from = parts[1];
          to = parts[2];
        } else if (parts.length === 1) {
          from = parts[0];
          to = 'USD';
        }

        // Fetch current rates from cloud cache
        const snap = await getDoc(doc(firestore, 'rates_cache', 'unified'));
        const rates = snap.exists() ? snap.data().rates : {};

        const fromPrice = rates[from];
        const toPrice = rates[to];

        if (fromPrice && toPrice && token) {
          const rate = fromPrice / toPrice;
          const resultValue = amount * rate;
          const resultText = `${amount} ${from} = ${resultValue > 1000 ? resultValue.toFixed(2) : resultValue.toFixed(4).replace(/\.?0+$/, '')} ${to}`;
          
          const results = [
            {
              type: 'article',
              id: `rate_${from}_${to}_${Date.now()}`,
              title: resultText,
              description: `📊 Актуальный курс из ВалютаБот`,
              thumb_url: `https://picsum.photos/seed/${from}${to}/100/100`,
              input_message_content: {
                message_text: `<b>Курс валют:</b>\n${resultText}\n\n<a href="https://t.me/CurrencyAll_bot/app">Открыть ВалютаБот 🤖</a>`,
                parse_mode: 'HTML'
              },
              reply_markup: {
                inline_keyboard: [[
                  { text: 'Открыть ВалютаБот 🤖', url: 'https://t.me/CurrencyAll_bot/app' }
                ]]
              }
            }
          ];

          await fetch(`https://api.telegram.org/bot${token}/answerInlineQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              inline_query_id: queryId,
              results,
              cache_time: 60 // Кэшируем на 1 минуту в самом Телеграме
            })
          });
        }
      }
      return NextResponse.json({ ok: true });
    }

    // 2. Handle simple messages
    if (body.message) {
      const chatId = body.message.chat.id;
      const text = body.message.text;

      if (text === '/start') {
        // Handle start message
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram Webhook error:', error);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Telegram Webhook is active' });
}
