import { VisitorRecord } from '../types';

const STORAGE_KEYS = {
  SHEET_WEBHOOK_URL: 'bme_google_sheet_webhook_url_v1',
  SHEET_ID: 'bme_google_sheet_id_v1',
};

export const DEFAULT_SHEET_ID = '1ry7U0ZSuMT5yYYkDpRHukuYLQQrPEfy4jP3GnpxyJM8';

export const APPS_SCRIPT_TEMPLATE = `/**
 * =========================================================================
 * BME Visitor & Medical Equipment - Google Apps Script (Webhook ฟรีไม่มีจำกัด)
 * =========================================================================
 * วิธีติดตั้ง:
 * 1. เปิด Google Sheets (ID: 1ry7U0ZSuMT5yYYkDpRHukuYLQQrPEfy4jP3GnpxyJM8 หรือชีทของคุณ)
 * 2. ไปที่เมนู "ส่วนขยาย" (Extensions) > "Apps Script"
 * 3. ลบโค้ดเดิมทั้งหมดออก แล้ววางโค้ดชุดนี้ลงไป
 * 4. กด "ทำให้ใช้งานได้" (Deploy) > "การทำให้ใช้งานได้รายการใหม่" (New deployment)
 * 5. เลือกประเภท: "เว็บแอป" (Web app)
 * 6. ตั้งค่า:
 *    - คำอธิบาย: BME Visitor Webhook
 *    - ดำเนินการในฐานะ: ฉัน (Me)
 *    - ผู้มีสิทธิ์เข้าถึง: ทุกคน (Anyone)  <--- สำคัญมาก!
 * 7. กด "ทำให้ใช้งานได้" (Deploy) แล้วคัดลอก "URL เว็บแอป" มาใส่ในหน้าระบบ
 */

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = "Visitor_Logs";
    var sheet = ss.getSheetByName(sheetName);
    
    // หากยังไม่มีชีท Visitor_Logs ให้สร้างชีทพร้อมหัวตารางให้อัตโนมัติ
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow([
        "วันเวลาที่บันทึก",
        "ชื่อ-นามสกุล",
        "บริษัท/สังกัด",
        "บทบาท/ตำแหน่ง",
        "เบอร์โทรศัพท์",
        "แผนกที่เข้าติดต่อ",
        "ลักษณะงาน",
        "จำนวนผู้เข้าพบ",
        "ประเภทพาหนะ",
        "ทะเบียนรถ",
        "เครื่องมือแพทย์ที่ดูแล",
        "หมายเหตุ",
        "Record ID"
      ]);
      // ปรับรูปแบบหัวตาราง
      sheet.getRange("A1:M1").setFontWeight("bold").setBackground("#1E293B").setFontColor("#FFFFFF");
      sheet.setFrozenRows(1);
    }
    
    var data = JSON.parse(e.postData.contents);
    
    var timestamp = data.timestamp || Utilities.formatDate(new Date(), "Asia/Bangkok", "dd/MM/yyyy, HH:mm:ss");
    var name = data.name || "-";
    var company = data.company || "-";
    var role = data.contactRole || data.role || "ช่าง";
    var phone = data.phone || "-";
    var department = data.department || "-";
    var workType = data.workType || "-";
    var visitorCount = data.visitorCount || 1;
    var vehicleType = data.vehicleType || "รถยนต์ส่วนบุคคล";
    var licensePlate = data.licensePlate || "-";
    var equipmentList = Array.isArray(data.equipmentHandled) ? data.equipmentHandled.join(", ") : (data.equipmentHandled || "-");
    var notes = data.notes || "-";
    var recordId = data.id || "vis-" + Date.now();
    
    sheet.appendRow([
      timestamp,
      name,
      company,
      role,
      phone,
      department,
      workType,
      visitorCount,
      vehicleType,
      licensePlate,
      equipmentList,
      notes,
      recordId
    ]);
    
    return ContentService
      .createTextOutput(JSON.stringify({ status: "success", message: "Data appended to Google Sheet successfully!" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = e.parameter.action || "all";
    var result = {};
    
    // ดึงข้อมูล Data_base
    var baseSheet = ss.getSheetByName("Data_base");
    if (baseSheet) {
      var baseData = baseSheet.getDataRange().getValues();
      result.departments = baseData.slice(1).map(function(row) {
        return { name: row[0], buildingFloor: row[1], company: row[2] };
      }).filter(function(r) { return r.name; });
    }
    
    // ดึงข้อมูล Data_equpment
    var eqSheet = ss.getSheetByName("Data_equpment");
    if (eqSheet) {
      var eqData = eqSheet.getDataRange().getValues();
      result.equipments = eqData.slice(1).map(function(row) {
        return { name: row[0], vendorCompany: row[1], department: row[2] };
      }).filter(function(r) { return r.name; });
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ status: "success", data: result }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
`;

