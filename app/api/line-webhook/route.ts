import { createHmac } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { fetchFaq } from '@/lib/sheet';
import { askGemini } from '@/lib/gemini';

const LINE_API = 'https://api.line.me/v2/bot/message/reply';

function verifySignature(body: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(body).digest('base64');
  return expected === signature;
}

async function replyToLine(replyToken: string, text: string): Promise<void> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    console.error('[webhook] LINE_CHANNEL_ACCESS_TOKEN is not set');
    return;
  }

  try {
    const res = await fetch(LINE_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        replyToken,
        messages: [{ type: 'text', text }],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('[webhook] LINE reply failed:', res.status, body);
    }
  } catch (err) {
    console.error('[webhook] LINE reply error:', err);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.LINE_CHANNEL_SECRET ?? '';
  const signature = req.headers.get('x-line-signature') ?? '';
  const rawBody = await req.text();

  if (!verifySignature(rawBody, signature, secret)) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  let payload: { events: Array<Record<string, unknown>> };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new NextResponse('Bad Request', { status: 400 });
  }

  for (const event of payload.events ?? []) {
    if (
      event.type !== 'message' ||
      (event.message as Record<string, unknown>)?.type !== 'text'
    ) {
      continue;
    }

    const replyToken = event.replyToken as string;
    const userMessage = (
      (event.message as Record<string, unknown>).text as string
    ).trim();

    const faqCsv = await fetchFaq();
    const reply = await askGemini(faqCsv, userMessage);

    await replyToLine(replyToken, reply);
  }

  return new NextResponse('OK', { status: 200 });
}
