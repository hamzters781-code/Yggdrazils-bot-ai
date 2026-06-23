import { validateSignature, messagingApi, webhook } from '@line/bot-sdk';
import { NextRequest, NextResponse } from 'next/server';
import { fetchFaq } from '@/lib/sheet';
import { askGemini } from '@/lib/gemini';

async function replyToLine(replyToken: string, text: string): Promise<void> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    console.error('[webhook] LINE_CHANNEL_ACCESS_TOKEN is not set');
    return;
  }

  try {
    const client = new messagingApi.MessagingApiClient({ channelAccessToken: token });
    await client.replyMessage({
      replyToken,
      messages: [{ type: 'text', text }],
    });
  } catch (err) {
    console.error('[webhook] LINE reply error:', err);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.LINE_CHANNEL_SECRET ?? '';
  const signature = req.headers.get('x-line-signature') ?? '';
  const rawBody = await req.text();

  if (!validateSignature(rawBody, secret, signature)) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  let payload: webhook.CallbackRequest;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new NextResponse('Bad Request', { status: 400 });
  }

  for (const event of payload.events ?? []) {
    if (event.type !== 'message' || event.message.type !== 'text') {
      continue;
    }

    const textEvent = event as webhook.MessageEvent & { message: webhook.TextMessageContent };
    const replyToken = textEvent.replyToken;
    if (!replyToken) continue;

    const userMessage = textEvent.message.text.trim();

    const faqCsv = await fetchFaq();
    const reply = await askGemini(faqCsv, userMessage);

    await replyToLine(replyToken, reply);
  }

  return new NextResponse('OK', { status: 200 });
}