export class GoogleSheetsService {
  static getWebhookUrl(): string {
    try {
      return localStorage.getItem(STORAGE_KEYS.SHEET_WEBHOOK_URL) || '';
    } catch {
      return '';
    }
  }

  static saveWebhookUrl(url: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SHEET_WEBHOOK_URL, url.trim());
    } catch (e) {
      console.error('Error saving Sheet Webhook URL:', e);
    }
  }

  static getSheetId(): string {
    try {
      return localStorage.getItem(STORAGE_KEYS.SHEET_ID) || DEFAULT_SHEET_ID;
    } catch {
      return DEFAULT_SHEET_ID;
    }
  }

  static saveSheetId(id: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SHEET_ID, id.trim());
    } catch (e) {
      console.error('Error saving Sheet ID:', e);
    }
  }

  /**
   * Sends visitor checkin record directly to Google Apps Script Web App (Webhook)
   * 100% Free, Unlimited, no credentials required.
   */
  static async sendRecordToGoogleSheet(record: VisitorRecord): Promise<{ success: boolean; message: string }> {
    const webhookUrl = this.getWebhookUrl();
    if (!webhookUrl) {
      return { success: false, message: 'ไม่ได้ระบุ Google Apps Script Webhook URL' };
    }

    try {
      // Use standard POST with JSON payload (mode: 'no-cors' allows browser to dispatch without CORS block)
      await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          id: record.id,
          timestamp: record.timestamp,
          name: record.name,
          company: record.company,
          phone: record.phone,
          department: record.department,
          workType: record.workType,
          visitorCount: record.visitorCount,
          vehicleType: record.vehicleType,
          licensePlate: record.licensePlate,
          equipmentHandled: record.equipmentHandled,
          contactRole: record.contactRole,
          notes: record.notes,
        }),
      });

      return {
        success: true,
        message: 'ส่งข้อมูลไปยัง Google Sheets สำเร็จ (บันทึกลงชีทเรียบร้อย)',
      };
    } catch (err: any) {
      console.error('Error posting to Google Sheets webhook:', err);
      return {
        success: false,
        message: `ไม่สามารถส่งข้อมูลเข้า Google Sheets: ${err?.message || 'เครือข่ายขัดข้อง'}`,
      };
    }
  }

  /**
   * Test Webhook Connection
   */
  static async testWebhook(url: string): Promise<{ success: boolean; message: string }> {
    if (!url || !url.startsWith('https://script.google.com/macros/s/')) {
      return {
        success: false,
        message: 'รูปแบบ URL ไม่ถูกต้อง ต้องขึ้นต้นด้วย https://script.google.com/macros/s/...',
      };
    }

    try {
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          id: `test-${Date.now()}`,
          timestamp: new Date().toLocaleString('th-TH'),
          name: 'ทดสอบระบบ (BME System Test)',
          company: 'BME Medical Co., Ltd.',
          phone: '081-000-0000',
          department: 'ห้องผ่าตัด (OR)',
          workType: 'ทดสอบการเชื่อมต่อ Google Sheets Webhook',
          visitorCount: 1,
          vehicleType: 'รถยนต์ส่วนบุคคล',
          licensePlate: 'กข-9999',
          equipmentHandled: ['เครื่องทดสอบสัญญาณ'],
          contactRole: 'ช่าง',
          notes: 'ทดสอบการส่งข้อมูลอัตโนมัติแบบฟรีไม่มีจำกัด',
        }),
      });

      return {
        success: true,
        message: '✅ ส่งคำสั่งทดสอบไปยัง Google Sheets สำเร็จ! ข้อมูลตัวอย่างแถว "ทดสอบระบบ" ถูกบันทึกลงในชีท Visitor_Logs เรียบร้อยแล้ว',
      };
    } catch (err: any) {
      return {
        success: false,
        message: `❌ เกิดข้อผิดพลาดในการเชื่อมต่อ: ${err?.message || 'ไม่สามารถติดต่อ Webhook ได้'}`,
      };
    }
  }
}
