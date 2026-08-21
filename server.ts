import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy initialization or shared instance for Gemini
const getGeminiAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Auto-fill CPI content endpoint using Gemini AI
app.post('/api/gemini/autofill', async (req, res) => {
  try {
    const { topic, department, section = 'all', currentValues } = req.body;

    if (!topic && !department) {
      return res.status(400).json({ error: 'Please provide a topic or department name.' });
    }

    const ai = getGeminiAI();

    const systemInstruction = `คุณเป็นผู้เชี่ยวชาญด้านระบบพัฒนาคุณภาพงานโรงพยาบาล (HA / JCI / CPI - Continuous Performance Improvement) ของโรงพยาบาลพญาไท
มีหน้าที่ช่วยร่างและเรียบเรียงข้อมูลลงใน "แบบบันทึกกิจกรรมพัฒนาผลสัมฤทธิ์ของงาน (CPI)" (รหัสเอกสาร PTP-FM-QMS-001) ภาษาไทยที่เป็นทางการ ครบถ้วน กระชับ และได้มาตรฐานทางการแพทย์

จงสร้างข้อมูลสำหรับแบบฟอร์ม CPI โดยอ้างอิงหัวข้อ: "${topic || 'ปรับปรุงคุณภาพงาน'}" ฝ่าย/แผนก: "${department || 'แผนกผู้ป่วยนอก'}"

ให้ส่งคืนเป็น JSON object ตรงตามโครงสร้างที่กำหนดเท่านั้น:
- projectTitle: ชื่อโครงการ CPI ที่สอดคล้อง
- projectType: อาร์เรย์ของประเภทโครงการ เช่น ["PIP"] หรือ ["IA", "PIP"] (เลือกจาก "IA", "PIP", "BIP")
- developmentType: อาร์เรย์ของประเภทการพัฒนา เช่น ["service_process"] หรือ ["clinical"] (เลือกจาก "clinical", "service_process", "mini_research")
- problemStatement: สถานการณ์ปัญหา/โอกาสพัฒนา (ระบุปัญหา ผลกระทบต่อการดูแลผู้ป่วย/งาน และสาเหตุสำคัญ)
- goal: เป้าหมายที่วัดผลได้ชัดเจน
- kpiAndTarget: ตัวชี้วัด (KPI) และ Target (เป็นข้อๆ)
- improvementSteps: ขั้นตอนการปรับปรุง/เปลี่ยนแปลงกระบวนการ (เขียนเป็นข้อๆ Bullet • ชัดเจน)
- expectedBenefits: ประโยชน์ที่คาดว่าจะได้รับ (1. 2. 3.)
- budget: งบประมาณ (ถ้ามี เช่น "ไม่มี (0 บาท)" หรือ "12,000 บาท")
- resultsKPI: 1.1 ผลลัพธ์ KPI (การวัดผลว่าบรรลุตามเป้าหมายอย่างไร)
- resultsOther: 1.2 ผลลัพธ์อื่นๆ
- obstaclesDataCollection: ปัญหาอุปสรรคการเก็บรวบรวมข้อมูล
- obstaclesKPICollection: ปัญหาอุปสรรคการเก็บตัวชี้วัด
- obstaclesFindingSolutions: ปัญหาอุปสรรคการหาแนวทางแก้ไข
- recommendationsExpansion: ข้อเสนอแนะ / การขยายผลโครงการ`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `กรุณาสร้างข้อมูล CPI สำหรับหัวข้อ: ${topic} ฝ่าย/แผนก: ${department}`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            projectTitle: { type: Type.STRING },
            projectType: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            developmentType: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            problemStatement: { type: Type.STRING },
            goal: { type: Type.STRING },
            kpiAndTarget: { type: Type.STRING },
            improvementSteps: { type: Type.STRING },
            expectedBenefits: { type: Type.STRING },
            budget: { type: Type.STRING },
            resultsKPI: { type: Type.STRING },
            resultsOther: { type: Type.STRING },
            obstaclesDataCollection: { type: Type.STRING },
            obstaclesKPICollection: { type: Type.STRING },
            obstaclesFindingSolutions: { type: Type.STRING },
            recommendationsExpansion: { type: Type.STRING },
          },
          required: [
            'projectTitle',
            'problemStatement',
            'goal',
            'kpiAndTarget',
            'improvementSteps',
            'expectedBenefits',
          ],
        },
      },
    });

    const generatedText = response.text;
    if (!generatedText) {
      throw new Error('Gemini did not return text response.');
    }

    const data = JSON.parse(generatedText);
    return res.json({ success: true, data });
  } catch (err: any) {
    console.error('Gemini Autofill Error:', err);
    return res.status(500).json({
      error: 'เกิดข้อผิดพลาดในการสร้างข้อมูลด้วย AI',
      details: err.message || 'Unknown error',
    });
  }
});

