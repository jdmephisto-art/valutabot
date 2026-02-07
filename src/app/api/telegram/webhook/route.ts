
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Telegram Webhook received:', body);
    
    // TODO: Implement bot logic using src/lib/currencies.ts and translations.ts
    // For now, just acknowledge the message
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram Webhook error:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
