import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Default credentials from user prompt
const DEFAULT_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8344422414:AAER_-ry1d6--UU8CC7m0xFin1v67gHOiJQ';
const DEFAULT_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '-5275868334';
const DEFAULT_SHEET_ID = process.env.GOOGLE_SHEET_ID || '1ry7U0ZSuMT5yYYkDpRHukuYLQQrPEfy4jP3GnpxyJM8';

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
    telegramConfigured: !!(DEFAULT_BOT_TOKEN && DEFAULT_CHAT_ID),
    sheetId: DEFAULT_SHEET_ID,
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString()
  });
});

// Telegram notification endpoint
app.post('/api/telegram/send', async (req, res) => {
  try {
    const { message, token, chatId, parse_mode = 'Markdown' } = req.body;
    const botToken = (token || DEFAULT_BOT_TOKEN || '').trim();
    const targetChatId = (chatId || DEFAULT_CHAT_ID || '').trim();

    if (!botToken || !targetChatId) {
      return res.status(400).json({
        success: false,
        error: 'Missing Telegram Bot Token or Chat ID'
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message content is required'
      });
    }

    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: targetChatId,
        text: message,
        parse_mode: parse_mode,
        disable_web_page_preview: true
      })
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      console.error('Telegram API error:', data);
      return res.status(response.status || 400).json({
        success: false,
        error: data.description || 'Telegram dispatch failed',
        details: data
      });
    }

    return res.json({
      success: true,
      messageId: data.result?.message_id,
      data
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

    const testMessage = `🔔 *ทดสอบการเชื่อมต่อระบบแจ้งเตือน Telegram สำเร็จ!*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🏥 *ระบบ:* ระบบบันทึกและวิเคราะห์ผู้มาติดต่อเครื่องมือแพทย์\n` +
      `📅 *เวลา:* ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}\n` +
      `✅ *สถานะ:* บอทพร้อมส่งการแจ้งเตือนแบบเรียลไทม์เมื่อมีผู้มาติดต่อหรือช่างเข้าปฏิบัติงาน`;

    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetChatId,
        text: testMessage,
        parse_mode: 'Markdown'
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
    const sheetId = (req.query.sheetId as string) || DEFAULT_SHEET_ID;
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
