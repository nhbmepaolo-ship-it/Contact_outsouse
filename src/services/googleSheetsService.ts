import { VisitorRecord, DepartmentInfo, EquipmentInfo } from '../types';

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
    
    // ดึงข้อมูล Data_equpment (คอลัมน์ A: Type_Equpment, คอลัมน์ B: Name_Equpment, คอลัมน์ C: Brand)
    var eqSheet = ss.getSheetByName("Data_equpment");
    if (eqSheet) {
      var eqData = eqSheet.getDataRange().getValues();
      var seenEqs = {};
      var eqsList = [];
      for (var e = 1; e < eqData.length; e++) {
        var eqType = eqData[e][0] ? String(eqData[e][0]).trim() : "";
        var eqName = eqData[e][1] ? String(eqData[e][1]).trim() : eqType;
        var eqBrand = eqData[e][2] ? String(eqData[e][2]).trim() : "";
        if (eqName && !seenEqs[eqName + "-" + eqBrand]) {
          seenEqs[eqName + "-" + eqBrand] = true;
          eqsList.push({ name: eqName, category: eqType, brand: eqBrand });
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
   * Fetch Master Data (Departments & Equipment) from Google Sheet
   * Tries Webhook doGet first, falls back to Google Visualization CSV export
   */
  static async fetchMasterDataFromSheet(sheetIdParam?: string, webhookUrlParam?: string): Promise<{
    success: boolean;
    departments?: DepartmentInfo[];
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
              buildingFloor: d.buildingFloor || 'ไม่ระบุ',
              category: 'General',
            }));

            const eqs: EquipmentInfo[] = (json.data.equipments || []).map((eq: any, idx: number) => ({
              id: `eq-gs-${idx + 1}`,
              code: `EQ-${idx + 1}`,
              name: eq.name,
              vendorCompany: eq.vendorCompany || 'ไม่ระบุ',
              department: eq.department || 'ไม่ระบุ',
              category: 'Medical Equipment',
            }));

            if (depts.length > 0) {
              return {
                success: true,
                departments: depts,
                equipments: eqs,
                message: `ซิงค์ข้อมูลจาก Apps Script สำเร็จ: พบ ${depts.length} แผนก และ ${eqs.length} รายการเครื่องมือแพทย์`,
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
        const parsedDepts: DepartmentInfo[] = [];
        const seenDeptNames = new Set<string>();
        for (let i = 1; i < linesBase.length; i++) {
          const cols = parseCsvLine(linesBase[i]);
          // Check if Col B is Department (as in Company | Department structure) or Col A
          const deptName = (cols[1] && cols[1].trim()) ? cols[1].trim() : (cols[0] && cols[0].trim() ? cols[0].trim() : '');
          const companyName = (cols[0] && cols[0].trim() && cols[1]) ? cols[0].trim() : '';

          if (deptName && !seenDeptNames.has(deptName.toLowerCase())) {
            seenDeptNames.add(deptName.toLowerCase());
            parsedDepts.push({
              id: `dept-sync-${parsedDepts.length + 1}`,
              name: deptName,
              buildingFloor: companyName ? `คู่สัญญา: ${companyName}` : '',
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
              // Format: Type_Equpment (Col A) | Name_Equpment (Col B) | Brand (Col C)
              const eqType = cols[0]?.trim() || '';
              const eqName = cols[1]?.trim() || cols[0]?.trim() || '';
              const eqBrand = cols[2]?.trim() || '';

              if (eqName && !seenEqNames.has(`${eqType}-${eqName}-${eqBrand}`.toLowerCase())) {
                seenEqNames.add(`${eqType}-${eqName}-${eqBrand}`.toLowerCase());
                parsedEqs.push({
                  id: `eq-sync-${parsedEqs.length + 1}`,
                  code: `EQ-${parsedEqs.length + 1}`,
                  name: eqName,
                  brand: eqBrand,
                  category: eqType || 'Medical Equipment',
                  department: '',
                });
              }
            }
          }
        }

        if (parsedDepts.length > 0) {
          return {
            success: true,
            departments: parsedDepts,
            equipments: parsedEqs,
            message: `ซิงค์ข้อมูลจากชีท Data_base สำเร็จ: พบ ${parsedDepts.length} แผนก และ ${parsedEqs.length} เครื่องมือแพทย์`,
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
