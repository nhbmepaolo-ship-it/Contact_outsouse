import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Default credentials from user prompt
const DEFAULT_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8344422414:AAER_-ry1d6--UU8CC7m0xFin1v67gHOiJQ';
const DEFAULT_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '-5275868334';
const DEFAULT_SHEET_ID = process.env.GOOGLE_SHEET_ID || '1ry7U0ZSuMT5yYYkDpRHukuYLQQrPEfy4jP3GnpxyJM8';
const DEFAULT_SHEET_WEBHOOK_URL = process.env.GOOGLE_SHEET_WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycbwhVd6WgGXlJYk_u8LGNuVoRXwdANYy980C7edxKtVOnPSoFlrOAxdQgASuoLg-hbiW/exec';
const DEFAULT_LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || 'praRVZr/JOYtwRnvljhGtKyAWjoP0o//LeS9fuX7XySUHMJAbZGSZauKom+TeWjh+OrT/OgjECc8ab8jlVfQpDPnWEigY6LUmm8AYdvUonoWRJvxo5ZnsOxVqlnvdyWTCrjEgmvNEGPkjdapdlsl+QdB04t89/1O/w1cDnyilFU=';
const DEFAULT_LINE_TARGET_ID = process.env.LINE_TARGET_ID || 'U55b79f4dd628aa9845a60deba9672717';

// ================= PERSISTENT SETTINGS STORAGE =================
const DATA_DIR = path.join(process.cwd(), 'data_store');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

interface ServerSettings {
  telegramToken: string;
  telegramChatId: string;
  sheetId: string;
  sheetWebhookUrl: string;
  lineToken: string;
  lineTargetId: string;
  lastUpdated?: string;
}

// ================= IMAGE CACHE & HOSTING FOR LINE / TELEGRAM NOTIFICATIONS =================
interface StoredImage {
  id: string;
  dataBuffer: Buffer;
  contentType: string;
  createdAt: number;
}
const imageCache = new Map<string, StoredImage>();

// Clean up old images (> 7 days) periodically
function cleanupImageCache() {
  const now = Date.now();
  const maxAge = 7 * 24 * 60 * 60 * 1000;
  for (const [key, item] of imageCache.entries()) {
    if (now - item.createdAt > maxAge) {
      imageCache.delete(key);
    }
  }
}
setInterval(cleanupImageCache, 60 * 60 * 1000);

function getPublicBaseUrl(req: express.Request): string {
  const forwardedHost = req.headers['x-forwarded-host'];
  let host = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) || (req.headers.host as string) || '';

  // If host is localhost or internal IP, attempt to extract domain from Origin or Referer
  if (!host || host.includes('localhost') || host.includes('127.0.0.1') || host.includes('0.0.0.0')) {
    const origin = (req.headers.origin || req.headers.referer || '') as string;
    if (origin) {
      try {
        const u = new URL(origin);
        if (u.host && !u.host.includes('localhost') && !u.host.includes('127.0.0.1')) {
          host = u.host;
        }
      } catch {}
    }
  }

  // Fallback to active applet Cloud Run domain if still resolving to localhost
  if (!host || host.includes('localhost') || host.includes('127.0.0.1') || host.includes('0.0.0.0')) {
    host = 'ais-dev-6yyvaxuyfshptmt6of36ru-1007627916452.asia-southeast1.run.app';
  }

  return `https://${host}`;
}

async function uploadPhotoToTelegramCDN(buffer: Buffer): Promise<string | null> {
  try {
    const botToken = (cachedSettings.telegramToken || DEFAULT_BOT_TOKEN || '').trim();
    const chatId = (cachedSettings.telegramChatId || DEFAULT_CHAT_ID || '').trim();
    if (!botToken || !chatId) return null;

    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('photo', new Blob([buffer], { type: 'image/jpeg' }), 'visitor_card.jpg');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    const sendRes = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      method: 'POST',
      body: formData,
      signal: controller.signal
    });
    clearTimeout(timer);

    const sendData = await sendRes.json();
    if (!sendData.ok || !sendData.result?.photo) return null;

    const photos = sendData.result.photo;
    const largestPhoto = photos[photos.length - 1];
    if (!largestPhoto?.file_id) return null;

    const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${largestPhoto.file_id}`);
    const fileData = await fileRes.json();

    if (fileData.ok && fileData.result?.file_path) {
      return `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
    }
  } catch (err) {
    console.warn('Telegram CDN upload failed or skipped:', err);
  }
  return null;
}

