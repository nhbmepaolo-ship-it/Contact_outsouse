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

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Default credentials from user prompt
const DEFAULT_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8344422414:AAER_-ry1d6--UU8CC7m0xFin1v67gHOiJQ';
const DEFAULT_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '-5275868334';
const DEFAULT_SHEET_ID = process.env.GOOGLE_SHEET_ID || '1ry7U0ZSuMT5yYYkDpRHukuYLQQrPEfy4jP3GnpxyJM8';
const DEFAULT_SHEET_WEBHOOK_URL = process.env.GOOGLE_SHEET_WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycbwhVd6WgGXlJYk_u8LGNuVoRXwdANYy980C7edxKtVOnPSoFlrOAxdQgASuoLg-hbiW/exec';

// ================= PERSISTENT SETTINGS STORAGE =================
const DATA_DIR = path.join(process.cwd(), 'data_store');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

interface ServerSettings {
  telegramToken: string;
  telegramChatId: string;
  sheetId: string;
  sheetWebhookUrl: string;
  lastUpdated?: string;
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

app.post('/api/settings', (req, res) => {
  try {
    const { telegramToken, telegramChatId, sheetId, sheetWebhookUrl } = req.body;
    const updated = saveServerSettings({
      ...(telegramToken !== undefined && { telegramToken: String(telegramToken).trim() }),
      ...(telegramChatId !== undefined && { telegramChatId: String(telegramChatId).trim() }),
      ...(sheetId !== undefined && { sheetId: String(sheetId).trim() }),
      ...(sheetWebhookUrl !== undefined && { sheetWebhookUrl: String(sheetWebhookUrl).trim() }),
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

    // Forward to Google Apps Script
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(record)
    });

    const responseText = await response.text();
    let jsonResp;
    try {
      jsonResp = JSON.parse(responseText);
    } catch {
      jsonResp = { status: 'success', text: responseText };
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

    // Send array payload to Apps Script doPost
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(records)
    });

    const responseText = await response.text();
    let jsonResp;
    try {
      jsonResp = JSON.parse(responseText);
    } catch {
      jsonResp = { status: 'success', text: responseText };
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
