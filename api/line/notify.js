export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { token, targetId, record, cardImage, photo, flexMessage, messages, altText } = req.body || {};

    const DEFAULT_LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || 'praRVZr/JOYtwRnvljhGtKyAWjoP0o//LeS9fuX7XySUHMJAbZGSZauKom+TeWjh+OrT/OgjECc8ab8jlVfQpDPnWEigY6LUmm8AYdvUonoWRJvxo5ZnsOxVqlnvdyWTCrjEgmvNEGPkjdapdlsl+QdB04t89/1O/w1cDnyilFU=';
    const DEFAULT_LINE_TARGET_ID = process.env.LINE_TARGET_ID || 'U55b79f4dd628aa9845a60deba9672717';

    let channelAccessToken = (token || DEFAULT_LINE_TOKEN || '').trim().replace(/^["']|["']$/g, '');
    let destinationId = (targetId || DEFAULT_LINE_TARGET_ID || '').trim().replace(/^["']|["']$/g, '');

    if (!/^[UCR][a-fA-F0-9]{32}$/.test(destinationId)) {
      destinationId = DEFAULT_LINE_TARGET_ID;
    }
    if (!channelAccessToken || channelAccessToken.length < 20) {
      channelAccessToken = DEFAULT_LINE_TOKEN;
    }

    // Process image
    let hostedImageUrl = null;
    const rawImage = cardImage || photo || record?.cardImage || record?.cardImageUrl;
    if (rawImage && typeof rawImage === 'string' && rawImage.startsWith('data:image/')) {
      try {
        const match = rawImage.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
        if (match) {
          const buffer = Buffer.from(match[2], 'base64');
          const formData = new FormData();
          formData.append('file', new Blob([buffer], { type: 'image/jpeg' }), 'visitor_card.jpg');
          const tmpRes = await fetch('https://tmpfiles.org/api/v1/upload', {
            method: 'POST',
            body: formData
          });
          if (tmpRes.ok) {
            const tmpJson = await tmpRes.json();
            if (tmpJson?.data?.url) {
              hostedImageUrl = tmpJson.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
            }
          }
        }
      } catch (e) {
        console.warn('Vercel image upload warning:', e);
      }
    } else if (rawImage && typeof rawImage === 'string' && rawImage.startsWith('https://')) {
      hostedImageUrl = rawImage;
    }

    let payloadMessages = [];
    if (messages && Array.isArray(messages) && messages.length > 0) {
      payloadMessages = messages;
    } else if (flexMessage) {
      payloadMessages = [flexMessage];
    } else if (record) {
      const builtFlex = createVisitorFlexMessage(record, altText, hostedImageUrl);
      payloadMessages = [builtFlex];
    } else {
      return res.status(400).json({ success: false, error: 'Record is required' });
    }

    const linePushUrl = 'https://api.line.me/v2/bot/message/push';
    let response = await fetch(linePushUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${channelAccessToken}`
      },
      body: JSON.stringify({
        to: destinationId,
        messages: payloadMessages
      })
    });

    let data = await response.json().catch(() => ({}));

    // Retry without image if rejected by LINE
    if (!response.ok && record && hostedImageUrl) {
      const flexNoImage = createVisitorFlexMessage(record, altText, null);
      const retryRes = await fetch(linePushUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${channelAccessToken}`
        },
        body: JSON.stringify({
          to: destinationId,
          messages: [flexNoImage]
        })
      });
      if (retryRes.ok) {
        response = retryRes;
        data = await retryRes.json().catch(() => ({}));
      }
    }

    if (!response.ok) {
      return res.status(response.status || 400).json({
        success: false,
        error: data.message || 'LINE Push API request failed',
        details: data
      });
    }

    return res.status(200).json({
      success: true,
      message: 'LINE Flex notification sent successfully',
      targetId: destinationId,
      result: data
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Serverless error'
    });
  }
}

function createVisitorFlexMessage(record, altText, photoUrl) {
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

  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const hasValidPhone = cleanPhone.length >= 8;

  const flexBubble = {
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
            { type: 'text', text: '🏥 BME VISITOR PASS', color: '#38BDF8', size: 'xs', weight: 'bold', flex: 1 },
            {
              type: 'box',
              layout: 'horizontal',
              backgroundColor: '#065F46',
              cornerRadius: 'sm',
              paddingStart: 'xs',
              paddingEnd: 'xs',
              contents: [{ type: 'text', text: '🟢 เช็คอินเข้าพื้นที่', color: '#34D399', size: 'xxs', weight: 'bold' }]
            }
          ]
        },
        { type: 'text', text: '🔔 แจ้งเตือนผู้มาติดต่อแผนกวิศวกรรมการแพทย์ (BME)', color: '#FFFFFF', size: 'md', weight: 'bold', wrap: true },
        { type: 'text', text: 'โรงพยาบาลพญาไทพหลโยธิน', color: '#94A3B8', size: 'xxs' }
      ]
    },
    body: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: '#F8FAFC',
      paddingAll: 'md',
      spacing: 'sm',
      contents: [
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
                { type: 'text', text: '📝 รายละเอียด:', size: 'xs', color: '#64748B', flex: 4 },
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
                { type: 'text', text: photoUrl ? '📷 แนบรูปถ่ายการ์ดแล้ว' : 'ไม่ได้แนบรูปถ่าย', size: 'xs', color: photoUrl ? '#059669' : '#64748B', weight: 'bold', flex: 5 }
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
    }
  };

  if (hasValidPhone) {
    flexBubble.footer = {
      type: 'box',
      layout: 'vertical',
      spacing: 'xs',
      backgroundColor: '#FFFFFF',
      paddingAll: 'md',
      contents: [{
        type: 'button',
        style: 'primary',
        color: '#06C755',
        height: 'sm',
        action: { type: 'uri', label: '📞 โทรหาผู้ติดต่อ', uri: `tel:${cleanPhone}` }
      }]
    };
  }

  if (photoUrl) {
    flexBubble.hero = {
      type: 'image',
      url: photoUrl,
      size: 'full',
      aspectRatio: '16:9',
      aspectMode: 'cover',
      action: { type: 'uri', label: '🔍 ดูรูปถ่ายขนาดเต็ม', uri: photoUrl }
    };
  }

  return {
    type: 'flex',
    altText: (altText || `🔔 แจ้งเตือนผู้มาติดต่อ: ${visitorName} (${company}) เข้าพบ ${department}`).substring(0, 390),
    contents: flexBubble
  };
}