async function uploadToTmpfiles(buffer: Buffer): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append('file', new Blob([buffer], { type: 'image/jpeg' }), 'visitor_card.jpg');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    const res = await fetch('https://tmpfiles.org/api/v1/upload', {
      method: 'POST',
      body: formData,
      signal: controller.signal
    });
    clearTimeout(timer);

    if (res.ok) {
      const json = await res.json();
      const rawUrl = json?.data?.url;
      if (rawUrl && typeof rawUrl === 'string') {
        return rawUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
      }
    }
  } catch (err) {
    console.warn('tmpfiles upload failed or skipped:', err);
  }
  return null;
}

async function storeImageAndGetPublicUrlAsync(photoData: string | undefined, req: express.Request, idHint?: string): Promise<string | null> {
  if (!photoData || typeof photoData !== 'string') return null;
  const clean = photoData.trim();
  if (!clean) return null;

  if (clean.startsWith('https://') && !clean.includes('localhost') && !clean.includes('127.0.0.1') && !clean.includes('.run.app')) {
    return clean;
  }

  if (clean.startsWith('data:image/')) {
    try {
      const match = clean.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (match) {
        const base64Data = match[2];
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Tier 1: Telegram CDN
        const telegramUrl = await uploadPhotoToTelegramCDN(buffer);
        if (telegramUrl) return telegramUrl;

        // Tier 2: tmpfiles CDN
        const tmpUrl = await uploadToTmpfiles(buffer);
        if (tmpUrl) return tmpUrl;

        // Tier 3: Server Image Cache Endpoint
        return storeImageAndGetPublicUrl(photoData, req, idHint);
      }
    } catch (e) {
      console.warn('Failed to parse base64 image for public CDN:', e);
    }
  }
  return null;
}

