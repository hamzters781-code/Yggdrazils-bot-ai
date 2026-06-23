import { validateSignature, messagingApi, webhook } from '@line/bot-sdk';
import { NextRequest, NextResponse } from 'next/server';
import { fetchFaq } from '@/lib/sheet';
import { generateReply, DEFAULT_REPLY } from '@/lib/gemini';
import { shouldHandoff, notifyAdmin } from '@/lib/handoff';
import { log } from '@/lib/log';

export const runtime = 'nodejs';
export const maxDuration = 30;

async function replyWithRetry(
  client: messagingApi.MessagingApiClient,
  replyToken: string,
  text: string,
  attempts = 3
): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    try {
      await client.replyMessage({ replyToken, messages: [{ type: 'text', text }] });
      return;
    } catch (err) {
      if (i === attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, 300 * (i + 1)));
    }
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.LINE_CHANNEL_SECRET ?? '';
  const signature = req.headers.get('x-line-signature') ?? '';
  const rawBody = await req.text();

  if (!validateSignature(rawBody, secret, signature)) {
    log.warn('webhook.invalid_signature');
    return new NextResponse('Unauthorized', { status: 401 });
  }

  let payload: webhook.CallbackRequest;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new NextResponse('Bad Request', { status: 400 });
  }

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? '';
  const client = new messagingApi.MessagingApiClient({ channelAccessToken: token });

  await Promise.all(
    (payload.events ?? []).map(async (event) => {
      if (event.type !== 'message' || event.message.type !== 'text') return;

      const textEvent = event as webhook.MessageEvent & { message: webhook.TextMessageContent };
      const replyToken = textEvent.replyToken;
      if (!replyToken) return;

      const userMessage = textEvent.message.text.trim();
      const userId = textEvent.source?.userId ?? 'unknown';
      const startTime = Date.now();

      try {
        // Smart Handoff — ตรวจก่อน call Gemini เพื่อประหยัด latency
        if (shouldHandoff(userMessage)) {
          await notifyAdmin(userId, userMessage);
          await replyWithRetry(client, replyToken, 'ขออภัยครับ ขอให้ทีมงานติดต่อกลับโดยตรงนะครับ');
          log.info('handoff.routed', { userId, latencyMs: Date.now() - startTime });
          return;
        }

        // FAQ + Gemini
        const faqText = await fetchFaq();
        const reply = await Promise.race([
          generateReply(userMessage, faqText),
          new Promise<string>((_, reject) =>
            setTimeout(() => reject(new Error('gemini_timeout')), 8000)
          ),
        ]).catch((err) => {
          log.error('gemini.failed', { err: err.message, userId });
          return DEFAULT_REPLY;
        });

        await replyWithRetry(client, replyToken, reply);
        log.info('reply.sent', { userId, latencyMs: Date.now() - startTime, replyLength: reply.length });
      } catch (err) {
        log.error('webhook.error', { err: (err as Error).message, userId });
        try {
          await client.replyMessage({ replyToken, messages: [{ type: 'text', text: DEFAULT_REPLY }] });
        } catch {
          /* replyToken อาจหมดอายุแล้ว */
        }
      }
    })
  );

  return new NextResponse('OK', { status: 200 });
}
