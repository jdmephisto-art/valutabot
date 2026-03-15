import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';

/**
 * Telegram Webhook Route
 * Handles bot commands, Inline Queries, and Callback Queries (Unsubscribe).
 * Optimized to respond to /start even if Firebase initialization is slow.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://valutabot.vercel.app';
    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'CurrencyAll_bot';

    if (!token) {
        console.error('TELEGRAM_BOT_TOKEN is missing in environment variables');
        return NextResponse.json({ ok: false }, { status: 200 });
    }

    // 1. Handle Commands (e.g., /start)
    if (body.message && body.message.text === '/start') {
      const chatId = body.message.chat.id;
      const welcomeText = `<b>Привет! Я — твой финансовый радар 🛰</b>\n\n📈 Уже знаю официальные курсы на завтра.\n💱 Считаю по курсам НБРБ, ЕЦБ и других ЦБ.\n\nНажми «Последние курсы», чтобы увидеть, в какую сторону качнется рубль завтра. Или воспользуйся Конвертером, чтобы спланировать обмен.`;
      
      const inline_keyboard = [
        [{ text: 'Открыть ВалютаБот 🤖', web_app: { url: siteUrl } }],
        [{ text: '📊 Последние курсы', web_app: { url: `${siteUrl}/?startapp=rates` } }]
      ];

      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: welcomeText,
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard }
        })
      });
      return NextResponse.json({ ok: true });
    }

    // 2. Handle Callback Query (Unsubscribe button click)
    if (body.callback_query) {
      const callbackData = body.callback_query.data;
      const callbackId = body.callback_query.id;
      const chatId = body.callback_query.message.chat.id;
      const messageId = body.callback_query.message.message_id;

      if (callbackData.startsWith('stop_')) {
        const [, userId, alertId] = callbackData.split('_');
        
        try {
          const { firestore } = initializeFirebase();
          const alertRef = doc(firestore, 'users', userId, 'notifications', alertId);
          await deleteDoc(alertRef);

          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: '✅ Уведомление успешно отключено',
              show_alert: false
            })
          });

          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: `<b>Уведомление остановлено.</b>\nВы больше не будете получать оповещения по этой паре.\n\n<a href="https://t.me/${botUsername}">Открыть ВалютаБот 🤖</a>`,
              parse_mode: 'HTML'
            })
          });
        } catch (e) {
          console.error('Firestore operation failed in webhook:', e);
        }
      }
      return NextResponse.json({ ok: true });
    }

    // 3. Handle Inline Query
    if (body.inline_query) {
      const queryId = body.inline_query.id;
      const queryText = body.inline_query.query.trim().toUpperCase();
      
      if (queryText.length >= 2) {
        try {
          const { firestore } = initializeFirebase();
          const parts = queryText.split(/\s+/);
          let amount = 1, from = 'USD', to = 'BYN';

          if (parts.length === 2) { from = parts[0]; to = parts[1]; }
          else if (parts.length === 3) { 
            amount = parseFloat(parts[0].replace(',', '.')) || 1; 
            from = parts[1]; to = parts[2]; 
          }
          else if (parts.length === 1) { from = parts[0]; to = 'USD'; }

          const snap = await getDoc(doc(firestore, 'rates_cache', 'unified'));
          const ratesRaw = snap.exists() ? snap.data().data : {};
          
          const getP = (c: string) => {
              if (c === 'USD') return 1;
              const sources = ratesRaw[c] || {};
              return sources['nbrb']?.v || sources['cbr']?.v || sources['worldcurrencyapi']?.v || undefined;
          };

          const fromPrice = getP(from);
          const toPrice = getP(to);

          if (fromPrice && toPrice) {
            const rate = fromPrice / toPrice;
            const resultValue = amount * rate;
            const resultText = `${amount} ${from} = ${resultValue > 1000 ? resultValue.toFixed(2) : resultValue.toFixed(4).replace(/\.?0+$/, '')} ${to}`;
            
            const results = [{
              type: 'article',
              id: `rate_${from}_${to}_${Date.now()}`,
              title: resultText,
              description: `📊 Актуальный курс из ВалютаБот`,
              input_message_content: {
                message_text: `<b>Курс валют:</b>\n${resultText}\n\n<a href="https://t.me/${botUsername}">Открыть ВалютаБот 🤖</a>`,
                parse_mode: 'HTML'
              }
            }];

            await fetch(`https://api.telegram.org/bot${token}/answerInlineQuery`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ inline_query_id: queryId, results, cache_time: 60 })
            });
          }
        } catch (e) {
          console.error('Inline query rate fetch failed:', e);
        }
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Global Telegram Webhook error:', error);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
