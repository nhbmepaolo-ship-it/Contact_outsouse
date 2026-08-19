import { VisitorRecord, LineConfig } from '../types';
import { StorageService } from './storageService';

export const DEFAULT_LINE_CONFIG: LineConfig = {
  channelAccessToken: 'praRVZr/JOYtwRnvljhGtKyAWjoP0o//LeS9fuX7XySUHMJAbZGSZauKom+TeWjh+OrT/OgjECc8ab8jlVfQpDPnWEigY6LUmm8AYdvUonoWRJvxo5ZnsOxVqlnvdyWTCrjEgmvNEGPkjdapdlsl+QdB04t89/1O/w1cDnyilFU=',
  targetId: 'U55b79f4dd628aa9845a60deba9672717',
  enabled: true,
  notifyOnNewVisitor: true,
  lastTestStatus: null,
};

/**
 * Builds a modern, high-contrast, mobile-friendly LINE Flex Message card (Bubble Container)
 */
export function buildVisitorLineFlexMessage(record: VisitorRecord, customAltText?: string) {
  const visitorName = record.name || 'ไม่ระบุชื่อ';
  const company = record.company || 'ไม่ระบุบริษัท';
  const role = record.contactRole || 'ช่าง/ผู้ติดต่อ';
  const department = record.department || 'ไม่ระบุแผนก';
  const workType = record.workType || 'ไม่ระบุลักษณะงาน';
  const phone = record.phone || '-';
  const visitorCount = record.visitorCount || 1;
  const vehicle = `${record.vehicleType || '-'}${record.licensePlate && record.licensePlate !== '-' ? ` (${record.licensePlate})` : ''}`;
  const timestamp = record.timestamp || new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
  const equipments = Array.isArray(record.equipmentHandled) && record.equipmentHandled.length > 0
    ? record.equipmentHandled.join(', ')
    : 'ไม่ได้ระบุเครื่องมือ';
  const workDetails = record.workDetails || '';
  const notes = record.notes || '';
  let photoUrl = record.cardImageUrl || (record.cardImage && typeof record.cardImage === 'string' ? record.cardImage : null);
  if (photoUrl) {
    if (photoUrl.startsWith('http://')) {
      photoUrl = photoUrl.replace('http://', 'https://');
    } else if (!photoUrl.startsWith('https://')) {
      photoUrl = null;
    }
  }

  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const hasValidPhone = cleanPhone.length >= 8;

  const flexBubble: any = {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: '#0F172A',
      paddingAll: 'lg',
      spacing: 'xs',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          alignItems: 'center',
          contents: [
            {
              type: 'text',
              text: '🏥 BME VISITOR PASS',
              color: '#38BDF8',
              size: 'xs',
              weight: 'bold',
              flex: 1
            },
            {
              type: 'box',
              layout: 'horizontal',
              backgroundColor: '#065F46',
              cornerRadius: 'sm',
              paddingStart: 'xs',
              paddingEnd: 'xs',
              contents: [
                {
                  type: 'text',
                  text: '🟢 เช็คอินเข้าพื้นที่',
                  color: '#34D399',
                  size: 'xxs',
                  weight: 'bold'
                }
              ]
            }
          ]
        },
        {
          type: 'text',
          text: '🔔 แจ้งเตือนผู้มาติดต่อแผนกวิศวกรรมการแพทย์ (BME)',
          color: '#FFFFFF',
          size: 'md',
          weight: 'bold',
          wrap: true
        },
        {
          type: 'text',
          text: 'โรงพยาบาลพญาไทพหลโยธิน',
          color: '#94A3B8',
          size: 'xxs'
        }
      ]
    },
    body: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: '#F8FAFC',
      paddingAll: '14px',
      spacing: 'sm',
      contents: [
        // 1. Visitor Profile Card
        {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#FFFFFF',
          cornerRadius: 'md',
          paddingAll: 'md',
          borderColor: '#E2E8F0',
          borderWidth: 'light',
          spacing: 'xs',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '👤 ชื่อผู้ติดต่อ:', size: 'xs', color: '#64748B', flex: 3 },
                { type: 'text', text: visitorName, size: 'xs', color: '#0F172A', weight: 'bold', flex: 5, wrap: true }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '🏢 บริษัท/สังกัด:', size: 'xs', color: '#64748B', flex: 3 },
                { type: 'text', text: company, size: 'xs', color: '#2563EB', weight: 'bold', flex: 5, wrap: true }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '🏷️ บทบาท:', size: 'xs', color: '#64748B', flex: 3 },
                { type: 'text', text: role, size: 'xs', color: '#334155', flex: 5 }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '📞 เบอร์ติดต่อ:', size: 'xs', color: '#64748B', flex: 3 },
                { type: 'text', text: phone, size: 'xs', color: '#059669', weight: 'bold', flex: 5 }
              ]
            }
          ]
        },
        // 2. Visit Details Card
        {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#FFFFFF',
          cornerRadius: 'md',
          paddingAll: 'md',
          borderColor: '#E2E8F0',
          borderWidth: 'light',
          spacing: 'xs',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '📍 แผนกที่เข้าพบ:', size: 'xs', color: '#64748B', flex: 4 },
                { type: 'text', text: department, size: 'xs', color: '#0F172A', weight: 'bold', flex: 5, wrap: true }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '🛠️ ลักษณะงาน:', size: 'xs', color: '#64748B', flex: 4 },
                { type: 'text', text: workType, size: 'xs', color: '#D97706', weight: 'bold', flex: 5, wrap: true }
              ]
            },
            ...(workDetails ? [{
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '📝 รายละเอียดงาน:', size: 'xs', color: '#64748B', flex: 4 },
                { type: 'text', text: workDetails, size: 'xs', color: '#334155', flex: 5, wrap: true }
              ]
            }] : []),
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '🧰 เครื่องมือแพทย์:', size: 'xs', color: '#64748B', flex: 4 },
                { type: 'text', text: equipments, size: 'xs', color: '#2563EB', weight: 'bold', flex: 5, wrap: true }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '👥 จำนวนผู้เข้าพบ:', size: 'xs', color: '#64748B', flex: 4 },
                { type: 'text', text: `${visitorCount} ท่าน`, size: 'xs', color: '#334155', flex: 5 }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '🚗 ยานพาหนะ:', size: 'xs', color: '#64748B', flex: 4 },
                { type: 'text', text: vehicle, size: 'xs', color: '#334155', flex: 5, wrap: true }
              ]
            },
            ...(notes ? [{
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '💬 หมายเหตุ:', size: 'xs', color: '#64748B', flex: 4 },
                { type: 'text', text: notes, size: 'xs', color: '#475569', flex: 5, wrap: true }
              ]
            }] : []),
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '📸 รูปถ่ายบัตร/เอกสาร:', size: 'xs', color: '#64748B', flex: 4 },
                { type: 'text', text: (record.cardImageUrl || record.cardImage) ? '📷 ถ่ายและบันทึกในระบบเรียบร้อย' : 'ไม่ได้แนบรูปถ่าย', size: 'xs', color: (record.cardImageUrl || record.cardImage) ? '#059669' : '#64748B', weight: 'bold', flex: 5 }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '⏰ เวลาที่บันทึก:', size: 'xs', color: '#64748B', flex: 4 },
                { type: 'text', text: timestamp, size: 'xxs', color: '#64748B', flex: 5 }
              ]
            }
          ]
        }
      ]
    },
  if (hasValidPhone) {
    flexBubble.footer = {
      type: 'box',
      layout: 'vertical',
      spacing: 'xs',
      backgroundColor: '#FFFFFF',
      paddingAll: 'md',
      contents: [
        {
          type: 'button',
          style: 'primary',
          color: '#06C755',
          height: 'sm',
          action: {
            type: 'uri',
            label: '📞 โทรหาผู้ติดต่อ',
            uri: `tel:${cleanPhone}`
          }
        }
      ]
    };
  }
  };

  if (photoUrl) {
    flexBubble.hero = {
      type: 'image',
      url: photoUrl,
      size: 'full',
      aspectRatio: '16:9',
      aspectMode: 'cover',
      action: {
        type: 'uri',
        uri: photoUrl
      }
    };
  }

  return {
    type: 'flex',
    altText: customAltText || `🔔 แจ้งเตือนผู้มาติดต่อ: ${visitorName} (${company}) เข้าพบ ${department}`,
    contents: flexBubble
  };
}

