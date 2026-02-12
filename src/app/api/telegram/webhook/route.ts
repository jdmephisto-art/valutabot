import { NextResponse } from 'next/server';

/**
 * Telegram Webhook Route
 * To enable the bot, set this URL in Telegram:
 * https://your-domain.com/api/telegram/webhook
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Check if it's a message
    if (body.message) {
      const chatId = body.message.chat.id;
      const text = body.message.text;

      console.log(`Received message from ${chatId}: ${text}`);

      // Here you can implement basic text commands logic
      // For example: /start, /rates, etc.
      // Note: Full bot logic requires a TELEGRAM_BOT_TOKEN
    }

    // Check if it's a WebApp data (sent from the Mini App)
    if (body.web_app_data) {
      console.log('Received data from WebApp:', body.web_app_data);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram Webhook error:', error);
    // Always return 200 to Telegram unless it's a critical infrastructure failure
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Telegram Webhook is active' });
}
