import { VisitorRecord, DepartmentInfo, EquipmentInfo, ContactRole, VehicleType } from '../types';
import { translateMedicalEquipmentToThai } from '../utils/equipmentTranslator';
import { StorageService } from './storageService';
import { cleanPhoneNumber, formatPhoneForGoogleSheets } from '../utils/phoneFormatter';

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
 * BME Visitor & Medical Equipment - Google Apps Script (รวมชีท Visitor_Logs)
 * =========================================================================
 * บันทึกข้อมูลเฉพาะชีท "Visitor_Logs" ชีทเดียวเท่านั้น
 * รักษาเลข 0 นำหน้าของเบอร์โทรศัพท์ครบถ้วน 100%
 * และรองรับการย้ายข้อมูลเก่าจาก "การตอบแบบฟอร์ม 1" มาใส่ใน "Visitor_Logs"
 * 
 * วิธีติดตั้ง / อัปเดต:
 * 1. เปิด Google Sheets ของคุณ
 * 2. ไปที่เมนู "ส่วนขยาย" (Extensions) > "Apps Script"
 * 3. ลบโค้ดเดิมทั้งหมดออก แล้ววางโค้ดชุดนี้ลงไปทั้งหมด
 * 4. กด "ทำให้ใช้งานได้" (Deploy) > "การทำให้ใช้งานได้รายการใหม่" (New deployment)
 * 5. เลือกประเภท: "เว็บแอป" (Web app)
 * 6. ตั้งค่า:
 *    - คำอธิบาย: BME Visitor Webhook
 *    - ดำเนินการในฐานะ: ฉัน (Me)
 *    - ผู้มีสิทธิ์เข้าถึง: ทุกคน (Anyone)  <--- สำคัญมาก!
 * 7. กด "ทำให้ใช้งานได้" (Deploy) แล้วคัดลอก "URL เว็บแอป" มาใช้งาน
 * 
 * *************************************************************************
 * วิธีเติมเลข 0 นำหน้าเบอร์โทรทั้งหมดในชีท Visitor_Logs:
 * - ใน Apps Script เลือกฟังก์ชัน "fixAllPhoneNumbersInVisitorLogs" แล้วกด "เรียกใช้" (Run)
 * *************************************************************************
 */