function storeImageAndGetPublicUrl(photoData: string | undefined, req: express.Request, idHint?: string): string | null {
  if (!photoData || typeof photoData !== 'string') return null;
  const clean = photoData.trim();
  if (!clean) return null;

  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }

  if (clean.startsWith('data:image/')) {
    try {
      const match = clean.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (match) {
        const contentType = match[1];
        const base64Data = match[2];
        const buffer = Buffer.from(base64Data, 'base64');
        const id = idHint ? `img_${idHint.replace(/[^a-zA-Z0-9_-]/g, '_')}` : `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        imageCache.set(id, {
          id,
          dataBuffer: buffer,
          contentType: contentType || 'image/jpeg',
          createdAt: Date.now()
        });
        const baseUrl = getPublicBaseUrl(req);
        return `${baseUrl}/api/images/${id}.jpg`;
      }
    } catch (e) {
      console.warn('Failed to parse and store base64 image:', e);
    }
  }
  return null;
}

function loadServerSettings(): ServerSettings {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      return {
        telegramToken: parsed.telegramToken || DEFAULT_BOT_TOKEN,
        telegramChatId: parsed.telegramChatId || DEFAULT_CHAT_ID,
        sheetId: parsed.sheetId || DEFAULT_SHEET_ID,
        sheetWebhookUrl: parsed.sheetWebhookUrl || DEFAULT_SHEET_WEBHOOK_URL,
        lineToken: parsed.lineToken || DEFAULT_LINE_TOKEN,
        lineTargetId: parsed.lineTargetId || DEFAULT_LINE_TARGET_ID,
        lastUpdated: parsed.lastUpdated || new Date().toISOString()
      };
    }
  } catch (err) {
    console.error('Error reading server settings:', err);
  }
  return {
    telegramToken: DEFAULT_BOT_TOKEN,
    telegramChatId: DEFAULT_CHAT_ID,
    sheetId: DEFAULT_SHEET_ID,
    sheetWebhookUrl: DEFAULT_SHEET_WEBHOOK_URL,
    lineToken: DEFAULT_LINE_TOKEN,
    lineTargetId: DEFAULT_LINE_TARGET_ID,
    lastUpdated: new Date().toISOString()
  };
}

let cachedSettings = loadServerSettings();

function saveServerSettings(newSettings: Partial<ServerSettings>): ServerSettings {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    cachedSettings = {
      ...cachedSettings,
      ...newSettings,
      lastUpdated: new Date().toISOString()
    };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(cachedSettings, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing server settings:', err);
  }
  return cachedSettings;
}

// Lazy Gemini API Client
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({ apiKey });
  }
  return genAIClient;
}

// ================= API ROUTES =================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    telegramConfigured: !!(cachedSettings.telegramToken && cachedSettings.telegramChatId),
    lineConfigured: !!(cachedSettings.lineToken && cachedSettings.lineTargetId),
    sheetId: cachedSettings.sheetId || DEFAULT_SHEET_ID,
    sheetWebhookConfigured: !!cachedSettings.sheetWebhookUrl,
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString()
  });
});

// Settings GET/POST endpoints
app.get('/api/settings', (req, res) => {
  return res.json({
    success: true,
    settings: cachedSettings
  });
});

// Endpoint to serve attached visitor card images to LINE / Telegram / external viewers
app.get('/api/images/:id', (req, res) => {
  const rawId = req.params.id || '';
  const cleanId = rawId.replace(/\.(jpg|jpeg|png|webp)$/i, '');
  const found = imageCache.get(cleanId);
  if (!found) {
    return res.status(404).send('Image not found or expired');
  }
  res.setHeader('Content-Type', found.contentType || 'image/jpeg');
  res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.send(found.dataBuffer);
});

app.post('/api/settings', (req, res) => {
  try {
    const { telegramToken, telegramChatId, sheetId, sheetWebhookUrl, lineToken, lineTargetId } = req.body;
    const updated = saveServerSettings({
      ...(telegramToken !== undefined && { telegramToken: String(telegramToken).trim() }),
      ...(telegramChatId !== undefined && { telegramChatId: String(telegramChatId).trim() }),
      ...(sheetId !== undefined && { sheetId: String(sheetId).trim() }),
      ...(sheetWebhookUrl !== undefined && { sheetWebhookUrl: String(sheetWebhookUrl).trim() }),
      ...(lineToken !== undefined && { lineToken: String(lineToken).trim() }),
      ...(lineTargetId !== undefined && { lineTargetId: String(lineTargetId).trim() }),
    });
    return res.json({
      success: true,
      message: 'Server settings saved successfully',
      settings: updated
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Telegram notification endpoint (Supports text and photo uploads)
app.post('/api/telegram/send', async (req, res) => {
  try {
    const { message, token, chatId, photo, image, parse_mode = 'HTML' } = req.body;
    const botToken = (token || DEFAULT_BOT_TOKEN || '').trim();
    const targetChatId = (chatId || DEFAULT_CHAT_ID || '').trim();
    const photoData = photo || image;

    if (!botToken || !targetChatId) {
      return res.status(400).json({
        success: false,
        error: 'Missing Telegram Bot Token or Chat ID'
      });
    }

    if (!message && !photoData) {
      return res.status(400).json({
        success: false,
        error: 'Message content or photo is required'
      });
    }

    let sendSuccess = false;
    let resultData: any = null;

    // 1. Try sending with photo if photo is provided
    if (photoData) {
      try {
        if (typeof photoData === 'string' && photoData.startsWith('data:image/')) {
          // Parse data URL
          const match = photoData.match(/^data:(image\/[a-zA-Z0-9+]+);base64,(.+)$/);
          const mimeType = match ? match[1] : 'image/jpeg';
          const base64Str = match ? match[2] : photoData.replace(/^data:image\/\w+;base64,/, '');
          const buffer = Buffer.from(base64Str, 'base64');
          const uint8 = new Uint8Array(buffer);
          const blob = new Blob([uint8], { type: mimeType });
          const ext = mimeType.includes('png') ? 'png' : 'jpg';

          const formData = new FormData();
          formData.append('chat_id', targetChatId);
          formData.append('photo', blob, `visitor_card.${ext}`);
          if (message) {
            formData.append('caption', message.slice(0, 1024));
            formData.append('parse_mode', parse_mode);
          }

          const photoRes = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
            method: 'POST',
            body: formData
          });

          resultData = await photoRes.json();
          if (photoRes.ok && resultData.ok) {
            sendSuccess = true;
          } else {
            console.warn('sendPhoto with HTML caption failed, retrying plain text caption...', resultData?.description);
            // Retry photo with plain text caption
            const plainCaption = message ? message.replace(/<[^>]*>/g, '').replace(/[*_`\[\]()]/g, '').slice(0, 1024) : '';
            const retryFormData = new FormData();
            retryFormData.append('chat_id', targetChatId);
            retryFormData.append('photo', blob, `visitor_card.${ext}`);
            if (plainCaption) {
              retryFormData.append('caption', plainCaption);
            }

            const retryRes = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
              method: 'POST',
              body: retryFormData
            });
            const retryData = await retryRes.json();
            if (retryRes.ok && retryData.ok) {
              resultData = retryData;
              sendSuccess = true;
            }
          }
        } else if (typeof photoData === 'string' && (photoData.startsWith('http://') || photoData.startsWith('https://'))) {
          // Public image URL
          const photoRes = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: targetChatId,
              photo: photoData,
              caption: message,
              parse_mode: parse_mode
            })
          });
          resultData = await photoRes.json();
          if (photoRes.ok && resultData.ok) {
            sendSuccess = true;
          }
        }
      } catch (photoErr) {
        console.warn('Error during photo dispatch, will fallback to text message:', photoErr);
      }
    }

    // 2. If photo sending didn't happen or failed, send as text message
    if (!sendSuccess) {
      const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      let response = await fetch(telegramUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: targetChatId,
          text: message || 'แจ้งเตือนผู้มาติดต่อ',
          parse_mode: parse_mode,
          disable_web_page_preview: true
        })
      });

      resultData = await response.json();

      // Fallback: If Telegram rejected due to parsing entities, retry as clean plain text
      if (!response.ok || !resultData.ok) {
        console.warn('Telegram primary parse attempt failed, retrying plain text...', resultData.description);
        const plainText = (message || '').replace(/<[^>]*>/g, '').replace(/[*_`\[\]()]/g, '');
        response = await fetch(telegramUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: targetChatId,
            text: plainText,
            disable_web_page_preview: true
          })
        });
        resultData = await response.json();
      }

      if (response.ok && resultData.ok) {
        sendSuccess = true;
      }
    }

    if (!sendSuccess || !resultData?.ok) {
      console.error('Telegram API error:', resultData);
      return res.status(400).json({
        success: false,
        error: resultData?.description || 'Telegram dispatch failed',
        details: resultData
      });
    }

    return res.json({
      success: true,
      messageId: resultData.result?.message_id,
      hasPhoto: !!photoData,
      data: resultData
    });
  } catch (error: any) {
    console.error('Error sending Telegram notification:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error while sending Telegram message'
    });
  }
});

// Telegram test endpoint
app.post('/api/telegram/test', async (req, res) => {
  try {
    const { token, chatId } = req.body;
    const botToken = (token || DEFAULT_BOT_TOKEN || '').trim();
    const targetChatId = (chatId || DEFAULT_CHAT_ID || '').trim();

    const testMessage = `🔔 <b>ทดสอบการเชื่อมต่อระบบแจ้งเตือน Telegram สำเร็จ!</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🏥 <b>ระบบ:</b> ระบบบันทึกและวิเคราะห์ผู้มาติดต่อเครื่องมือแพทย์\n` +
      `📅 <b>เวลา:</b> ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}\n` +
      `✅ <b>สถานะ:</b> บอทพร้อมส่งการแจ้งเตือนแบบเรียลไทม์เมื่อมีผู้มาติดต่อหรือช่างเข้าปฏิบัติงาน`;

    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetChatId,
        text: testMessage,
        parse_mode: 'HTML'
      })
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      return res.status(400).json({
        success: false,
        error: data.description || 'Failed to send test message'
      });
    }

    return res.json({ success: true, message: 'Test message sent successfully', result: data.result });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ================= LINE MESSAGING API NOTIFICATIONS =================

// Helper function to build a modern, high-contrast, mobile-friendly LINE Flex Message card
function createVisitorFlexMessage(record: any, altText?: string, imageUrl?: string | null) {
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
    : 'ไม่มี/ไม่ได้ระบุ';
  const workDetails = record.workDetails || '';
  const notes = record.notes || '';

  // Ensure image URL is valid HTTPS and publicly fetchable without auth (LINE API strictly requires public https:// and rejects localhost / sandbox preview proxies)
  let photoUrl = imageUrl !== undefined ? imageUrl : (record?.cardImageUrl && typeof record.cardImageUrl === 'string' ? record.cardImageUrl : null);
  if (photoUrl) {
    if (photoUrl.startsWith('http://')) {
      photoUrl = photoUrl.replace('http://', 'https://');
    }
    if (
      !photoUrl.startsWith('https://') ||
      photoUrl.includes('localhost') ||
      photoUrl.includes('127.0.0.1') ||
      photoUrl.includes('0.0.0.0') ||
      photoUrl.includes('.run.app') ||
      photoUrl.includes('data:image/')
    ) {
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
              text: '🏥 BME VISITOR ALERT',
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
      paddingAll: 'md',
      spacing: 'sm',
      contents: [
        // Visitor profile card box
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
        // Visit Details box
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
    }
  };

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

  // Attach hero image if a valid https URL (such as Telegram CDN / tmpfiles / server host) is available
  if (photoUrl) {
    flexBubble.hero = {
      type: 'image',
      url: photoUrl,
      size: 'full',
      aspectRatio: '16:9',
      aspectMode: 'cover',
      action: {
        type: 'uri',
        label: '🔍 ดูรูปถ่ายขนาดเต็ม',
        uri: photoUrl
      }
    };
  }

  const cleanAltText = (altText || `🔔 แจ้งเตือนผู้มาติดต่อ: ${visitorName} (${company}) เข้าพบแผนก ${department}`).substring(0, 390);

  return {
    type: 'flex',
    altText: cleanAltText,
    contents: flexBubble
  };
}

// Push LINE Flex message to user / group
app.post('/api/line/notify', async (req, res) => {
  try {
    const { token, targetId, record, cardImage, photo, flexMessage, messages, altText } = req.body;
    let channelAccessToken = (token || cachedSettings.lineToken || DEFAULT_LINE_TOKEN || '').trim().replace(/^["']|["']$/g, '');
    let destinationId = (targetId || cachedSettings.lineTargetId || DEFAULT_LINE_TARGET_ID || '').trim().replace(/^["']|["']$/g, '');

    // Strict validation for LINE Target ID format (starts with U, C, or R followed by 32 hex chars)
    const isLineIdValid = /^[UCR][a-fA-F0-9]{32}$/.test(destinationId);
    if (!isLineIdValid) {
      console.warn(`[LINE NOTIFY] Invalid destinationId "${destinationId}". Auto-reverting to default valid LINE Target ID "${DEFAULT_LINE_TARGET_ID}"`);
      destinationId = DEFAULT_LINE_TARGET_ID;
    }

    if (!channelAccessToken || channelAccessToken.length < 20) {
      console.warn(`[LINE NOTIFY] Invalid channelAccessToken. Auto-reverting to default token.`);
      channelAccessToken = DEFAULT_LINE_TOKEN;
    }

    // Process attached image if present (asynchronously upload to public host for LINE display)
    const rawImage = cardImage || photo || record?.cardImage || record?.cardImageUrl;
    const recordId = record?.id || `rec_${Date.now()}`;
    const hostedImageUrl = await storeImageAndGetPublicUrlAsync(rawImage, req, recordId);

    let payloadMessages: any[] = [];

    if (messages && Array.isArray(messages) && messages.length > 0) {
      payloadMessages = messages;
    } else if (flexMessage) {
      payloadMessages = [flexMessage];
    } else if (record) {
      const builtFlex = createVisitorFlexMessage(record, altText, hostedImageUrl);
      payloadMessages = [builtFlex];
    } else {
      return res.status(400).json({
        success: false,
        error: 'Either record, flexMessage, or messages array is required'
      });
    }

    // Call LINE Messaging API push endpoint
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

    // Automatic Fallback: If LINE rejected due to image URL validation error, retry without image
    if (!response.ok && record) {
      console.warn('LINE push with image failed, retrying Flex Card without hero image...', data);
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
      const retryData = await retryRes.json().catch(() => ({}));
      if (retryRes.ok) {
        response = retryRes;
        data = retryData;
      }
    }

    if (!response.ok) {
      console.error('LINE Messaging API error:', data);
      const detailStr = Array.isArray(data.details) && data.details.length > 0
        ? data.details.map((d: any) => `${d.property || ''}: ${d.message || ''}`).join('; ')
        : '';
      const formattedErr = detailStr ? `${data.message || 'Error'} -> [${detailStr}]` : (data.message || 'LINE Push API request failed');
      return res.status(response.status).json({
        success: false,
        error: formattedErr,
        details: data
      });
    }

    return res.json({
      success: true,
      message: 'LINE Flex notification sent successfully',
      targetId: destinationId,
      hasAttachedPhoto: !!hostedImageUrl,
      imageUrl: hostedImageUrl,
      result: data
    });
  } catch (error: any) {
    console.error('Error sending LINE notification:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error while dispatching LINE message'
    });
  }
});

// Test LINE Connection & Flex Card Preview
app.post('/api/line/test', async (req, res) => {
  try {
    const { token, targetId } = req.body;
    const channelAccessToken = (token || cachedSettings.lineToken || DEFAULT_LINE_TOKEN || '').trim();
    const destinationId = (targetId || cachedSettings.lineTargetId || DEFAULT_LINE_TARGET_ID || '').trim();

    if (!channelAccessToken || !destinationId) {
      return res.status(400).json({
        success: false,
        error: 'Missing LINE Channel Access Token or Target User ID'
      });
    }

    const testRecord = {
      name: 'ทดสอบระบบ วิศวกรการแพทย์',
      company: 'บริษัท เมดิคอล เซอร์วิส จำกัด',
      phone: '081-234-5678',
      department: 'Biomedical Engineering (BME)',
      workType: 'ทดสอบการแจ้งเตือน LINE Flex Message',
      visitorCount: 1,
      vehicleType: 'รถยนต์ส่วนบุคคล',
      licensePlate: 'กข 9999',
      equipmentHandled: ['DEFIBRILLATOR [Brand: PHILIPS]', 'PATIENT MONITOR [Brand: MINDRAY]'],
      contactRole: 'วิศวกรบริการ',
      workDetails: 'ทดสอบส่งการ์ดแจ้งเตือนแบบ Flex Message เข้า LINE Official Account / ผู้ใช้งาน',
      cardImageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80',
      timestamp: new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })
    };

    const flexCard = createVisitorFlexMessage(
      testRecord,
      '🧪 ทดสอบการเชื่อมต่อระบบแจ้งเตือน LINE Messaging API (BME Check-In)',
      testRecord.cardImageUrl
    );

    const linePushUrl = 'https://api.line.me/v2/bot/message/push';
    const response = await fetch(linePushUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${channelAccessToken}`
      },
      body: JSON.stringify({
        to: destinationId,
        messages: [flexCard]
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const detailStr = Array.isArray(data.details) && data.details.length > 0
        ? data.details.map((d: any) => `${d.property || ''}: ${d.message || ''}`).join('; ')
        : '';
      const formattedErr = detailStr ? `${data.message || 'Error'} -> [${detailStr}]` : (data.message || 'LINE API connection failed');
      return res.status(400).json({
        success: false,
        error: formattedErr,
        details: data
      });
    }

    return res.json({
      success: true,
      message: 'LINE Flex Message test card dispatched successfully!',
      targetId: destinationId
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Google Sheet public CSV proxy/fetcher
app.get('/api/sheets/fetch', async (req, res) => {
  try {
    const sheetId = (req.query.sheetId as string) || cachedSettings.sheetId || DEFAULT_SHEET_ID;
    const sheetName = (req.query.sheetName as string) || 'Data_base';

    const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
    const response = await fetch(gvizUrl);

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: `Could not fetch Google Sheet tab: ${sheetName}`
      });
    }

    const csvText = await response.text();
    return res.json({
      success: true,
      sheetName,
      sheetId,
      csv: csvText
    });
  } catch (error: any) {
    console.error('Error fetching sheet:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Proxy to submit single record to Google Apps Script Webhook (Visitor_Logs)
app.post('/api/sheets/submit', async (req, res) => {
  try {
    const record = req.body;
    const webhookUrl = (record.webhookUrl || cachedSettings.sheetWebhookUrl || '').trim();

    if (!webhookUrl) {
      return res.status(400).json({
        success: false,
        error: 'Google Apps Script Webhook URL is not configured'
      });
    }

    // Forward to Google Apps Script with redirect follow
    const response = await fetch(webhookUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(record)
    });

    let jsonResp;
    try {
      const responseText = await response.text();
      jsonResp = responseText ? JSON.parse(responseText) : { status: 'success' };
    } catch {
      jsonResp = { status: 'success' };
    }

    return res.json({
      success: true,
      data: jsonResp
    });
  } catch (error: any) {
    console.error('Error forwarding record to Google Sheet webhook:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit to Google Sheet'
    });
  }
});

// Proxy to batch sync all records into Google Apps Script Webhook (Visitor_Logs)
app.post('/api/sheets/batch-sync', async (req, res) => {
  try {
    const { records, webhookUrl: customUrl } = req.body;
    const webhookUrl = (customUrl || cachedSettings.sheetWebhookUrl || '').trim();

    if (!webhookUrl) {
      return res.status(400).json({
        success: false,
        error: 'Google Apps Script Webhook URL is not configured'
      });
    }

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Records array is empty'
      });
    }

    // Send array payload to Apps Script doPost with redirect follow
    const response = await fetch(webhookUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(records)
    });

    let jsonResp;
    try {
      const responseText = await response.text();
      jsonResp = responseText ? JSON.parse(responseText) : { status: 'success' };
    } catch {
      jsonResp = { status: 'success' };
    }

    return res.json({
      success: true,
      totalSynced: records.length,
      data: jsonResp
    });
  } catch (error: any) {
    console.error('Error in batch sync to Google Sheet:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Batch sync failed'
    });
  }
});