/**
 * Sends a visitor notification Flex Card via LINE Messaging API
 */
export async function sendLineFlexNotification(
  record: VisitorRecord,
  customConfig?: Partial<LineConfig>
): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    const savedConfig = StorageService.getLineConfig();
    let token = (customConfig?.channelAccessToken || savedConfig.channelAccessToken || DEFAULT_LINE_CONFIG.channelAccessToken || '').trim().replace(/^["']|["']$/g, '');
    let target = (customConfig?.targetId || savedConfig.targetId || DEFAULT_LINE_CONFIG.targetId || '').trim().replace(/^["']|["']$/g, '');

    // Fallback if target is invalid LINE ID (must start with U, C, or R and be 33 chars long)
    if (!/^[UCR][a-fA-F0-9]{32}$/.test(target)) {
      target = DEFAULT_LINE_CONFIG.targetId;
    }
    if (!token || token.length < 20) {
      token = DEFAULT_LINE_CONFIG.channelAccessToken;
    }

    const config = {
      channelAccessToken: token,
      targetId: target,
      enabled: customConfig?.enabled !== undefined ? customConfig.enabled : true
    };

    if (!config.enabled) {
      return { success: false, message: 'การแจ้งเตือน LINE ปิดใช้งานอยู่ในตั้งค่า' };
    }

    if (!config.channelAccessToken || !config.targetId) {
      return { success: false, message: 'ขาด LINE Channel Access Token หรือ Target User ID' };
    }

    // Call server proxy endpoint to securely dispatch LINE push message
    const response = await fetch('/api/line/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: config.channelAccessToken,
        targetId: config.targetId,
        record: record,
        altText: `🔔 ผู้มาติดต่อ: ${record.name} (${record.company}) เข้าพบ ${record.department}`
      })
    });

    const resText = await response.text();
    let data: any = {};
    try {
      data = resText ? JSON.parse(resText) : {};
    } catch {
      data = { error: resText ? resText.slice(0, 200) : 'ระบบส่งผลลัพธ์ตอบกลับว่างเปล่า' };
    }

    if (!response.ok || !data.success) {
      return {
        success: false,
        message: data.error || data.message || 'ส่งการ์ดแจ้งเตือน LINE ไม่สำเร็จ',
        details: data
      };
    }

    return {
      success: true,
      message: 'LINE Flex Message notification dispatched successfully!',
      details: data
    };
  } catch (err: any) {
    console.error('Error in sendLineFlexNotification:', err);
    return {
      success: false,
      message: err.message || 'Network error while sending LINE notification'
    };
  }
}

