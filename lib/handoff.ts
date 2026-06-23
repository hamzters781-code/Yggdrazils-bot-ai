import { messagingApi } from '@line/bot-sdk';

const HANDOFF_TRIGGERS = [
  'คุยกัน',
  'ต่อแอดมิน',
  'ต่อเจ้าของ',
  'ค้อ',
  'ร้องเรียน',
  'ไม่พอใจ',
  'ขายส่ง',
  'wholesale',
  'อยากซื้อจำนวนมาก',
  'franchise',
  'ติดต่อสื่อ',
  'ทำสัญญา',
  'ตัวแทน',
];

export function shouldHandoff(message: string): boolean {
  const lower = message.toLowerCase();
  return HANDOFF_TRIGGERS.some((t) => lower.includes(t));
}

export async function notifyAdmin(userId: string, userMessage: string): Promise<void> {
  const adminGroupId = process.env.ADMIN_GROUP_ID;
  if (!adminGroupId) {
    console.warn('[handoff] ADMIN_GROUP_ID not set — skipping admin notify');
    return;
  }

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return;

  try {
    const client = new messagingApi.MessagingApiClient({ channelAccessToken: token });
    await client.pushMessage({
      to: adminGroupId,
      messages: [{
        type: 'text',
        text: `ลูกค้าต้องการคุยกับแอดมิน\n\nUserID: ${userId}\nข้อความ: ${userMessage}\n\nจัดการที่: https://manager.line.biz/chats`,
      }],
    });
  } catch (err) {
    console.error('[handoff] admin notify failed:', err);
  }
}
