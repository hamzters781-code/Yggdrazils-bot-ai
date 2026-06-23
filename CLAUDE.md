# CLAUDE.md — LINE Bot AI Project

## What we're building

LINE Official Account bot for SpenderClub ร้านจำหน่ายวิทยุสื่อสารและอุปกรณ์วิทยุสื่อสาร
ตอบลูกค้า 24 ชม. โดยใช้ Gemini 2.5 Flash อ่าน FAQ จาก Google Sheet และส่ง reply กลับ LINE

## Stack — locked

- Next.js App Router + TypeScript
- `@line/bot-sdk` v8 for LINE Messaging API
- `@google/genai` for Gemini 2.5 Flash
- Google Sheet CSV public URL for FAQ (2 col: question, answer)
- Vercel Hobby tier

## Repo conventions

- `app/api/line-webhook/route.ts` → POST handler (verify → handoff? → gemini → reply)
- `lib/sheet.ts` → fetch + parse + cache CSV (60s TTL)
- `lib/gemini.ts` → buildSystemPrompt + generateReply
- `lib/handoff.ts` → Smart Handoff trigger detection + admin notify
- `lib/flex-cards.ts` → Flex Message builders
- `lib/log.ts` → structured JSON logging (Vercel-friendly)

## Env vars (Vercel)

- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`
- `GEMINI_API_KEY`
- `SHEET_CSV_URL`
- `ADMIN_GROUP_ID` — Smart Handoff target (optional)

## Don'ts

- ❌ Hardcode any token/key — use env vars
- ❌ Skip signature verification — security risk
- ❌ Skip timeout on Gemini calls — webhook must reply within 10s
- ❌ Cache FAQ for >60s — owner edits Sheet should reflect quickly
- ❌ Log full LINE message content — PII risk · log only metadata (userId, latency)
- ❌ Use `Client` from @line/bot-sdk v7 — use `messagingApi.MessagingApiClient` (v8)