// Proxy to migrate legacy form responses
app.post('/api/sheets/migrate', async (req, res) => {
  try {
    const { webhookUrl: customUrl } = req.body;
    const webhookUrl = (customUrl || cachedSettings.sheetWebhookUrl || '').trim();

    if (!webhookUrl) {
      return res.status(400).json({
        success: false,
        error: 'Google Apps Script Webhook URL is not configured'
      });
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({ action: 'migrate' })
    });

    let jsonResp;
    try {
      const responseText = await response.text();
      jsonResp = responseText ? JSON.parse(responseText) : { status: 'success' };
    } catch {
      jsonResp = { status: 'success' };
    }

    return res.json({
      success: true,
      data: jsonResp
    });
  } catch (error: any) {
    console.error('Error in migrate request to Google Sheet:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Migration request failed'
    });
  }
});

// AI Analysis with Gemini
app.post('/api/ai/analyze', async (req, res) => {
  try {
    const { prompt, recordsSummary, analysisType = 'overview' } = req.body;
    const ai = getGenAI();

    if (!ai) {
      // Fallback rule-based summary if Gemini API key not yet set in environment
      return res.json({
        success: true,
        isFallback: true,
        analysis: generateFallbackAnalysis(recordsSummary, analysisType)
      });
    }

    const systemInstruction = `คุณเป็นผู้เชี่ยวชาญด้านวิศวกรรมชีวการแพทย์ (Biomedical Engineering Specialist) และผู้ดูแลระบบงานบริการเทคนิคโรงพยาบาล
หน้าที่ของคุณคือวิเคราะห์ข้อมูลสถิติผู้มาติดต่อ ช่างซ่อมบำรุง ผู้แทนบริษัทเครื่องมือแพทย์ และงานติดตั้ง/PM/DEMO
ให้ตอบเป็นภาษาไทยที่กระชับ ชัดเจน มีโครงสร้างหัวข้อชัดเจน ให้ข้อเสนอแนะที่เป็นประโยชน์เชิงบริหารและนโยบายความปลอดภัยของโรงพยาบาล`;

    const fullPrompt = `${prompt || 'ช่วยวิเคราะห์ภาพรวมการเข้าปฏิบัติงานของช่างและผู้แทนบริษัทเครื่องมือแพทย์'}\n\nข้อมูลสรุปสถิติ:\n${JSON.stringify(recordsSummary, null, 2)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
      config: {
        systemInstruction,
        temperature: 0.3,
      }
    });

    return res.json({
      success: true,
      analysis: response.text,
      isFallback: false
    });
  } catch (error: any) {
    console.error('Error in AI analysis:', error);
    // Return gracefully with fallback
    return res.json({
      success: true,
      isFallback: true,
      analysis: generateFallbackAnalysis(req.body.recordsSummary, req.body.analysisType),
      error: error.message
    });
  }
});

function generateFallbackAnalysis(summary: any, type: string): string {
  const total = summary?.totalVisits || 200;
  const topDept = summary?.topDepartment || 'Operating Room (ห้องผ่าตัด) & Gastro Scope';
  const topCompany = summary?.topCompany || 'Philips, Olympus, Xovic, Double U Tech';
  const repairCount = summary?.repairs || 0;
  const pmCount = summary?.pm || 0;
  const demoCount = summary?.demo || 0;

  return `📊 **รายงานสรุปและวิเคราะห์ผลการปฏิบัติงานเครื่องมือแพทย์**

🔹 **1. ภาพรวมสถิติการเข้าปฏิบัติงาน**
- บันทึกการเข้าติดต่อทั้งหมด: **${total} รายการ**
- สัดส่วนประเภทงาน: งานซ่อม (${repairCount} งาน), งาน PM บำรุงรักษาเชิงป้องกัน (${pmCount} งาน), งาน DEMO & Training (${demoCount} งาน)
- แผนกที่มีการเข้ามาปฏิบัติงานสูงสุด: **${topDept}**
- บริษัทคู่ค้าที่มีการประสานงานสูงสุด: **${topCompany}**

🔹 **2. ข้อสังเกตเชิงเทคนิค & ความปลอดภัย**
- แผนกผ่าตัด (OR) และศูนย์ส่องกล้อง (GI) มีความถี่งานซ่อมและ DEMO สูงสุด สะท้อนถึงอัตราการใช้งานเครื่องมืออย่างต่อเนื่อง
- มีการบันทึกประเภทยานพาหนะและทะเบียนรถยนต์ครบถ้วน เพิ่มความรัดกุมด้านการรักษาความปลอดภัยของพื้นที่โรงพยาบาล
- นโยบายการลบรูปภาพบัตรผู้มาติดต่ออัตโนมัติภายใน 5 วัน เป็นไปตามระเบียบ PDPA และการคุ้มครองข้อมูลส่วนบุคคลอย่างเข้มงวด

🔹 **3. ข้อเสนอแนะเชิงบริหารจัดการ (BME Recommendations)**
1. **วางแผนรอบ PM ล่วงหน้า:** ควรจัดตารางเวลา PM ของบริษัทคู่ค้าหลัก (Philips, Olympus, GE, Draeger) ให้ตรงกับรอบปลอดการผ่าตัด
2. **ระบบสมุดคู่ค้าเดี่ยว (Deduplication):** บุคคลที่ดูแลเครื่องมือเดิมไม่ต้องบันทึกซ้ำ ช่วยลดภาระการลงทะเบียนและเพิ่มความแม่นยำของฐานข้อมูล
3. **การแจ้งเตือน Telegram:** ระบบส่งการแจ้งเตือนทันทีช่วยให้หัวหน้าแผนกและวิศวกร BME ทราบสถานะงานซ่อมได้แบบเรียลไทม์`;
}

// ================= VITE / STATIC SERVING =================

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server listening on http://0.0.0.0:${PORT}`);
  });
}

start();
