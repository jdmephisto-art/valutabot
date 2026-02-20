import { NextResponse } from 'next/server';

/**
 * API route to send messages via Telegram Bot API.
 * Uses the token provided in environment variables for security.
 */
export async function POST(request: Request) {
  try {
    const { chatId, text } = await request.json();
    // CRITICAL: Token is now loaded purely from environment variables.
    // Ensure TELEGRAM_BOT_TOKEN is set in your hosting provider's settings.
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      console.error('TELEGRAM_BOT_TOKEN is not configured in environment variables');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

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
