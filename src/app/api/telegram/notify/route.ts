import { NextResponse } from 'next/server';

/**
 * API route to send messages via Telegram Bot API.
 * Uses the token provided by the user.
 */
export async function POST(request: Request) {
  try {
    const { chatId, text } = await request.json();
    // Use new token from request or fallback to process.env
    const token = process.env.TELEGRAM_BOT_TOKEN || '8586154483:AAE9H5rBSHs3Z0qIfZtNOW6Vi5QcfaXnTSI';

    if (!chatId || !text) {
      return NextResponse.json({ error: 'chatId and text are required' }, { status: 400 });
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[
            { text: 'Открыть ВалютаБот 🤖', url: 'https://t.me/CurrencyAll_bot/app' }
          ]]
        }
      }),
    });

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Failed to send Telegram notification:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
