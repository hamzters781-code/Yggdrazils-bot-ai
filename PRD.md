# PRD — LINE Bot AI · SpenderClub

## Goal

SpenderClub อยากตอบลูกค้า LINE OA 24 ชม. โดยไม่ต้องให้แอดมินคอยตอบตลอดเวลา
ให้ AI ตอบช่วย FAQ ที่เจ้าของอัปเดตได้เองใน Google Sheet ได้ทันที

## Users

- **Customer** — ผู้เข้ามา LINE OA · ถามเรื่องรุ่น ราคา วิธีใช้ บริการหลังการขาย
- **Owner** — แก้ Google Sheet ง่าย · ไม่ต้อง deploy ใหม่เมื่อมีโปรโมชั่น/รุ่นใหม่
- **Admin** (optional) — รับ notify เมื่อ AI ไม่รู้ + Smart Handoff routing เข้ากลุ่ม

## Acceptance criteria

1. ลูกค้าส่งข้อความ → ตอบกลับภายใน 5 วินาที (ภาษาไทย ตรง FAQ)
2. ลูกค้าถามเรื่องไม่อยู่ใน FAQ → ตอบ default reply (ไม่เดาข้อมูล)
3. ลูกค้าถามด้วย paraphrase/synonym → เข้าใจได้และตอบจาก FAQ
4. ลูกค้าต้องการคุย/สั่งของจำนวนมาก → Flex Card "ต่อแอดมินติดต่อกลับ" + แจ้งแอดมิน
5. Sheet ดึงไม่ได้ชั่วคราว → fallback ของ default · ไม่ crash
6. Gemini timeout → fallback ของ default · ไม่ทำให้ลูกค้ารอนาน

## Non-goals

- ❌ Multi-LINE OA — 1 channel/bot เท่านั้น
- ❌ Voice input — text only
- ❌ Order checkout — ใช้ Smart Handoff แทน (ส่งให้แอดมิน)
- ❌ Multi-language — ไทยอย่างเดียว
