import { GoogleGenAI } from '@google/genai';

const DEFAULT_REPLY =
  'ขออภัยครับ ทีมงานจะติดต่อกลับโดยตรง กรุณาฝากเบอร์โทรหรือช่องทางการติดต่ออื่นๆไว้ได้เลยครับ หรือมีข้อสงสัยด้านอื่นอีกไหมครับ';

const TIMEOUT_MS = 8_000;

function buildPrompt(faqCsv: string, userMessage: string): string {
  return `<role>
คุณคือ SPENDER™ พนักงานขายมืออาชีพของ SpenderClub ร้านจำหน่ายวิทยุสื่อสารและอุปกรณ์วิทยุสื่อสาร
</role>

<constraints>
- ตอบโดยใช้ข้อมูลใน <faq> เท่านั้น
- ห้ามแต่งหรือเดาราคา เวลา สต็อก หรือข้อมูลที่ไม่มีใน FAQ
- ถ้าไม่มีข้อมูลตอบ ให้ใช้ข้อความนี้ทุกครั้ง:
  "ขออภัยครับ ทีมงานจะติดต่อกลับโดยตรง กรุณาฝากเบอร์โทรหรือช่องทางการติดต่ออื่นๆไว้ได้เลยครับ หรือมีข้อสงสัยด้านอื่นอีกไหมครับ"
  แล้วแจ้งให้ลูกค้าติดต่อแอดมินหรือ Line OA โดยตรง
- โทน: สุภาพ เป็นกันเอง มืออาชีพ ไม่เล่น ไม่คุยนอกประเด็น ไม่ใช้ emoji
- ความยาว: 1-3 ประโยค กระชับตรงประเด็น
</constraints>

<output_format>
- ภาษาไทยเท่านั้น
- ไม่ใช้ markdown (ไม่มี **, ##, -, *)
- ไม่ขึ้นต้นด้วย "สวัสดี" ทุกประโยค
</output_format>

<faq>
${faqCsv}
</faq>

<question>
${userMessage}
</question>`;
}

export async function askGemini(faqCsv: string, userMessage: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[gemini] GEMINI_API_KEY is not set');
    return DEFAULT_REPLY;
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = buildPrompt(faqCsv, userMessage);

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Gemini timeout')), TIMEOUT_MS)
  );

  try {
    const responsePromise = ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    const response = await Promise.race([responsePromise, timeoutPromise]);

    const candidate = response.candidates?.[0];
    const finishReason = candidate?.finishReason;

    console.log('[gemini] finishReason:', finishReason, '| tokens:', {
      input: response.usageMetadata?.promptTokenCount,
      output: response.usageMetadata?.candidatesTokenCount,
    });

    if (finishReason === 'MAX_TOKENS') {
      console.warn('[gemini] MAX_TOKENS — falling back to default reply');
      return DEFAULT_REPLY;
    }

    const text = response.text?.trim();
    if (!text) {
      console.warn('[gemini] empty response text');
      return DEFAULT_REPLY;
    }

    return text;
  } catch (err) {
    console.error('[gemini] error:', err);
    return DEFAULT_REPLY;
  }
}
