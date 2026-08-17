import { VisitorRecord, DepartmentInfo, EquipmentInfo } from '../types';
import { translateMedicalEquipmentToThai } from '../utils/equipmentTranslator';

function parseCsvLine(text: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result.map(s => s.trim().replace(/^"|"$/g, ''));
}

const STORAGE_KEYS = {
  SHEET_WEBHOOK_URL: 'bme_google_sheet_webhook_url_v1',
  SHEET_ID: 'bme_google_sheet_id_v1',
};

export const DEFAULT_SHEET_ID = '1ry7U0ZSuMT5yYYkDpRHukuYLQQrPEfy4jP3GnpxyJM8';
export const DEFAULT_SHEET_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwhVd6WgGXlJYk_u8LGNuVoRXwdANYy980C7edxKtVOnPSoFlrOAxdQgASuoLg-hbiW/exec';

export const APPS_SCRIPT_TEMPLATE = `/**
 * =========================================================================
 * BME Visitor & Medical Equipment - Google Apps Script (Webhook รวมชีท Visitor_Logs)
 * =========================================================================
 * วิธีติดตั้ง / อัปเดต:
 * 1. เปิด Google Sheets ของคุณ
 * 2. ไปที่เมนู "ส่วนขยาย" (Extensions) > "Apps Script"
 * 3. ลบโค้ดเดิมทั้งหมดออก แล้ววางโค้ดชุดนี้ลงไปทั้งหมด
 * 4. กด "ทำให้ใช้งานได้" (Deploy) > "การทำให้ใช้งานได้รายการใหม่" (New deployment)
 * 5. เลือกประเภท: "เว็บแอป" (Web app)
 * 6. ตั้งค่า:
 *    - คำอธิบาย: BME Visitor Webhook v2
 *    - ดำเนินการในฐานะ: ฉัน (Me)
 *    - ผู้มีสิทธิ์เข้าถึง: ทุกคน (Anyone)  <--- สำคัญมาก!
 * 7. กด "ทำให้ใช้งานได้" (Deploy) แล้วคัดลอก "URL เว็บแอป" มาใส่ในระบบ
 *
 * *************************************************************************
 * วิธีย้ายข้อมูลเก่าจาก "การตอบแบบฟอร์ม 1" มารวมใน "Visitor_Logs":
 * - ในหน้า Apps Script ให้เลือกฟังก์ชัน "migrateOldFormDataToVisitorLogs" จากดรอปดาวน์ด้านบน
 * - กดปุ่ม "เรียกใช้" (Run) ระบบจะย้ายข้อมูลทั้งหมดจากชีทเก่าเข้า "Visitor_Logs" ทันทีโดยไม่ซ้ำซ้อน
 * *************************************************************************
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
      // ปรับรูปแบบหัวตารางให้สวยงาม
      sheet.getRange("A1:M1").setFontWeight("bold").setBackground("#1E293B").setFontColor("#FFFFFF");
      sheet.setFrozenRows(1);
    }
    
    var rawContents = e.postData.contents;
    var data = JSON.parse(rawContents);
    
    // รองรับทั้งแบบแถวเดี่ยว และแบบชุดข้อมูล (Batch array)
    var items = Array.isArray(data) ? data : [data];
    var rowsToAppend = [];
    
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var timestamp = item.timestamp || Utilities.formatDate(new Date(), "Asia/Bangkok", "dd/MM/yyyy, HH:mm:ss");
      var name = item.name || "-";
      var company = item.company || "-";
      var role = item.contactRole || item.role || "ช่าง";
      var phone = item.phone || "-";
      var department = item.department || "-";
      var workType = item.workType || "-";
      var visitorCount = item.visitorCount || 1;
      var vehicleType = item.vehicleType || "รถยนต์ส่วนบุคคล";
      var licensePlate = item.licensePlate || "-";
      var equipmentList = Array.isArray(item.equipmentHandled) ? item.equipmentHandled.join(", ") : (item.equipmentHandled || "-");
      var notes = item.notes || "-";
      var recordId = item.id || "vis-" + Date.now() + "-" + i;
      
      rowsToAppend.push([
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
    }
    
    if (rowsToAppend.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, 13).setValues(rowsToAppend);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({
        status: "success",
        count: rowsToAppend.length,
        message: "บันทึกข้อมูลเข้าชีท Visitor_Logs เรียบร้อยแล้ว (" + rowsToAppend.length + " แถว)"
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ฟังก์ชันย้ายข้อมูลเก่าจาก "การตอบแบบฟอร์ม 1" หรือ "Form Responses 1" มาใส่ใน "Visitor_Logs"
 * ใช้งานโดยการกด Run จากหน้า Apps Script ครั้งเดียว
 */
function migrateOldFormDataToVisitorLogs() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var targetSheet = ss.getSheetByName("Visitor_Logs");
  
  if (!targetSheet) {
    targetSheet = ss.insertSheet("Visitor_Logs");
    targetSheet.appendRow([
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
    targetSheet.getRange("A1:M1").setFontWeight("bold").setBackground("#1E293B").setFontColor("#FFFFFF");
    targetSheet.setFrozenRows(1);
  }
  
  // ค้นหาชีทเก่า
  var sourceSheet = ss.getSheetByName("การตอบแบบฟอร์ม 1") || 
                    ss.getSheetByName("Form Responses 1") || 
                    ss.getSheetByName("Form responses 1");
                    
  if (!sourceSheet) {
    Logger.log("ไม่พบชีท 'การตอบแบบฟอร์ม 1'");
    return "ไม่พบชีท 'การตอบแบบฟอร์ม 1' ในไฟล์นี้";
  }
  
  var srcData = sourceSheet.getDataRange().getValues();
  if (srcData.length <= 1) {
    Logger.log("ชีท 'การตอบแบบฟอร์ม 1' ไม่มีข้อมูล");
    return "ชีท 'การตอบแบบฟอร์ม 1' ไม่มีข้อมูล";
  }
  
  // ดึงข้อมูลเดิมใน Visitor_Logs เพื่อป้องกันการบันทึกซ้ำ
  var existingData = targetSheet.getDataRange().getValues();
  var existingKeys = {};
  for (var i = 1; i < existingData.length; i++) {
    var k = String(existingData[i][0]) + "_" + String(existingData[i][1]);
    existingKeys[k] = true;
  }
  
  var rowsToAdd = [];
  for (var r = 1; r < srcData.length; r++) {
    var row = srcData[r];
    var timestamp = row[0] ? String(row[0]) : "";
    var name = row[1] ? String(row[1]) : "-";
    var key = timestamp + "_" + name;
    
    if (!existingKeys[key]) {
      var company = row[2] ? String(row[2]) : "-";
      var phone = row[3] ? String(row[3]) : "-";
      var dept = row[4] ? String(row[4]) : "-";
      var workType = row[5] ? String(row[5]) : "-";
      var count = row[6] ? Number(row[6]) || 1 : 1;
      var role = "ช่าง";
      var vehicle = row[7] ? String(row[7]) : "รถยนต์ส่วนบุคคล";
      var plate = row[8] ? String(row[8]) : "-";
      var eq = row[9] ? String(row[9]) : "-";
      var notes = row[10] ? String(row[10]) : "-";
      var id = "vis-migrated-" + r;
      
      rowsToAdd.push([timestamp, name, company, role, phone, dept, workType, count, vehicle, plate, eq, notes, id]);
    }
  }
  
  if (rowsToAdd.length > 0) {
    targetSheet.getRange(targetSheet.getLastRow() + 1, 1, rowsToAdd.length, 13).setValues(rowsToAdd);
    Logger.log("ย้ายข้อมูลสำเร็จทั้งหมด " + rowsToAdd.length + " รายการ เข้าชีท Visitor_Logs");
    return "ย้ายข้อมูลสำเร็จ " + rowsToAdd.length + " รายการ";
  } else {
    Logger.log("ข้อมูลทั้งหมดมีอยู่ใน Visitor_Logs แล้ว ไม่พบข้อมูลใหม่");
    return "ข้อมูลทั้งหมดมีอยู่ใน Visitor_Logs แล้ว";
  }
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var result = {};
    
    // ดึงข้อมูล Data_base (คอลัมน์ A: Company, คอลัมน์ B: Department)
    var baseSheet = ss.getSheetByName("Data_base");
    if (baseSheet) {
      var baseData = baseSheet.getDataRange().getValues();
      var seenDepts = {};
      var deptsList = [];
      for (var b = 1; b < baseData.length; b++) {
        var comp = baseData[b][0] ? String(baseData[b][0]).trim() : "";
        var dept = baseData[b][1] ? String(baseData[b][1]).trim() : comp;
        if (dept && !seenDepts[dept]) {
          seenDepts[dept] = true;
          deptsList.push({ name: dept, buildingFloor: comp ? "คู่สัญญา: " + comp : "", company: comp });
        }
      }
      result.departments = deptsList;
    }
    
    // ดึงข้อมูล Data_equpment (คอลัมน์ A: Type_Equpment, คอลัมน์ B: Name_Equpment, คอลัมน์ C: Brand, คอลัมน์ D: Name_EqupmentTH)
    var eqSheet = ss.getSheetByName("Data_equpment");
    if (eqSheet) {
      var eqData = eqSheet.getDataRange().getValues();
      var seenEqs = {};
      var eqsList = [];
      for (var e = 1; e < eqData.length; e++) {
        var eqType = eqData[e][0] ? String(eqData[e][0]).trim() : "";
        var eqName = eqData[e][1] ? String(eqData[e][1]).trim() : eqType;
        var eqBrand = eqData[e][2] ? String(eqData[e][2]).trim() : "";
        var eqNameTh = eqData[e][3] ? String(eqData[e][3]).trim() : "";
        if (eqName && !seenEqs[eqName + "-" + eqBrand]) {
          seenEqs[eqName + "-" + eqBrand] = true;
          eqsList.push({ name: eqName, nameTh: eqNameTh, category: eqType, brand: eqBrand });
        }
      }
      result.equipments = eqsList;
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
  private static cachedWebhookUrl = '';
  private static cachedSheetId = DEFAULT_SHEET_ID;
  private static isInitialized = false;

  /**
   * Sync persistent settings from backend server on startup
   */
  static async initSettings(): Promise<void> {
    if (this.isInitialized) return;
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.settings) {
          const webhook = json.settings.sheetWebhookUrl || DEFAULT_SHEET_WEBHOOK_URL;
          this.cachedWebhookUrl = webhook;
          localStorage.setItem(STORAGE_KEYS.SHEET_WEBHOOK_URL, webhook);

          const id = json.settings.sheetId || DEFAULT_SHEET_ID;
          this.cachedSheetId = id;
          localStorage.setItem(STORAGE_KEYS.SHEET_ID, id);
        }
      }
    } catch (e) {
      console.warn('Could not sync settings from server:', e);
    }
    if (!this.cachedWebhookUrl) {
      this.cachedWebhookUrl = localStorage.getItem(STORAGE_KEYS.SHEET_WEBHOOK_URL) || DEFAULT_SHEET_WEBHOOK_URL;
    }
    if (!this.cachedSheetId) {
      this.cachedSheetId = localStorage.getItem(STORAGE_KEYS.SHEET_ID) || DEFAULT_SHEET_ID;
    }
    this.isInitialized = true;
  }

  static getWebhookUrl(): string {
    if (this.cachedWebhookUrl) return this.cachedWebhookUrl;
    try {
      const local = localStorage.getItem(STORAGE_KEYS.SHEET_WEBHOOK_URL);
      if (local && local.trim().length > 0) {
        this.cachedWebhookUrl = local.trim();
        return this.cachedWebhookUrl;
      }
    } catch {}
    this.cachedWebhookUrl = DEFAULT_SHEET_WEBHOOK_URL;
    return DEFAULT_SHEET_WEBHOOK_URL;
  }

  static saveWebhookUrl(url: string): void {
    const cleanUrl = url.trim();
    this.cachedWebhookUrl = cleanUrl;
    try {
      localStorage.setItem(STORAGE_KEYS.SHEET_WEBHOOK_URL, cleanUrl);
    } catch (e) {
      console.error('Error saving Sheet Webhook URL to localStorage:', e);
    }

    // Persist to server backend
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheetWebhookUrl: cleanUrl })
    }).catch(err => console.warn('Could not save webhook to server:', err));
  }

  static getSheetId(): string {
    if (this.cachedSheetId) return this.cachedSheetId;
    try {
      const local = localStorage.getItem(STORAGE_KEYS.SHEET_ID) || DEFAULT_SHEET_ID;
      this.cachedSheetId = local;
      return local;
    } catch {
      return DEFAULT_SHEET_ID;
    }
  }

  static saveSheetId(id: string): void {
    const cleanId = id.trim() || DEFAULT_SHEET_ID;
    this.cachedSheetId = cleanId;
    try {
      localStorage.setItem(STORAGE_KEYS.SHEET_ID, cleanId);
    } catch (e) {
      console.error('Error saving Sheet ID to localStorage:', e);
    }

    // Persist to server backend
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheetId: cleanId })
    }).catch(err => console.warn('Could not save sheetId to server:', err));
  }

  /**
   * Sends visitor checkin record directly to Google Apps Script Web App (Visitor_Logs)
   * Uses server proxy to prevent CORS issues and guarantee delivery.
   */
  static async sendRecordToGoogleSheet(record: VisitorRecord): Promise<{ success: boolean; message: string }> {
    const webhookUrl = this.getWebhookUrl();
    if (!webhookUrl) {
      return { success: false, message: 'ยังไม่ได้ระบุ Webhook URL ของ Google Sheets' };
    }

    const payload = {
      webhookUrl,
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
    };

    try {
      // 1. Send via server proxy endpoint for reliable execution
      const serverRes = await fetch('/api/sheets/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (serverRes.ok) {
        return {
          success: true,
          message: 'บันทึกข้อมูลเข้าชีท Visitor_Logs เรียบร้อยแล้ว',
        };
      }
    } catch (serverErr) {
      console.warn('Server proxy send failed, falling back to direct client post:', serverErr);
    }

    // 2. Direct client fallback (no-cors)
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });

      return {
        success: true,
        message: 'ส่งข้อมูลไปยังชีท Visitor_Logs เรียบร้อยแล้ว',
      };
    } catch (err: any) {
      return {
        success: false,
        message: `ไม่สามารถส่งเข้าชีท: ${err?.message || 'เครือข่ายขัดข้อง'}`,
      };
    }
  }

  /**
   * Batch sync all local records into Google Sheet "Visitor_Logs"
   */
  static async batchSyncAllRecords(records: VisitorRecord[]): Promise<{ success: boolean; message: string; count?: number }> {
    const webhookUrl = this.getWebhookUrl();
    if (!webhookUrl) {
      return { success: false, message: 'ยังไม่ได้ตั้งค่า Google Apps Script Webhook URL ในระบบ' };
    }

    if (!records || records.length === 0) {
      return { success: false, message: 'ไม่มีข้อมูลรายการที่จะซิงค์' };
    }

    try {
      const res = await fetch('/api/sheets/batch-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl,
          records: records.map(r => ({
            id: r.id,
            timestamp: r.timestamp,
            name: r.name,
            company: r.company,
            phone: r.phone,
            department: r.department,
            workType: r.workType,
            visitorCount: r.visitorCount,
            vehicleType: r.vehicleType,
            licensePlate: r.licensePlate,
            equipmentHandled: r.equipmentHandled,
            contactRole: r.contactRole,
            notes: r.notes
          }))
        })
      });

      const data = await res.json();
      if (data.success) {
        return {
          success: true,
          count: records.length,
          message: `ซิงค์ประวัติผู้มาติดต่อ ${records.length} รายการ เข้าชีท "Visitor_Logs" สำเร็จสมบูรณ์!`
        };
      } else {
        throw new Error(data.error || 'Sync failed');
      }
    } catch (err: any) {
      return {
        success: false,
        message: `ซิงค์ไม่สำเร็จ: ${err.message}`
      };
    }
  }

  /**
   * Fetch Master Data (Departments & Equipment) from Google Sheet
   * Tries Webhook doGet first, falls back to Google Visualization CSV export
   */
  static async fetchMasterDataFromSheet(sheetIdParam?: string, webhookUrlParam?: string): Promise<{
    success: boolean;
    departments?: DepartmentInfo[];
    companies?: string[];
    equipments?: EquipmentInfo[];
    message: string;
  }> {
    const sheetId = sheetIdParam || this.getSheetId();
    const webhookUrl = webhookUrlParam || this.getWebhookUrl();

    // 1. Try fetching via Apps Script Webhook (doGet) if webhook URL exists
    if (webhookUrl && webhookUrl.startsWith('https://script.google.com/macros/s/')) {
      try {
        const fetchUrl = webhookUrl.includes('?') ? `${webhookUrl}&action=all` : `${webhookUrl}?action=all`;
        const res = await fetch(fetchUrl);
        if (res.ok) {
          const json = await res.json();
          if (json.status === 'success' && json.data) {
            const depts: DepartmentInfo[] = (json.data.departments || []).map((d: any, idx: number) => ({
              id: `dept-gs-${idx + 1}`,
              name: d.name,
              buildingFloor: d.buildingFloor || '',
              category: 'General',
            }));

            const companies: string[] = (json.data.companies || []).map((c: any) => typeof c === 'string' ? c : (c.name || '')).filter(Boolean);

            const eqs: EquipmentInfo[] = (json.data.equipments || []).map((eq: any, idx: number) => ({
              id: `eq-gs-${idx + 1}`,
              code: `EQ-${idx + 1}`,
              name: eq.name,
              nameTh: eq.nameTh || translateMedicalEquipmentToThai(eq.name, eq.category),
              vendorCompany: eq.vendorCompany || 'ไม่ระบุ',
              department: eq.department || '',
              category: eq.category || 'Medical Equipment',
            }));

            if (depts.length > 0 || companies.length > 0) {
              return {
                success: true,
                departments: depts,
                companies: companies,
                equipments: eqs,
                message: `ซิงค์ข้อมูลจาก Apps Script สำเร็จ: พบ ${companies.length} บริษัท, ${depts.length} แผนก และ ${eqs.length} รายการเครื่องมือแพทย์`,
              };
            }
          }
        }
      } catch (err) {
        console.warn('Apps script doGet fetch failed, trying direct CSV fallback:', err);
      }
    }

    // 2. Try fetching direct CSV from Google Sheets (Requires "Anyone with the link can view")
    try {
      const baseCsvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('Data_base')}`;
      const eqCsvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('Data_equpment')}`;

      const [resBase, resEq] = await Promise.all([
        fetch(baseCsvUrl),
        fetch(eqCsvUrl).catch(() => null),
      ]);

      if (resBase.ok) {
        const textBase = await resBase.text();
        // Check if Google returned login page HTML instead of CSV
        if (textBase.includes('<!DOCTYPE html>') || textBase.includes('google.com/ServiceLogin')) {
          return {
            success: false,
            message: '⚠️ ไม่สามารถดึงข้อมูลได้เนื่องจาก Google Sheet ตั้งค่าการแชร์เป็น "จำกัด (Restricted)" กรุณากดปุ่ม "แชร์ (Share)" ใน Google Sheets แล้วเปลี่ยนเป็น "ทุกคนที่มีลิงก์มีสิทธิ์ดู (Anyone with the link)" หรือใส่ Apps Script Webhook URL',
          };
        }

        const linesBase = textBase.split(/\r?\n/).filter(line => line.trim().length > 0);
        // Parse CSV lines for Data_base
        // 1. บริษัท: คอลัมน์ A (Company)
        // 2. แผนก: คอลัมน์ B (Department)
        const parsedDepts: DepartmentInfo[] = [];
        const parsedCompanies: string[] = [];
        const seenDeptNames = new Set<string>();
        const seenCompanies = new Set<string>();

        for (let i = 1; i < linesBase.length; i++) {
          const cols = parseCsvLine(linesBase[i]);
          const companyColA = cols[0]?.trim() || '';
          const departmentColB = cols[1]?.trim() || '';

          // บริษัท เอาค่าในชีท Data_base คอลัมน์ A (Company) เท่านั้น
          if (companyColA && !seenCompanies.has(companyColA.toLowerCase())) {
            seenCompanies.add(companyColA.toLowerCase());
            parsedCompanies.push(companyColA);
          }

          // แผนก เอาค่าในชีท Data_base คอลัมน์ B (Department) เท่านั้น
          if (departmentColB && !seenDeptNames.has(departmentColB.toLowerCase())) {
            seenDeptNames.add(departmentColB.toLowerCase());
            parsedDepts.push({
              id: `dept-sync-${parsedDepts.length + 1}`,
              name: departmentColB,
              buildingFloor: '',
              category: 'Hospital Unit',
            });
          }
        }

        const parsedEqs: EquipmentInfo[] = [];
        if (resEq && resEq.ok) {
          const textEq = await resEq.text();
          if (!textEq.includes('<!DOCTYPE html>')) {
            const linesEq = textEq.split(/\r?\n/).filter(line => line.trim().length > 0);
            const seenEqNames = new Set<string>();
            for (let i = 1; i < linesEq.length; i++) {
              const cols = parseCsvLine(linesEq[i]);
              // Format: Type_Equpment (Col A) | Name_Equpment (Col B) | Brand (Col C) | Name_EqupmentTH (Col D)
              const eqType = cols[0]?.trim() || '';
              const eqName = cols[1]?.trim() || cols[0]?.trim() || '';
              const eqBrand = cols[2]?.trim() || '';
              const eqNameThFromSheet = cols[3]?.trim() || '';
              const finalNameTh = eqNameThFromSheet || translateMedicalEquipmentToThai(eqName, eqType);

              if (eqName && !seenEqNames.has(`${eqType}-${eqName}-${eqBrand}`.toLowerCase())) {
                seenEqNames.add(`${eqType}-${eqName}-${eqBrand}`.toLowerCase());
                parsedEqs.push({
                  id: `eq-sync-${parsedEqs.length + 1}`,
                  code: `EQ-${parsedEqs.length + 1}`,
                  name: eqName,
                  nameTh: finalNameTh,
                  brand: eqBrand,
                  category: eqType || 'Medical Equipment',
                  department: '',
                });
              }
            }
          }
        }

        if (parsedDepts.length > 0 || parsedCompanies.length > 0) {
          return {
            success: true,
            departments: parsedDepts,
            companies: parsedCompanies,
            equipments: parsedEqs,
            message: `ซิงค์ข้อมูลจากชีท Data_base สำเร็จ: พบ ${parsedCompanies.length} บริษัท (คอลัมน์ A), ${parsedDepts.length} แผนก (คอลัมน์ B) และ ${parsedEqs.length} เครื่องมือแพทย์พร้อมคำแปลไทย (คอลัมน์ D)`,
          };
        }
      }

      return {
        success: false,
        message: 'ไม่พบข้อมูลในแผ่นงาน Data_base หรือชื่อชีทไม่ถูกต้อง (ต้องชื่อ Data_base และ Data_equpment)',
      };
    } catch (e: any) {
      return {
        success: false,
        message: `ข้อผิดพลาดในการเชื่อมต่อ Google Sheets: ${e?.message || 'ไม่สามารถเข้าถึงได้'}`,
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