/**
 * Sends a test LINE Flex notification to verify Channel Access Token and Target User ID
 */
export async function testLineFlexNotification(
  token: string,
  targetId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const cleanToken = token.trim();
    const cleanTargetId = targetId.trim();

    if (!cleanToken) {
      return { success: false, message: 'กรุณากรอก LINE Channel Access Token' };
    }
    if (!cleanTargetId) {
      return { success: false, message: 'กรุณากรอก LINE Target User ID / Group ID (เช่น U55b79f4...)' };
    }

    const response = await fetch('/api/line/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: cleanToken,
        targetId: cleanTargetId
      })
    });

    const resText = await response.text();
    let data: any = {};
    try {
      data = resText ? JSON.parse(resText) : {};
    } catch {
      data = { error: resText ? resText.slice(0, 200) : 'ระบบตอบกลับมาว่างเปล่า' };
    }

    if (!response.ok || !data.success) {
      return {
        success: false,
        message: data.error || 'ไม่สามารถส่งข้อความทดสอบ LINE ได้ กรุณาตรวจสอบ Token และ User ID'
      };
    }

    return {
      success: true,
      message: '✅ ส่งการ์ดแจ้งเตือนทดสอบเข้า LINE เรียบร้อยแล้ว! ตรวจสอบข้อความในการ์ดบนแอปพลิเคชัน LINE ได้เลย'
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์ LINE'
    };
  }
}
