import { VisitorRecord, TelegramConfig } from '../types';
import { StorageService } from './storageService';

export const DEFAULT_TELEGRAM_CONFIG: TelegramConfig = {
  botToken: '8344422414:AAER_-ry1d6--UU8CC7m0xFin1v67gHOiJQ',
  chatId: '-5275868334',
  enabled: true,
  notifyOnNewVisitor: true,
  notifyOnUrgentRepair: true,
  lastTestStatus: null,
};

/**
 * Escapes HTML characters to prevent Telegram parse errors
 */
function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Maps work type to compact badge
 */
function getWorkTypeTag(workType: string = ''): string {
  const lower = workType.toLowerCase();
  if (lower.includes('ซ่อม') || lower.includes('repair')) return 'แจ้งซ่อม';
  if (lower.includes('บำรุงรักษา') || lower.includes('pm') || lower.includes('preventive')) return 'บำรุงรักษา PM';
  if (lower.includes('ติดตั้ง') || lower.includes('ส่งมอบ') || lower.includes('install') || lower.includes('deliver')) return 'ส่งมอบ/ติดตั้ง';
  if (lower.includes('สอบเทียบ') || lower.includes('cal')) return 'สอบเทียบ CAL';
  if (lower.includes('สาธิต') || lower.includes('demo') || lower.includes('อบรม')) return 'สาธิต/อบรม';
  if (lower.includes('ส่งเอกสาร') || lower.includes('วางบิล') || lower.includes('ติดต่อ')) return 'ส่งเอกสาร';
  return workType.trim() || 'งานบริการ BME';
}

/**
 * Maps vehicle type to compact text with plate code
 */
function getVehicleDisplayCompact(vehicleType?: string, licensePlate?: string): string {
  if (!vehicleType || vehicleType.includes('ไม่มีพาหนะ') || vehicleType.includes('เดินเท้า')) {
    return '🚶 เดินเท้า';
  }
  const plate = licensePlate && licensePlate !== '-' ? ` <code>[${escapeHtml(licensePlate)}]</code>` : '';
  if (vehicleType.includes('จักรยานยนต์')) return `🛵 มอเตอร์ไซค์${plate}`;
  if (vehicleType.includes('รถยนต์')) return `🚗 รถยนต์${plate}`;
  if (vehicleType.includes('4 ล้อ')) return `🚐 บรรทุก 4 ล้อ${plate}`;
  if (vehicleType.includes('บรรทุก')) return `🚛 รถบรรทุก${plate}`;
  return `🚗 ${escapeHtml(vehicleType)}${plate}`;
}

/**
 * Formats a VisitorRecord into a compact, clean Thai Telegram message
 */
export function formatVisitorTelegramMessage(record: VisitorRecord): string {
  const workTag = getWorkTypeTag(record.workType);
  const vehicleStr = getVehicleDisplayCompact(record.vehicleType, record.licensePlate);
  const roleStr = record.contactRole ? ` (${escapeHtml(record.contactRole)})` : '';

  const equipmentsStr = record.equipmentHandled && record.equipmentHandled.length > 0
    ? record.equipmentHandled.join(', ')
    : '-';

  const notesSection = record.notes
    ? `\n📝 <b>โน้ต:</b> ${escapeHtml(record.notes)}`
    : '';

  return `🔔 <b>[ผู้ติดต่อใหม่]</b> <code>${escapeHtml(workTag)}</code>
━━━━━━━━━━━━━━━
🏢 <b>บริษัท:</b> ${escapeHtml(record.company)}
👤 <b>ชื่อ:</b> ${escapeHtml(record.name)}${roleStr}
📞 <b>โทร:</b> <code>${escapeHtml(record.phone)}</code>
📍 <b>แผนก:</b> ${escapeHtml(record.department)}
🧰 <b>เครื่อง:</b> ${escapeHtml(equipmentsStr)}
🚗 <b>พาหนะ:</b> ${vehicleStr}
👥 <b>จำนวน:</b> ${record.visitorCount} ท่าน
🕒 <b>เวลา:</b> <code>${escapeHtml(record.timestamp || new Date().toLocaleString('th-TH'))}</code>${notesSection}
━━━━━━━━━━━━━━━`;
}

/**
 * Sends a telegram notification (supports both text and photo) with HTML parse mode and fallback to plain text
 */
