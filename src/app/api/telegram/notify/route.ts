
import { NextResponse } from 'next/server';

/**
 * API route to send messages via Telegram Bot API.
 * Enhanced to support Admin notifications and Unsubscribe buttons.
 */
export async function POST(request: Request) {
  try {
    const { chatId, text, userId, alertId, isAdminAlert } = await request.json();
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const adminId = process.env.ADMIN_TELEGRAM_ID;

    if (!token) {
      console.error('TELEGRAM_BOT_TOKEN is not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    
    // Determine the recipient (standard user or admin)
    const finalChatId = isAdminAlert && adminId ? adminId : chatId;

    if (!finalChatId) {
      return NextResponse.json({ error: 'chatId is required' }, { status: 400 });
    }

    // Build the keyboard
    const inline_keyboard: any[][] = [[
      { text: 'Открыть ВалютаБот 🤖', url: 'https://t.me/CurrencyAll_bot/app' }
    ]];

    // Add "Unsubscribe" button if it's a price alert
    if (userId && alertId) {
      inline_keyboard.push([{
        text: '❌ Остановить это уведомление',
        callback_data: `stop_${userId}_${alertId}`
      }]);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: finalChatId,
        text: text,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard }
      }),
    });

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Failed to send Telegram notification:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
