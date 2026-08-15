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
 * Maps work type to expressive emoji header and title for new visitor check-in
 */
function getWorkTypeHeader(workType: string = ''): string {
  const lower = workType.toLowerCase();
  if (lower.includes('ซ่อม') || lower.includes('repair')) {
    return '🔔 <b>[ผู้ติดต่อใหม่ - แจ้งซ่อมเครื่องมือแพทย์]</b>';
  }
  if (lower.includes('บำรุงรักษา') || lower.includes('pm') || lower.includes('preventive')) {
    return '🛠️ <b>[ผู้ติดต่อใหม่ - บำรุงรักษา PM]</b>';
  }
  if (lower.includes('ติดตั้ง') || lower.includes('ส่งมอบ') || lower.includes('install') || lower.includes('deliver')) {
    return '📦 <b>[ผู้ติดต่อใหม่ - ส่งมอบ/ติดตั้งเครื่องมือ]</b>';
  }
  if (lower.includes('สอบเทียบ') || lower.includes('cal')) {
    return '📐 <b>[ผู้ติดต่อใหม่ - สอบเทียบ CALIBRATION]</b>';
  }
  if (lower.includes('สาธิต') || lower.includes('demo') || lower.includes('อบรม')) {
    return '💡 <b>[ผู้ติดต่อใหม่ - สาธิต/อบรมการใช้งาน]</b>';
  }
  if (lower.includes('ส่งเอกสาร') || lower.includes('วางบิล') || lower.includes('ติดต่อ')) {
    return '📄 <b>[ผู้ติดต่อใหม่ - ส่งเอกสาร/ติดต่องานทั่วไป]</b>';
  }
  return '🔔 <b>[ผู้ติดต่อใหม่ - ฝ่ายเครื่องมือแพทย์]</b>';
}

/**
 * Maps role to modern emoji tag
 */
function getRoleBadge(role?: string): string {
  if (!role) return '';
  const r = role.trim();
  if (r.includes('ช่าง')) return ` <code>[🔧 ช่างบริการ]</code>`;
  if (r.includes('ผู้แทน')) return ` <code>[👔 ผู้แทนจำหน่าย]</code>`;
  if (r.includes('สเปเชียลลิสต์') || r.includes('ผู้เชี่ยวชาญ')) return ` <code>[🔬 Specialist]</code>`;
  if (r.includes('วิศวกร')) return ` <code>[⚙️ วิศวกรบริการ]</code>`;
  if (r.includes('ส่งสินค้า')) return ` <code>[🚚 พนักงานส่งมอบ]</code>`;
  return ` <code>[👤 ${escapeHtml(r)}]</code>`;
}

/**
 * Maps vehicle type to cute emoji
 */
function getVehicleDisplay(vehicleType?: string, licensePlate?: string): string {
  if (!vehicleType || vehicleType === 'ไม่มีพาหนะ/เดินเท้า' || vehicleType === 'ไม่มีพาหนะ / เดินเท้า') {
    return '🚶 ไม่มีพาหนะ / เดินเท้า';
  }
  const plateStr = licensePlate && licensePlate !== '-' ? ` (${escapeHtml(licensePlate)})` : '';
  if (vehicleType.includes('จักรยานยนต์')) return `🛵 ${escapeHtml(vehicleType)}${plateStr}`;
  if (vehicleType.includes('รถยนต์')) return `🚗 ${escapeHtml(vehicleType)}${plateStr}`;
  if (vehicleType.includes('บรรทุก 4')) return `🚐 ${escapeHtml(vehicleType)}${plateStr}`;
  if (vehicleType.includes('บรรทุก')) return `🚛 ${escapeHtml(vehicleType)}${plateStr}`;
  return `🚗 ${escapeHtml(vehicleType)}${plateStr}`;
}

/**
 * Formats a VisitorRecord into a modern, aesthetic Thai Telegram message with expressive emojis
 */
export function formatVisitorTelegramMessage(record: VisitorRecord): string {
  const header = getWorkTypeHeader(record.workType);
  const roleBadge = getRoleBadge(record.contactRole);
  const vehicleStr = getVehicleDisplay(record.vehicleType, record.licensePlate);

  const equipmentsStr = record.equipmentHandled && record.equipmentHandled.length > 0
    ? record.equipmentHandled.join(', ')
    : 'ไม่ได้ระบุรายการเครื่อง';

  const notesSection = record.notes
    ? `\n📝 <b>หมายเหตุ:</b> ${escapeHtml(record.notes)}`
    : '';

  return `${header}
━━━━━━━━━━━━━━━━━━━━
🏢 <b>บริษัท:</b> ${escapeHtml(record.company)}
👤 <b>ผู้ติดต่อ:</b> <b>${escapeHtml(record.name)}</b>${roleBadge}
📞 <b>โทร:</b> ${escapeHtml(record.phone)}
📍 <b>แผนก:</b> <b>${escapeHtml(record.department)}</b>
⚙️ <b>งาน:</b> ${escapeHtml(record.workType)}
🧰 <b>เครื่องมือ:</b> ${escapeHtml(equipmentsStr)}
👥 <b>จำนวน:</b> ${record.visitorCount} ท่าน
🚙 <b>พาหนะ:</b> ${vehicleStr}
🕒 <b>เวลา:</b> ${escapeHtml(record.timestamp || new Date().toLocaleString('th-TH'))}${notesSection}
━━━━━━━━━━━━━━━━━━━━
🔒 <i>ระบบความปลอดภัย BME | ภาพบัตรถูกคุ้มครองตาม PDPA</i>`;
}

/**
 * Sends a telegram notification (supports both text and photo) with HTML parse mode and fallback to plain text
 */
export async function sendTelegramNotification(
  message: string,
  customConfig?: TelegramConfig,
  photo?: string
): Promise<{ success: boolean; error?: string }> {
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
        return { success: true };
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
          return { success: true };
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
      return { success: true };
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
      return { success: true };
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
  const testMessage = `✨ <b>[ทดสอบการเชื่อมต่อ TELEGRAM สำเร็จ]</b> ✨\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🏥 <b>ระบบ:</b> บันทึกและวิเคราะห์ผู้มาติดต่อเครื่องมือแพทย์ (BME)\n` +
    `🤖 <b>สถานะบอท:</b> ทำงานปกติ พร้อมส่งภาพถ่ายและแจ้งเตือนทันที\n` +
    `📅 <b>เวลาทดสอบ:</b> ${new Date().toLocaleString('th-TH')}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `⚡ <i>ระบบแจ้งเตือนแบบ Real-Time เชื่อมต่อสมบูรณ์</i>`;

  const result = await sendTelegramNotification(testMessage, { ...config, enabled: true });
  if (result.success) {
    return { success: true, message: 'ส่งข้อความทดสอบไปยัง Telegram สำเร็จเรียบร้อยแล้ว!' };
  } else {
    return { success: false, message: result.error || 'เกิดข้อผิดพลาดในการเชื่อมต่อ Telegram' };
  }
}