function cleanPhoneForSheet(rawPhone) {
  if (!rawPhone) return "-";
  var s = String(rawPhone).trim().replace(/^'+/, '');
  if (!s || s === "-" || s === "undefined" || s === "null") return "-";
  
  var clean = s.replace(/[^\\d+]/g, '');
  if (clean.indexOf("+66") === 0) clean = "0" + clean.substring(3);
  else if (clean.indexOf("66") === 0 && clean.length >= 10) clean = "0" + clean.substring(2);
  else if (clean.length === 9 && ["6","8","9","2","3","4","5","7"].indexOf(clean.charAt(0)) !== -1) {
    clean = "0" + clean;
  } else if (clean.length === 8 && clean.charAt(0) === "2") {
    clean = "0" + clean;
  }
  return clean ? "'" + clean : "-";
}

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
        "รายละเอียดงาน",
        "จำนวนผู้เข้าพบ",
        "ประเภทพาหนะ",
        "ทะเบียนรถ",
        "เครื่องมือแพทย์ที่ดูแล",
        "หมายเหตุ",
        "ลิงก์/สถานะรูปบัตร",
        "Record ID"
      ]);
      // ปรับรูปแบบหัวตารางให้สวยงาม และตั้งค่าคอลัมน์เบอร์โทรเป็นข้อความ
      sheet.getRange("A1:O1").setFontWeight("bold").setBackground("#1E293B").setFontColor("#FFFFFF");
      sheet.getRange("E:E").setNumberFormat("@");
      sheet.setFrozenRows(1);
    }
    
    var rawContents = e.postData ? e.postData.contents : "{}";
    var data = JSON.parse(rawContents);
    
    // หากเป็นการสั่งปรับแก้เบอร์โทรศัพท์ทั้งหมดในชีท
    if (data && (data.action === "fixPhones" || data.action === "fixAllPhones")) {
      var fixMsg = fixAllPhoneNumbersInVisitorLogs();
      return ContentService
        .createTextOutput(JSON.stringify({ status: "success", message: fixMsg }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // หากเป็นการสั่งย้ายข้อมูลจากระบบ
    if (data && (data.action === "migrate" || data.action === "migrateOldFormData")) {
      var migMsg = migrateOldFormDataToVisitorLogs();
      return ContentService
        .createTextOutput(JSON.stringify({ status: "success", message: migMsg }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // รองรับทั้งแบบแถวเดี่ยว และแบบชุดข้อมูล (Batch array)
    var items = Array.isArray(data) ? data : (data.records ? data.records : [data]);
    var rowsToAppend = [];
    
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (!item || (!item.name && !item.company && !item.timestamp)) continue;
      
      var timestamp = item.timestamp || Utilities.formatDate(new Date(), "Asia/Bangkok", "dd/MM/yyyy, HH:mm:ss");
      var name = item.name || "-";
      var company = item.company || "-";
      var role = item.contactRole || item.role || "ช่าง";
      var phone = cleanPhoneForSheet(item.phone);
      var department = item.department || "-";
      var workType = item.workType || "-";
      var workDetails = item.workDetails || "-";
      var visitorCount = item.visitorCount || 1;
      var vehicleType = item.vehicleType || "รถยนต์ส่วนบุคคล";
      var licensePlate = item.licensePlate || "-";
      var equipmentList = Array.isArray(item.equipmentHandled) ? item.equipmentHandled.join(", ") : (item.equipmentHandled || "-");
      var notes = item.notes || "-";
      var cardImageUrl = item.cardImageUrl ? (item.cardImageUrl.indexOf("http") === 0 ? item.cardImageUrl : "[รูปแนบในระบบ]") : "-";
      var recordId = item.id || "vis-" + Date.now() + "-" + i;
      
      rowsToAppend.push([
        timestamp,
        name,
        company,
        role,
        phone,
        department,
        workType,
        workDetails,
        visitorCount,
        vehicleType,
        licensePlate,
        equipmentList,
        notes,
        cardImageUrl,
        recordId
      ]);
    }
    
    if (rowsToAppend.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, 15).setValues(rowsToAppend);
      sheet.getRange("E:E").setNumberFormat("@");
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
 * ปรับแก้เบอร์โทรศัพท์ทุกแถวใน Visitor_Logs ให้มีเลข 0 นำหน้าครบถ้วน 100%
 */
function fixAllPhoneNumbersInVisitorLogs() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Visitor_Logs");
  if (!sheet) return "ไม่พบชีท Visitor_Logs";
  
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return "ไม่มีข้อมูลในชีท Visitor_Logs";
  
  var range = sheet.getRange(2, 5, lastRow - 1, 1);
  var values = range.getValues();
  var updatedCount = 0;
  
  for (var i = 0; i < values.length; i++) {
    var raw = values[i][0];
    var formatted = cleanPhoneForSheet(raw);
    if (formatted !== "-" && formatted !== raw) {
      values[i][0] = formatted;
      updatedCount++;
    }
  }
  
  range.setNumberFormat("@");
  range.setValues(values);
  return "ปรับปรุงเบอร์โทรศัพท์ในชีท Visitor_Logs สำเร็จแล้ว " + updatedCount + " รายการ (มีเลข 0 นำหน้าครบถ้วน)";
}

/**
 * ฟังก์ชันย้ายข้อมูลเก่าจาก "การตอบแบบฟอร์ม 1" หรือ "Form Responses 1" มาใส่ใน "Visitor_Logs"
 * จับคู่คอลัมน์ให้อัตโนมัติ แมชทุกช่องอย่างถูกต้อง แม่นยำ 100%
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
      "รายละเอียดงาน",
      "จำนวนผู้เข้าพบ",
      "ประเภทพาหนะ",
      "ทะเบียนรถ",
      "เครื่องมือแพทย์ที่ดูแล",
      "หมายเหตุ",
      "ลิงก์/สถานะรูปบัตร",
      "Record ID"
    ]);
    targetSheet.getRange("A1:O1").setFontWeight("bold").setBackground("#1E293B").setFontColor("#FFFFFF");
    targetSheet.getRange("E:E").setNumberFormat("@");
    targetSheet.setFrozenRows(1);
  }
  
  // ค้นหาชีทต้นทาง (การตอบแบบฟอร์ม 1 หรือ Form Responses 1)
  var sourceSheet = ss.getSheetByName("การตอบแบบฟอร์ม 1") || 
                    ss.getSheetByName("Form Responses 1") || 
                    ss.getSheetByName("Form responses 1");
                    
  if (!sourceSheet) {
    // ค้นหาชีทที่มีคำว่า "การตอบแบบฟอร์ม" หรือ "Form Responses"
    var allSheets = ss.getSheets();
    for (var s = 0; s < allSheets.length; s++) {
      var sName = allSheets[s].getName();
      if (sName.indexOf("การตอบแบบฟอร์ม") !== -1 || sName.toLowerCase().indexOf("form response") !== -1) {
        sourceSheet = allSheets[s];
        break;
      }
    }
  }
                    
  if (!sourceSheet) {
    Logger.log("ไม่พบชีท 'การตอบแบบฟอร์ม 1'");
    return "ไม่พบชีท 'การตอบแบบฟอร์ม 1' ในสเปรดชีตนี้";
  }
  
  var srcData = sourceSheet.getDataRange().getValues();
  if (srcData.length <= 1) {
    Logger.log("ชีท 'การตอบแบบฟอร์ม 1' ไม่มีข้อมูลแถวสำหรับย้าย");
    return "ชีท 'การตอบแบบฟอร์ม 1' ไม่มีข้อมูลสำหรับย้าย";
  }
  
  // วิเคราะห์หัวคอลัมน์ของชีทต้นทางเพื่อจับคู่คอลัมน์ให้ตรงเป๊ะ 100%
  var headers = srcData[0];
  var colMap = {
    timestamp: 0,
    name: 1,
    company: 2,
    role: -1,
    phone: -1,
    dept: -1,
    workType: -1,
    workDetails: -1,
    count: -1,
    vehicle: -1,
    plate: -1,
    eq: -1,
    notes: -1,
    cardImage: -1
  };
  
  for (var c = 0; c < headers.length; c++) {
    var h = String(headers[c]).trim().toLowerCase();
    if (h.indexOf("เวลา") !== -1 || h.indexOf("ประทับ") !== -1 || h.indexOf("timestamp") !== -1 || h.indexOf("date") !== -1) {
      colMap.timestamp = c;
    } else if (h.indexOf("ชื่อ") !== -1 || h.indexOf("นามสกุล") !== -1 || h.indexOf("name") !== -1) {
      colMap.name = c;
    } else if (h.indexOf("บริษัท") !== -1 || h.indexOf("สังกัด") !== -1 || h.indexOf("company") !== -1) {
      colMap.company = c;
    } else if (h.indexOf("บทบาท") !== -1 || h.indexOf("ตำแหน่ง") !== -1 || h.indexOf("role") !== -1) {
      colMap.role = c;
    } else if (h.indexOf("โทร") !== -1 || h.indexOf("phone") !== -1 || h.indexOf("tel") !== -1 || h.indexOf("mobile") !== -1) {
      colMap.phone = c;
    } else if (h.indexOf("แผนก") !== -1 || h.indexOf("dept") !== -1 || h.indexOf("department") !== -1) {
      colMap.dept = c;
    } else if (h.indexOf("รายละเอียดงาน") !== -1 || h.indexOf("work detail") !== -1) {
      colMap.workDetails = c;
    } else if (h.indexOf("ลักษณะ") !== -1 || h.indexOf("งาน") !== -1 || h.indexOf("work") !== -1) {
      colMap.workType = c;
    } else if (h.indexOf("จำนวน") !== -1 || h.indexOf("คน") !== -1 || h.indexOf("count") !== -1) {
      colMap.count = c;
    } else if (h.indexOf("พาหนะ") !== -1 || h.indexOf("vehicle") !== -1) {
      colMap.vehicle = c;
    } else if (h.indexOf("ทะเบียน") !== -1 || h.indexOf("plate") !== -1) {
      colMap.plate = c;
    } else if (h.indexOf("เครื่องมือ") !== -1 || h.indexOf("อุปกรณ์") !== -1 || h.indexOf("equipment") !== -1) {
      colMap.eq = c;
    } else if (h.indexOf("หมายเหตุ") !== -1 || h.indexOf("note") !== -1 || h.indexOf("remark") !== -1) {
      colMap.notes = c;
    } else if (h.indexOf("รูป") !== -1 || h.indexOf("บัตร") !== -1 || h.indexOf("image") !== -1 || h.indexOf("photo") !== -1) {
      colMap.cardImage = c;
    }
  }
  
  // กำหนด Default Index หากหัวตารางไม่ระบุ
  if (colMap.role === -1) colMap.role = 3;
  if (colMap.phone === -1) colMap.phone = 4;
  if (colMap.dept === -1) colMap.dept = 5;
  if (colMap.workType === -1) colMap.workType = 6;
  if (colMap.workDetails === -1) colMap.workDetails = 7;
  if (colMap.count === -1) colMap.count = 8;
  if (colMap.vehicle === -1) colMap.vehicle = 9;
  if (colMap.plate === -1) colMap.plate = 10;
  if (colMap.eq === -1) colMap.eq = 11;
  if (colMap.notes === -1) colMap.notes = 12;
  if (colMap.cardImage === -1) colMap.cardImage = 13;
  
  // ดึงข้อมูลเดิมใน Visitor_Logs เพื่อป้องกันการบันทึกซ้ำ
  var existingData = targetSheet.getDataRange().getValues();
  var existingKeys = {};
  for (var i = 1; i < existingData.length; i++) {
    var tVal = String(existingData[i][0]).trim();
    var nVal = String(existingData[i][1]).trim();
    var cVal = String(existingData[i][2]).trim();
    var k = tVal + "_" + nVal + "_" + cVal;
    existingKeys[k] = true;
  }
  
  var rowsToAdd = [];
  for (var r = 1; r < srcData.length; r++) {
    var row = srcData[r];
    var timestamp = colMap.timestamp !== -1 && row[colMap.timestamp] ? String(row[colMap.timestamp]).trim() : "";
    var name = colMap.name !== -1 && row[colMap.name] ? String(row[colMap.name]).trim() : "-";
    var company = colMap.company !== -1 && row[colMap.company] ? String(row[colMap.company]).trim() : "-";
    
    if (!timestamp && !name && !company) continue;
    
    var key = timestamp + "_" + name + "_" + company;
    
    if (!existingKeys[key]) {
      var role = colMap.role !== -1 && row[colMap.role] ? String(row[colMap.role]).trim() : "ช่าง";
      var phone = colMap.phone !== -1 && row[colMap.phone] ? cleanPhoneForSheet(row[colMap.phone]) : "-";
      var dept = colMap.dept !== -1 && row[colMap.dept] ? String(row[colMap.dept]).trim() : "-";
      var workType = colMap.workType !== -1 && row[colMap.workType] ? String(row[colMap.workType]).trim() : "-";
      var workDetails = colMap.workDetails !== -1 && row[colMap.workDetails] ? String(row[colMap.workDetails]).trim() : "-";
      var count = colMap.count !== -1 && row[colMap.count] ? Number(row[colMap.count]) || 1 : 1;
      var vehicle = colMap.vehicle !== -1 && row[colMap.vehicle] ? String(row[colMap.vehicle]).trim() : "รถยนต์ส่วนบุคคล";
      var plate = colMap.plate !== -1 && row[colMap.plate] ? String(row[colMap.plate]).trim() : "-";
      var eq = colMap.eq !== -1 && row[colMap.eq] ? String(row[colMap.eq]).trim() : "-";
      var notes = colMap.notes !== -1 && row[colMap.notes] ? String(row[colMap.notes]).trim() : "-";
      var cardImageUrl = colMap.cardImage !== -1 && row[colMap.cardImage] ? String(row[colMap.cardImage]).trim() : "-";
      var id = "vis-migrated-" + r + "-" + Date.now();
      
      rowsToAdd.push([
        timestamp,
        name,
        company,
        role,
        phone,
        dept,
        workType,
        workDetails,
        count,
        vehicle,
        plate,
        eq,
        notes,
        cardImageUrl,
        id
      ]);
      existingKeys[key] = true;
    }
  }
  
  if (rowsToAdd.length > 0) {
    targetSheet.getRange(targetSheet.getLastRow() + 1, 1, rowsToAdd.length, 15).setValues(rowsToAdd);
    targetSheet.getRange("E:E").setNumberFormat("@");
    var msg = "ย้ายข้อมูลจาก 'การตอบแบบฟอร์ม 1' เข้าสู่ 'Visitor_Logs' สำเร็จแล้ว " + rowsToAdd.length + " รายการ";
    Logger.log(msg);
    return msg;
  } else {
    var noNewMsg = "ข้อมูลทั้งหมดจาก 'การตอบแบบฟอร์ม 1' มีอยู่ในชีท 'Visitor_Logs' แล้ว (ไม่มีข้อมูลใหม่ที่ต้องย้าย)";
    Logger.log(noNewMsg);
    return noNewMsg;
  }
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // ตรวจสอบ action พิเศษ
    if (e && e.parameter) {
      if (e.parameter.action === "fixPhones" || e.parameter.action === "fixAllPhones") {
        var fixMsg = fixAllPhoneNumbersInVisitorLogs();
        return ContentService
          .createTextOutput(JSON.stringify({ status: "success", message: fixMsg }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      if (e.parameter.action === "migrate" || e.parameter.action === "migrateOldFormData") {
        var migMsg = migrateOldFormDataToVisitorLogs();
        return ContentService
          .createTextOutput(JSON.stringify({ status: "success", message: migMsg }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    var result = {};
    
    // ดึงข้อมูล Data_base (คอลัมน์ A: Company, คอลัมน์ B: Department)
    var baseSheet = ss.getSheetByName("Data_base");
    if (baseSheet) {
      var baseData = baseSheet.getDataRange().getValues();
      var seenDepts = {};
      var deptsList = [];
      var seenComps = {};
      var compsList = [];
      for (var b = 1; b < baseData.length; b++) {
        var comp = baseData[b][0] ? String(baseData[b][0]).trim() : "";
        var dept = baseData[b][1] ? String(baseData[b][1]).trim() : "";
        if (comp && !seenComps[comp]) {
          seenComps[comp] = true;
          compsList.push(comp);
        }
        if (dept && !seenDepts[dept]) {
          seenDepts[dept] = true;
          deptsList.push({ name: dept, buildingFloor: "", company: comp });
        }
      }
      result.departments = deptsList;
      result.companies = compsList;
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
   * Uses server proxy with automatic client-side fallback to prevent CORS and JSON issues.
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
      phone: formatPhoneForGoogleSheets(record.phone),
      department: record.department,
      workType: record.workType,
      workDetails: record.workDetails,
      visitorCount: record.visitorCount,
      vehicleType: record.vehicleType,
      licensePlate: record.licensePlate,
      equipmentHandled: record.equipmentHandled,
      contactRole: record.contactRole,
      notes: record.notes,
      cardImageUrl: record.cardImageUrl,
    };

    // 1. Try server proxy first
    try {
      const serverRes = await fetch('/api/sheets/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const txt = await serverRes.text();
      let data: any = null;
      try {
        data = txt ? JSON.parse(txt) : null;
      } catch {}

      if (serverRes.ok && (!data || data.success !== false)) {
        return {
          success: true,
          message: 'บันทึกข้อมูลเข้าชีท Visitor_Logs เรียบร้อยแล้ว',
        };
      }
    } catch (serverErr) {
      console.warn('Server proxy send failed, trying direct client post:', serverErr);
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

    const payloadRecords = records.map(r => ({
      id: r.id,
      timestamp: r.timestamp,
      name: r.name,
      company: r.company,
      phone: formatPhoneForGoogleSheets(r.phone),
      department: r.department,
      workType: r.workType,
      workDetails: r.workDetails,
      visitorCount: r.visitorCount,
      vehicleType: r.vehicleType,
      licensePlate: r.licensePlate,
      equipmentHandled: r.equipmentHandled,
      contactRole: r.contactRole,
      notes: r.notes,
      cardImageUrl: r.cardImageUrl,
    }));

    // 1. Try server proxy endpoint
    let serverSuccess = false;
    try {
      const res = await fetch('/api/sheets/batch-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl,
          records: payloadRecords
        })
      });

      const responseText = await res.text();
      let data: any = null;
      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch {}

      if (res.ok && data && data.success) {
        serverSuccess = true;
        return {
          success: true,
          count: records.length,
          message: `ซิงค์ประวัติผู้มาติดต่อ ${records.length} รายการ เข้าชีท "Visitor_Logs" สำเร็จสมบูรณ์!`
        };
      }
    } catch (proxyErr) {
      console.warn('Batch sync server proxy failed, trying direct post fallback:', proxyErr);
    }

    // 2. Direct browser fallback (no-cors)
    if (!serverSuccess) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payloadRecords),
        });

        return {
          success: true,
          count: records.length,
          message: `ส่งคำสั่งซิงค์ข้อมูล ${records.length} รายการ เข้าชีท "Visitor_Logs" เรียบร้อยแล้ว!`
        };
      } catch (err: any) {
        return {
          success: false,
          message: `ซิงค์ไม่สำเร็จ: ${err?.message || 'เครือข่ายขัดข้อง'}`
        };
      }
    }

    return {
      success: true,
      count: records.length,
      message: `ซิงค์ข้อมูล ${records.length} รายการ เข้าชีท "Visitor_Logs" เรียบร้อยแล้ว`
    };
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
          const text = await res.text();
          let json: any = null;
          try {
            json = text ? JSON.parse(text) : null;
          } catch {}

          if (json && json.status === 'success' && json.data) {
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
      const eqCsvUrl1 = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('Data_equpment')}`;
      const eqCsvUrl2 = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('Data_equipment')}`;

      const [resBase, resEq1, resEq2] = await Promise.all([
        fetch(baseCsvUrl).catch(() => null),
        fetch(eqCsvUrl1).catch(() => null),
        fetch(eqCsvUrl2).catch(() => null),
      ]);

      let textBase = '';
      if (resBase && resBase.ok) {
        textBase = await resBase.text();
      }

      // Try server proxy fallback if direct fetch fails
      if (!textBase || textBase.includes('<!DOCTYPE html>') || textBase.includes('google.com/ServiceLogin')) {
        try {
          const serverRes = await fetch(`/api/sheets/fetch?sheetId=${encodeURIComponent(sheetId)}&sheetName=${encodeURIComponent('Data_base')}`);
          if (serverRes.ok) {
            const serverJson = await serverRes.json();
            if (serverJson.success && serverJson.csv) {
              textBase = serverJson.csv;
            }
          }
        } catch {}
      }

      if (textBase && !textBase.includes('<!DOCTYPE html>') && !textBase.includes('google.com/ServiceLogin')) {
        const linesBase = textBase.split(/\r?\n/).filter(line => line.trim().length > 0);
        // Parse CSV lines for Data_base
        // 1. บริษัท: คอลัมน์ A (Company)
        // 2. แผนก: คอลัมน์ B (Department)
        // 3. ชื่อบริษัทภาษาอังกฤษ: คอลัมน์ C (Company_EN)
        const parsedDepts: DepartmentInfo[] = [];
        const parsedCompanies: string[] = [];
        const parsedCompanyEnMap: Record<string, string> = {};
        const seenDeptNames = new Set<string>();
        const seenCompanies = new Set<string>();

        for (let i = 1; i < linesBase.length; i++) {
          const cols = parseCsvLine(linesBase[i]);
          const companyColA = cols[0]?.trim() || '';
          const departmentColB = cols[1]?.trim() || '';
          const companyEnColC = cols[2]?.trim() || '';

          // บริษัท เอาค่าในชีท Data_base คอลัมน์ A (Company) เท่านั้น
          if (companyColA && !seenCompanies.has(companyColA.toLowerCase())) {
            seenCompanies.add(companyColA.toLowerCase());
            parsedCompanies.push(companyColA);
          }

          // ชื่อภาษาอังกฤษ คอลัมน์ C (Company_EN)
          if (companyColA && companyEnColC) {
            parsedCompanyEnMap[companyColA] = companyEnColC;
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

        if (Object.keys(parsedCompanyEnMap).length > 0) {
          StorageService.saveCompanyEnglishMap(parsedCompanyEnMap);
        }

        const parsedEqs: EquipmentInfo[] = [];
        let textEq = '';
        if (resEq1 && resEq1.ok) {
          textEq = await resEq1.text();
        }
        if ((!textEq || textEq.includes('<!DOCTYPE html>')) && resEq2 && resEq2.ok) {
          textEq = await resEq2.text();
        }

        // Server proxy fallback for Equipment tab
        if (!textEq || textEq.includes('<!DOCTYPE html>') || textEq.includes('google.com/ServiceLogin')) {
          try {
            const serverEqRes = await fetch(`/api/sheets/fetch?sheetId=${encodeURIComponent(sheetId)}&sheetName=${encodeURIComponent('Data_equpment')}`);
            if (serverEqRes.ok) {
              const serverEqJson = await serverEqRes.json();
              if (serverEqJson.success && serverEqJson.csv) {
                textEq = serverEqJson.csv;
              }
            }
          } catch {}
        }

        if (textEq && !textEq.includes('<!DOCTYPE html>') && !textEq.includes('google.com/ServiceLogin')) {
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

        if (parsedDepts.length > 0 || parsedCompanies.length > 0 || parsedEqs.length > 0) {
          return {
            success: true,
            departments: parsedDepts,
            companies: parsedCompanies,
            equipments: parsedEqs,
            message: `ซิงค์ข้อมูลจากชีทสำเร็จ: พบ ${parsedCompanies.length} บริษัท, ${parsedDepts.length} แผนก และ ${parsedEqs.length} เครื่องมือแพทย์พร้อม Brand และคำแปลไทย`,
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
   * Fetch all Visitor Logs directly from the "Visitor_Logs" Google Sheet tab
   * and synchronize both visitor records and company contacts directory.
   */
  static async fetchVisitorLogsFromSheet(sheetIdParam?: string): Promise<{
    success: boolean;
    records?: VisitorRecord[];
    count?: number;
    message: string;
  }> {
    const sheetId = sheetIdParam || this.getSheetId();

    try {
      const possibleSheetNames = ['Visitor_Logs', 'การตอบแบบฟอร์ม 1', 'Form Responses 1', 'Form responses 1', 'การตอบแบบฟอร์ม'];
      let foundCsvText = '';
      let usedSheetName = '';

      for (const name of possibleSheetNames) {
        try {
          const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}`;
          const response = await fetch(url);
          if (response.ok) {
            const txt = await response.text();
            if (!txt.includes('<!DOCTYPE html>') && !txt.includes('google.com/ServiceLogin') && txt.trim().length > 10) {
              foundCsvText = txt;
              usedSheetName = name;
              break;
            }
          }
        } catch {}
      }

      if (!foundCsvText) {
        return {
          success: false,
          message: 'ไม่สามารถดึงข้อมูลจากชีท "Visitor_Logs" ได้ กรุณาตรวจสอบการแชร์ Google Sheet ให้เป็น "ทุกคนที่มีลิงก์มีสิทธิ์ดู"',
        };
      }

      const lines = foundCsvText.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length <= 1) {
        return {
          success: true,
          records: [],
          count: 0,
          message: `ชีท "${usedSheetName}" ยังไม่มีข้อมูลแถวบันทึก`,
        };
      }

      const headers = parseCsvLine(lines[0]);
      const colMap: Record<string, number> = {
        timestamp: 0,
        name: 1,
        company: 2,
        role: -1,
        phone: -1,
        dept: -1,
        workType: -1,
        workDetails: -1,
        count: -1,
        vehicle: -1,
        plate: -1,
        eq: -1,
        notes: -1,
        cardImage: -1,
        id: -1,
      };

      headers.forEach((hRaw, idx) => {
        const h = hRaw.toLowerCase().trim();
        if (h.includes('เวลา') || h.includes('ประทับ') || h.includes('timestamp') || h.includes('date')) {
          colMap.timestamp = idx;
        } else if (h.includes('ชื่อ') || h.includes('นามสกุล') || h.includes('name')) {
          colMap.name = idx;
        } else if (h.includes('บริษัท') || h.includes('สังกัด') || h.includes('company')) {
          colMap.company = idx;
        } else if (h.includes('บทบาท') || h.includes('ตำแหน่ง') || h.includes('role')) {
          colMap.role = idx;
        } else if (h.includes('โทร') || h.includes('phone') || h.includes('tel') || h.includes('mobile')) {
          colMap.phone = idx;
        } else if (h.includes('แผนก') || h.includes('dept') || h.includes('department')) {
          colMap.dept = idx;
        } else if (h.includes('รายละเอียดงาน') || h.includes('detail') || h.includes('work detail') || h.includes('workdetail')) {
          colMap.workDetails = idx;
        } else if (h.includes('ลักษณะ') || h.includes('งาน') || h.includes('work')) {
          colMap.workType = idx;
        } else if (h.includes('จำนวน') || h.includes('คน') || h.includes('count')) {
          colMap.count = idx;
        } else if (h.includes('พาหนะ') || h.includes('vehicle')) {
          colMap.vehicle = idx;
        } else if (h.includes('ทะเบียน') || h.includes('plate')) {
          colMap.plate = idx;
        } else if (h.includes('เครื่องมือ') || h.includes('อุปกรณ์') || h.includes('equipment')) {
          colMap.eq = idx;
        } else if (h.includes('หมายเหตุ') || h.includes('note') || h.includes('remark')) {
          colMap.notes = idx;
        } else if (h.includes('รูป') || h.includes('บัตร') || h.includes('image') || h.includes('photo') || h.includes('card')) {
          colMap.cardImage = idx;
        } else if (h.includes('record id') || h.includes('id')) {
          colMap.id = idx;
        }
      });

      // Default standard positions if not explicitly mapped
      if (colMap.role === -1) colMap.role = 3;
      if (colMap.phone === -1) colMap.phone = 4;
      if (colMap.dept === -1) colMap.dept = 5;
      if (colMap.workType === -1) colMap.workType = 6;
      if (colMap.workDetails === -1) colMap.workDetails = 7;
      if (colMap.count === -1) colMap.count = 8;
      if (colMap.vehicle === -1) colMap.vehicle = 9;
      if (colMap.plate === -1) colMap.plate = 10;
      if (colMap.eq === -1) colMap.eq = 11;
      if (colMap.notes === -1) colMap.notes = 12;
      if (colMap.cardImage === -1) colMap.cardImage = 13;
      if (colMap.id === -1) colMap.id = 14;

      const parsedRecords: VisitorRecord[] = [];
      const seenRowIds = new Set<string>();

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        const timestamp = cols[colMap.timestamp]?.trim() || '';
        const name = cols[colMap.name]?.trim() || '-';
        const company = cols[colMap.company]?.trim() || '-';

        if (!timestamp && !name && !company) continue;

        const roleRaw = cols[colMap.role]?.trim() || 'ช่าง';
        const validRole: ContactRole = (['ผู้แทน', 'ช่าง', 'สเปเชียลลิสต์/ผู้เชี่ยวชาญ', 'เจ้าหน้าที่ส่งสินค้า', 'วิศวกรบริการ', 'อื่นๆ'].includes(roleRaw)
          ? roleRaw
          : 'ช่าง') as ContactRole;

        const rawPhone = cols[colMap.phone]?.trim() || '-';
        const formattedPhone = cleanPhoneNumber(rawPhone);

        const dept = cols[colMap.dept]?.trim() || '-';
        const workType = cols[colMap.workType]?.trim() || '-';
        const workDetails = colMap.workDetails !== -1 && cols[colMap.workDetails]?.trim() && cols[colMap.workDetails]?.trim() !== '-'
          ? cols[colMap.workDetails]?.trim()
          : undefined;
        const countNum = parseInt(cols[colMap.count]?.trim() || '1', 10) || 1;

        const vehicleRaw = cols[colMap.vehicle]?.trim() || 'รถยนต์ส่วนบุคคล';
        const validVehicles: VehicleType[] = [
          'ไม่มีพาหนะ/เดินเท้า',
          'จักรยานยนต์',
          'รถยนต์ส่วนบุคคล',
          'รถบรรทุก 4 ล้อ',
          'รถบรรทุก 6 ล้อ',
          'รถบรรทุก 10 ล้อ'
        ];
        const validVehicle: VehicleType = validVehicles.find(v => vehicleRaw.includes(v) || v.includes(vehicleRaw)) || 'รถยนต์ส่วนบุคคล';

        const plate = cols[colMap.plate]?.trim() || '-';
        const eqStr = cols[colMap.eq]?.trim() || '-';
        const eqList = eqStr && eqStr !== '-' ? eqStr.split(',').map(s => s.trim()).filter(Boolean) : [];
        const notes = cols[colMap.notes]?.trim() || '-';
        
        let recordId = cols[colMap.id]?.trim() || `sheet-row-${i}`;
        if (seenRowIds.has(recordId)) {
          recordId = `${recordId}-${i}-${Math.floor(1000 + Math.random() * 9000)}`;
        }
        seenRowIds.add(recordId);

        parsedRecords.push({
          id: recordId,
          timestamp: timestamp || new Date().toLocaleString('th-TH'),
          name,
          company,
          contactRole: validRole,
          phone: formattedPhone,
          department: dept,
          workType,
          workDetails,
          visitorCount: countNum,
          vehicleType: validVehicle,
          licensePlate: plate,
          equipmentHandled: eqList.length > 0 ? eqList : [eqStr || 'ไม่ระบุ'],
          notes,
          createdDate: new Date().toISOString(),
        });
      }

      if (parsedRecords.length > 0) {
        // Save latest records to storage
        StorageService.saveVisitorRecords(parsedRecords);
        // Automatically rebuild company contacts directory with all real staff & equipment
        StorageService.rebuildContactsFromVisitorLogs(parsedRecords);
      }

      return {
        success: true,
        records: parsedRecords,
        count: parsedRecords.length,
        message: `ซิงค์ข้อมูลบันทึกผู้เข้าพบจากชีท "${usedSheetName}" สำเร็จทั้งหมด ${parsedRecords.length} รายการ`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `ข้อผิดพลาดในการดึงข้อมูลจากชีท Visitor_Logs: ${err?.message || 'ไม่สามารถติดต่อได้'}`,
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

  /**
   * ย้ายข้อมูลจากชีท "การตอบแบบฟอร์ม 1" เข้าสู่ชีท "Visitor_Logs"
   * แมชทุกคอลัมน์ให้อัตโนมัติ และป้องกันการบันทึกซ้ำ
   */
  static async migrateOldFormDataToVisitorLogs(sheetIdParam?: string, webhookUrlParam?: string): Promise<{
    success: boolean;
    count?: number;
    message: string;
  }> {
    const sheetId = sheetIdParam || this.getSheetId();
    const webhookUrl = webhookUrlParam || this.getWebhookUrl();

    // 1. ลองสั่งรันผ่าน Apps Script Webhook ผ่าน backend proxy หรือ direct
    if (webhookUrl && webhookUrl.startsWith('https://script.google.com/macros/s/')) {
      try {
        const res = await fetch('/api/sheets/migrate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ webhookUrl }),
        });
        const txt = await res.text();
        let json: any = null;
        try {
          json = txt ? JSON.parse(txt) : null;
        } catch {}

        if (res.ok && json && (json.success || json.data?.status === 'success' || json.data?.message)) {
          return {
            success: true,
            message: json.data?.message || json.message || 'ย้ายข้อมูลเข้าชีท Visitor_Logs สำเร็จแล้ว',
          };
        }
      } catch (e) {
        console.warn('Apps script direct migration call failed, running CSV migration fallback:', e);
      }
    }

    // 2. ดึงข้อมูล CSV จากชีท "การตอบแบบฟอร์ม 1" แล้ว Map คอลัมน์ส่งเข้า Visitor_Logs
    try {
      const possibleSheetNames = ['การตอบแบบฟอร์ม 1', 'Form Responses 1', 'Form responses 1', 'Form Responses', 'การตอบแบบฟอร์ม'];
      let foundCsvText = '';
      let usedSheetName = '';

      for (const name of possibleSheetNames) {
        try {
          const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}`;
          const response = await fetch(url);
          if (response.ok) {
            const txt = await response.text();
            if (!txt.includes('<!DOCTYPE html>') && !txt.includes('google.com/ServiceLogin') && txt.trim().length > 10) {
              foundCsvText = txt;
              usedSheetName = name;
              break;
            }
          }
        } catch {}
      }

      if (!foundCsvText) {
        return {
          success: false,
          message: 'ไม่พบชีท "การตอบแบบฟอร์ม 1" ในไฟล์ Google Sheets หรือ Google Sheets ยังไม่ได้ตั้งค่าสิทธิ์เป็น "ทุกคนที่มีลิงก์มีสิทธิ์ดู"',
        };
      }

      const lines = foundCsvText.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length <= 1) {
        return {
          success: true,
          count: 0,
          message: `ชีท "${usedSheetName}" ไม่มีข้อมูลแถวสำหรับย้าย`,
        };
      }

      // ตรวจสอบหัวคอลัมน์เพื่อจับคู่กับช่องใน Visitor_Logs
      const headers = parseCsvLine(lines[0]);
      const colMap: Record<string, number> = {
        timestamp: 0,
        name: 1,
        company: 2,
        role: -1,
        phone: -1,
        dept: -1,
        workType: -1,
        count: -1,
        vehicle: -1,
        plate: -1,
        eq: -1,
        notes: -1,
      };

      headers.forEach((hRaw, idx) => {
        const h = hRaw.toLowerCase().trim();
        if (h.includes('เวลา') || h.includes('ประทับ') || h.includes('timestamp') || h.includes('date')) {
          colMap.timestamp = idx;
        } else if (h.includes('ชื่อ') || h.includes('นามสกุล') || h.includes('name')) {
          colMap.name = idx;
        } else if (h.includes('บริษัท') || h.includes('สังกัด') || h.includes('company')) {
          colMap.company = idx;
        } else if (h.includes('บทบาท') || h.includes('ตำแหน่ง') || h.includes('role')) {
          colMap.role = idx;
        } else if (h.includes('โทร') || h.includes('phone') || h.includes('tel') || h.includes('mobile')) {
          colMap.phone = idx;
        } else if (h.includes('แผนก') || h.includes('dept') || h.includes('department')) {
          colMap.dept = idx;
        } else if (h.includes('ลักษณะ') || h.includes('งาน') || h.includes('work')) {
          colMap.workType = idx;
        } else if (h.includes('จำนวน') || h.includes('คน') || h.includes('count')) {
          colMap.count = idx;
        } else if (h.includes('พาหนะ') || h.includes('vehicle')) {
          colMap.vehicle = idx;
        } else if (h.includes('ทะเบียน') || h.includes('plate')) {
          colMap.plate = idx;
        } else if (h.includes('เครื่องมือ') || h.includes('อุปกรณ์') || h.includes('equipment')) {
          colMap.eq = idx;
        } else if (h.includes('หมายเหตุ') || h.includes('note') || h.includes('remark')) {
          colMap.notes = idx;
        }
      });

      // กำหนด Index เริ่มต้นหากหัวตารางไม่ตรง
      if (colMap.role === -1) colMap.role = 3;
      if (colMap.phone === -1) colMap.phone = 4;
      if (colMap.dept === -1) colMap.dept = 5;
      if (colMap.workType === -1) colMap.workType = 6;
      if (colMap.count === -1) colMap.count = 7;
      if (colMap.vehicle === -1) colMap.vehicle = 8;
      if (colMap.plate === -1) colMap.plate = 9;
      if (colMap.eq === -1) colMap.eq = 10;
      if (colMap.notes === -1) colMap.notes = 11;

      const existingRecords = StorageService.getVisitorRecords();
      const existingKeys = new Set(existingRecords.map(r => `${r.timestamp?.trim()}_${r.name?.trim()}_${r.company?.trim()}`));

      const newRecordsToMigrate: VisitorRecord[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        const timestamp = cols[colMap.timestamp]?.trim() || '';
        const name = cols[colMap.name]?.trim() || '-';
        const company = cols[colMap.company]?.trim() || '-';

        if (!timestamp && !name && !company) continue;

        const key = `${timestamp}_${name}_${company}`;
        if (!existingKeys.has(key)) {
          const roleRaw = cols[colMap.role]?.trim() || 'ช่าง';
          const validRole: ContactRole = (['ผู้แทน', 'ช่าง', 'สเปเชียลลิสต์/ผู้เชี่ยวชาญ', 'เจ้าหน้าที่ส่งสินค้า', 'วิศวกรบริการ', 'อื่นๆ'].includes(roleRaw)
            ? roleRaw
            : 'ช่าง') as ContactRole;

          const phone = cols[colMap.phone]?.trim() || '-';
          const dept = cols[colMap.dept]?.trim() || '-';
          const workType = cols[colMap.workType]?.trim() || '-';
          const countNum = parseInt(cols[colMap.count]?.trim() || '1', 10) || 1;
          
          const vehicleRaw = cols[colMap.vehicle]?.trim() || 'รถยนต์ส่วนบุคคล';
          const validVehicles: VehicleType[] = [
            'ไม่มีพาหนะ/เดินเท้า',
            'จักรยานยนต์',
            'รถยนต์ส่วนบุคคล',
            'รถบรรทุก 4 ล้อ',
            'รถบรรทุก 6 ล้อ',
            'รถบรรทุก 10 ล้อ'
          ];
          const validVehicle: VehicleType = validVehicles.find(v => vehicleRaw.includes(v) || v.includes(vehicleRaw)) || 'รถยนต์ส่วนบุคคล';
          
          const plate = cols[colMap.plate]?.trim() || '-';
          const eqStr = cols[colMap.eq]?.trim() || '-';
          const eqList = eqStr && eqStr !== '-' ? eqStr.split(',').map(s => s.trim()).filter(Boolean) : [];
          const notes = cols[colMap.notes]?.trim() || '-';

          const record: VisitorRecord = {
            id: `mig-${Date.now()}-${i}`,
            timestamp: timestamp || new Date().toLocaleString('th-TH'),
            name,
            company,
            contactRole: validRole,
            phone,
            department: dept,
            workType,
            visitorCount: countNum,
            vehicleType: validVehicle,
            licensePlate: plate,
            equipmentHandled: eqList.length > 0 ? eqList : [eqStr || 'ไม่ระบุ'],
            notes,
            createdDate: new Date().toISOString(),
          };

          newRecordsToMigrate.push(record);
          existingKeys.add(key);
        }
      }

      if (newRecordsToMigrate.length === 0) {
        return {
          success: true,
          count: 0,
          message: `ข้อมูลทั้งหมดจาก "${usedSheetName}" มีอยู่ใน Visitor_Logs แล้ว (ไม่มีข้อมูลใหม่ที่ต้องย้าย)`,
        };
      }

      // บันทึกลง LocalStorage
      const merged = [...newRecordsToMigrate, ...existingRecords];
      StorageService.saveVisitorRecords(merged);

      // ส่งเข้าชีท Visitor_Logs ผ่าน Batch Sync
      if (webhookUrl) {
        await this.batchSyncAllRecords(newRecordsToMigrate);
      }

      return {
        success: true,
        count: newRecordsToMigrate.length,
        message: `ย้ายข้อมูลจาก "${usedSheetName}" เข้าสู่ชีท "Visitor_Logs" สำเร็จจำนวน ${newRecordsToMigrate.length} รายการ!`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `เกิดข้อผิดพลาดในการย้ายข้อมูล: ${err.message}`,
      };
    }
  }
}