export async function sendTelegramNotification(
  message: string,
  customConfig?: TelegramConfig,
  photo?: string
): Promise<{ success: boolean; error?: string; messageId?: number; chatTitle?: string }> {
  const config = customConfig || StorageService.getTelegramConfig() || DEFAULT_TELEGRAM_CONFIG;

  if (!config.enabled) {
    return { success: true };
  }

  const token = (config.botToken || DEFAULT_TELEGRAM_CONFIG.botToken || '').trim();
  const chatId = (config.chatId || DEFAULT_TELEGRAM_CONFIG.chatId || '').trim();

  if (!token || !chatId) {
    return { success: false, error: 'Telegram BOT_TOKEN หรือ CHAT_ID ยังไม่ได้ตั้งค่า' };
  }

  // 1. Try backend endpoint first with HTML mode and photo
  try {
    const res = await fetch('/api/telegram/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        token,
        chatId,
        photo: photo || undefined,
        parse_mode: 'HTML',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        const chatTitle = data.data?.result?.chat?.title || data.data?.result?.chat?.first_name || '';
        const msgId = data.messageId || data.data?.result?.message_id;
        return { success: true, messageId: msgId, chatTitle };
      }
    }
  } catch (backendError) {
    console.warn('Backend telegram endpoint failed, trying direct fallback...', backendError);
  }

  // 2. Direct client fallback with photo support
  try {
    if (photo && typeof photo === 'string' && photo.startsWith('data:image/')) {
      // Direct send photo via client FormData
      try {
        const match = photo.match(/^data:(image\/[a-zA-Z0-9+]+);base64,(.+)$/);
        const mimeType = match ? match[1] : 'image/jpeg';
        const base64Str = match ? match[2] : photo.replace(/^data:image\/\w+;base64,/, '');
        
        // Convert base64 to Blob
        const byteCharacters = atob(base64Str);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });

        const formData = new FormData();
        formData.append('chat_id', chatId);
        formData.append('photo', blob, 'visitor_card.jpg');
        formData.append('caption', message);
        formData.append('parse_mode', 'HTML');

        const photoRes = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
          method: 'POST',
          body: formData,
        });
        const photoData = await photoRes.json();
        if (photoRes.ok && photoData.ok) {
          const chatTitle = photoData.result?.chat?.title || photoData.result?.chat?.first_name || '';
          return { success: true, messageId: photoData.result?.message_id, chatTitle };
        }
      } catch (clientPhotoErr) {
        console.warn('Client direct photo send failed, fallback to sendMessage:', clientPhotoErr);
      }
    }

    // Direct sendMessage fallback
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    const data = await response.json();
    if (response.ok && data.ok) {
      const chatTitle = data.result?.chat?.title || data.result?.chat?.first_name || '';
      return { success: true, messageId: data.result?.message_id, chatTitle };
    }

    // 3. Fallback: If HTML formatting failed, send as plain text without parse_mode
    const plainText = message.replace(/<[^>]*>/g, '').replace(/[*_`\[\]()]/g, '');
    const fallbackRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: plainText,
        disable_web_page_preview: true,
      }),
    });

    const fallbackData = await fallbackRes.json();
    if (fallbackRes.ok && fallbackData.ok) {
      const chatTitle = fallbackData.result?.chat?.title || fallbackData.result?.chat?.first_name || '';
      return { success: true, messageId: fallbackData.result?.message_id, chatTitle };
    }

    return {
      success: false,
      error: data.description || fallbackData.description || 'ไม่สามารถส่งข้อความ Telegram ได้',
    };
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
  const testMessage = `✨ <b>[ทดสอบการแจ้งเตือน BME]</b> ✨\n` +
    `━━━━━━━━━━━━━━━\n` +
    `🏥 <b>ระบบ:</b> Visitor BME\n` +
    `🤖 <b>สถานะ:</b> บอททำงานปกติ (พร้อมส่งภาพ & แจ้งเตือน)\n` +
    `🕒 <b>เวลา:</b> <code>${new Date().toLocaleString('th-TH')}</code>\n` +
    `━━━━━━━━━━━━━━━`;

  const result = await sendTelegramNotification(testMessage, { ...config, enabled: true });
  if (result.success) {
    const destination = (result as any).chatTitle ? `กลุ่ม "${(result as any).chatTitle}"` : `Chat ID: ${config.chatId}`;
    return {
      success: true,
      message: `ส่งข้อความทดสอบไปยัง ${destination} สำเร็จเรียบร้อยแล้ว!`
    };
  } else {
    return {
      success: false,
      message: result.error || 'เกิดข้อผิดพลาดในการเชื่อมต่อ Telegram'
    };
  }
}