// Endpoint for sending CPI Form by Email
app.post('/api/send-email', async (req, res) => {
  try {
    const { toEmail, subject, message, docNo, projectTitle, department, proposerName, pdfBase64, approvalUrl } = req.body;

    if (!toEmail) {
      return res.status(400).json({ error: 'กรุณาระบุอีเมลผู้รับ (To Email)' });
    }

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT || 587);
    const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
    const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

    if (smtpHost && smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const attachments: any[] = [];
      if (pdfBase64) {
        attachments.push({
          filename: `CPI_Phyathai_${docNo || 'Document'}.pdf`,
          content: Buffer.from(pdfBase64, 'base64'),
          contentType: 'application/pdf',
        });
      }

      const mailOptions: any = {
        from: `Phyathai CPI System <${smtpUser}>`,
        to: toEmail,
        subject: subject || `[นำส่งเอกสาร CPI] ${docNo || ''} - ${projectTitle || ''}`,
        text: message || `นำส่งแบบฟอร์ม CPI ${docNo}`,
        html: `
          <div style="font-family: 'Sarabun', sans-serif, system-ui; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
            <div style="background-color: #0f172a; color: #ffffff; padding: 20px; text-align: center;">
              <h2 style="margin: 0; font-size: 18px; color: #2dd4bf;">โรงพยาบาลพญาไท - แบบฟอร์ม CPI</h2>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">เอกสารนำส่งอนุมัติโครงการพัฒนาคุณภาพ (PTP-FM-QMS-001)</p>
            </div>
            
            <div style="padding: 24px;">
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                <p style="margin: 0 0 6px 0; font-size: 13px;"><strong>เลขที่เอกสาร:</strong> <span style="color: #0284c7;">${docNo || '-'}</span></p>
                <p style="margin: 0 0 6px 0; font-size: 13px;"><strong>ชื่อโครงการ:</strong> ${projectTitle || '-'}</p>
                <p style="margin: 0 0 6px 0; font-size: 13px;"><strong>ฝ่าย/แผนก:</strong> ${department || '-'}</p>
                <p style="margin: 0; font-size: 13px;"><strong>ผู้เสนอโครงการ:</strong> ${proposerName || '-'}</p>
              </div>

              <div style="margin-bottom: 24px; white-space: pre-wrap; font-size: 14px; color: #334155; line-height: 1.7;">
                ${(message || '').replace(/\n/g, '<br/>')}
              </div>

              ${
                approvalUrl
                  ? `
                <div style="text-align: center; margin: 28px 0; padding: 20px; background-color: #f0fdf4; border: 1px dashed #22c55e; border-radius: 12px;">
                  <p style="margin: 0 0 12px 0; font-size: 13px; font-weight: bold; color: #15803d;">
                    ✍️ ลิงก์สำหรับตรวจสอบและลงนามอนุมัติออนไลน์แบบคลิกเดียว (1-Click Approval)
                  </p>
                  <a href="${approvalUrl}" target="_blank" style="display: inline-block; background-color: #0d9488; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 14px; shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    คลิกเพื่อเปิดเอกสารและลงนามอนุมัติ →
                  </a>
                </div>
              `
                  : ''
              }

              ${
                pdfBase64
                  ? `<p style="font-size: 12px; color: #166534; background-color: #f0fdf4; padding: 8px 12px; border-radius: 6px; border: 1px solid #bbf7d0;">📎 ไฟล์เอกสาร CPI PDF ต้นฉบับถูกแนบมาด้วยในอีเมลนี้เรียบร้อยแล้ว</p>`
                  : ''
              }
            </div>

            <div style="background-color: #f1f5f9; padding: 12px 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
              ระบบ Phyathai CPI Online Form (PTP-FM-QMS-001) | โรงพยาบาลพญาไท
            </div>
          </div>
        `,
        attachments,
      };

      await transporter.sendMail(mailOptions);
      console.log(`[SMTP Email Sent] Successfully sent email to ${toEmail} with ${attachments.length} attachment(s)`);

      return res.json({
        success: true,
        smtpUsed: true,
        message: `ส่งอีเมลนำส่งเอกสาร CPI (${docNo}) พร้อมแนบไฟล์ PDF ไปยัง ${toEmail} เรียบร้อยแล้ว`,
      });
    }

    console.log(`[Email Request] CPI Form ${docNo} requested for ${toEmail}`);

    return res.json({
      success: true,
      smtpUsed: false,
      message: `บันทึกคำขอนำส่งเอกสารไปยัง ${toEmail} เรียบร้อยแล้ว (คุณสามารถเปิดส่งใน Gmail/Outlook หรือคัดลอก 1-Click Approval Link เพื่อนำส่งได้ทันที)`,
    });
  } catch (err: any) {
    console.error('Send Email Error:', err);
    return res.status(500).json({ error: 'ไม่สามารถส่งอีเมลได้', details: err.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Phyathai CPI Application running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
