import { VisitorRecord, TelegramConfig } from '../types';

export const DEFAULT_TELEGRAM_CONFIG: TelegramConfig = {
  botToken: '8344422414:AAER_-ry1d6--UU8CC7m0xFin1v67gHOiJQ',
  chatId: '-5275868334',
  enabled: true,
  notifyOnNewVisitor: true,
  notifyOnUrgentRepair: true,
  lastTestStatus: null,
};

/**
 * Formats a VisitorRecord into a structured Thai Telegram message
 */
export function formatVisitorTelegramMessage(record: VisitorRecord): string {
  const isRepair = record.workType.includes('ซ่อม') || record.workType.toLowerCase().includes('repair');
  const iconHeader = isRepair ? '🚨 *[ด่วน-แจ้งซ่อมเครื่องมือแพทย์]*' : '🏥 *[แจ้งเตือนผู้มาติดต่อฝ่ายเครื่องมือแพทย์]*';

  const equipmentsStr = record.equipmentHandled && record.equipmentHandled.length > 0
    ? record.equipmentHandled.join(', ')
    : 'ไม่ได้ระบุ';

  const vehicleStr = record.vehicleType && record.vehicleType !== 'ไม่มีพาหนะ/เดินเท้า'
    ? `${record.vehicleType} (ทะเบียน: ${record.licensePlate || 'ไม่ระบุ'})`
    : 'ไม่มีพาหนะ / เดินเท้า';

  const roleBadge = record.contactRole ? ` [${record.contactRole}]` : '';

  return `${iconHeader}
━━━━━━━━━━━━━━━━━━━━
👤 *ผู้ติดต่อ:* ${record.name}${roleBadge}
🏢 *บริษัท:* ${record.company}
📞 *เบอร์โทร:* ${record.phone}
📍 *แผนกที่เข้าติดต่อ:* ${record.department}
🔧 *ลักษณะงาน:* ${record.workType}
🛠 *เครื่องมือแพทย์:* ${equipmentsStr}
👥 *จำนวนผู้มาติดต่อ:* ${record.visitorCount} ท่าน
🚗 *ยานพาหนะ:* ${vehicleStr}
⏰ *เวลาบันทึก:* ${record.timestamp || new Date().toLocaleString('th-TH')}
🔒 *หมายเหตุรูปถ่าย:* รูปบัตรจะถูกลบอัตโนมัติใน 5 วันตามนโยบาย PDPA
━━━━━━━━━━━━━━━━━━━━`;
}

/**
 * Sends a telegram notification using the backend API route or client-side fallback
 */
export async function sendTelegramNotification(
  message: string,
  config: TelegramConfig = DEFAULT_TELEGRAM_CONFIG
): Promise<{ success: boolean; error?: string }> {
  if (!config.enabled) {
    return { success: true };
  }

  const token = config.botToken || DEFAULT_TELEGRAM_CONFIG.botToken;
  const chatId = config.chatId || DEFAULT_TELEGRAM_CONFIG.chatId;

  if (!token || !chatId) {
    return { success: false, error: 'Telegram BOT_TOKEN หรือ CHAT_ID ยังไม่ได้ตั้งค่า' };
  }

  // 1. Try backend endpoint first
  try {
    const res = await fetch('/api/telegram/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        token,
        chatId,
        parse_mode: 'Markdown',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return { success: true };
      }
    }
  } catch (backendError) {
    console.warn('Backend telegram endpoint failed, trying direct fallback...', backendError);
  }

  // 2. Direct client fallback
  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });

    const data = await response.json();
    if (response.ok && data.ok) {
      return { success: true };
    } else {
      return {
        success: false,
        error: data.description || 'ไม่สามารถส่งข้อความ Telegram ได้',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'เครือข่ายขัดข้องในการเชื่อมต่อ Telegram',
    };
  }
}

/**
 * Sends a test message to verify the Telegram integration
 */
export async function testTelegramConnection(
  config: TelegramConfig
): Promise<{ success: boolean; message: string }> {
  const testMessage = `🔔 *ทดสอบการเชื่อมต่อระบบแจ้งเตือนสำเร็จ!*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🏥 *ระบบบันทึกและวิเคราะห์ผู้มาติดต่อเครื่องมือแพทย์*\n` +
    `📅 *เวลาทดสอบ:* ${new Date().toLocaleString('th-TH')}\n` +
    `✅ *สถานะ:* บอทเชื่อมต่อสำเร็จ พร้อมรับการแจ้งเตือนงานซ่อมและผู้มาติดต่อ`;

  const result = await sendTelegramNotification(testMessage, { ...config, enabled: true });
  if (result.success) {
    return { success: true, message: 'ส่งข้อความทดสอบไปยัง Telegram สำเร็จเรียบร้อยแล้ว!' };
  } else {
    return { success: false, message: result.error || 'เกิดข้อผิดพลาดในการเชื่อมต่อ Telegram' };
  }
}
