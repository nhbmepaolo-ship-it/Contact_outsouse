import {
  VisitorRecord,
  CompanyContact,
  DepartmentInfo,
  EquipmentInfo,
  TelegramConfig
} from '../types';
import {
  INITIAL_VISITOR_RECORDS,
  INITIAL_DEPARTMENTS,
  INITIAL_EQUIPMENT,
  buildInitialContacts
} from '../data/initialData';
import { INITIAL_COMPANIES_FROM_SHEET } from '../data/sheetCompanies';
import { applyImageRetentionPolicy } from '../utils/imageRetention';
import { DEFAULT_TELEGRAM_CONFIG } from './telegramService';
import { cleanPhoneNumber } from '../utils/phoneFormatter';

const STORAGE_KEYS = {
  VISITORS: 'bme_visitor_records_v2',
  CONTACTS: 'bme_company_contacts_v2',
  DEPARTMENTS: 'bme_departments_v3',
  EQUIPMENTS: 'bme_equipments_v3',
  SHEET_COMPANIES: 'bme_sheet_companies_v1',
  TELEGRAM: 'bme_telegram_config_v2',
  ADMIN_AUTH: 'bme_admin_authenticated_v2',
};

const DUMMY_NAMES_OR_COMPANIES = new Set([
  'มีจะกิน',
  'มีจะกิน จำกัด',
  'พอดีคำ',
  'ซื่อตรง ใจดี',
  'ซื่อตรง ใจซื่อดี',
  'มาลี มีเงิน'
]);

function isDummyOrPurged(company?: string, name?: string): boolean {
  const c = (company || '').trim().toLowerCase();
  const n = (name || '').trim().toLowerCase();
  return (
    DUMMY_NAMES_OR_COMPANIES.has(company || '') ||
    DUMMY_NAMES_OR_COMPANIES.has(name || '') ||
    c.includes('มีจะกิน') ||
    c.includes('พอดีคำ') ||
    n.includes('ซื่อตรง ใจดี') ||
    n.includes('ซื่อตรง ใจซื่อดี') ||
    n.includes('มาลี มีเงิน')
  );
}

export class StorageService {
  // ================= VISITOR RECORDS =================

  static getVisitorRecords(): VisitorRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.VISITORS);
      if (!data) {
        // Prepopulate with initial data and apply retention policy
        const initial = applyImageRetentionPolicy(INITIAL_VISITOR_RECORDS).filter(
          r => !isDummyOrPurged(r.company, r.name)
        );
        this.saveVisitorRecords(initial);
        return initial;
      }
      const parsed: VisitorRecord[] = JSON.parse(data);
      // Filter out any dummy test rows that may have persisted in older sessions
      const clean = parsed.filter(r => !isDummyOrPurged(r.company, r.name));
      if (clean.length !== parsed.length) {
        this.saveVisitorRecords(clean);
      }
      // Run retention policy whenever reading
      const withRetention = applyImageRetentionPolicy(clean);
      return withRetention;
    } catch (e) {
      console.error('Error reading visitor records from storage:', e);
      return applyImageRetentionPolicy(INITIAL_VISITOR_RECORDS).filter(
        r => !isDummyOrPurged(r.company, r.name)
      );
    }
  }

  static saveVisitorRecords(records: VisitorRecord[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.VISITORS, JSON.stringify(records));
    } catch (e) {
      console.error('Error saving visitor records:', e);
    }
  }

  static addVisitorRecord(newRecord: Omit<VisitorRecord, 'id'>): VisitorRecord {
    const records = this.getVisitorRecords();
    const id = `vis-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const fullRecord: VisitorRecord = {
      ...newRecord,
      phone: cleanPhoneNumber(newRecord.phone),
      id,
      createdDate: newRecord.createdDate || new Date().toISOString(),
      isImageExpired: false,
    };

    const updated = [fullRecord, ...records];
    this.saveVisitorRecords(updated);

    // Synchronize to Company Contacts Directory smartly (Deduplication + Aggregation)
    this.syncVisitorToCompanyContact(fullRecord);

    return fullRecord;
  }

  static deleteVisitorRecord(id: string): void {
    const records = this.getVisitorRecords();
    const recordToDelete = records.find(r => r.id === id);
    const filtered = records.filter(r => r.id !== id);
    this.saveVisitorRecords(filtered);

    // Also update company contacts if this was a registered contact
    if (recordToDelete) {
      this.recalculateContactsAfterVisitorDeletion(recordToDelete, filtered);
    }
  }

  /**
   * Keep contacts directory accurate when a visitor log is removed
   */
  static recalculateContactsAfterVisitorDeletion(deletedRecord: VisitorRecord, remainingVisitors: VisitorRecord[]): void {
    try {
      const contacts = this.getCompanyContacts();
      const comp = deletedRecord.company.trim().toLowerCase();
      const name = deletedRecord.name.trim().toLowerCase();

      const matchingRemaining = remainingVisitors.filter(
        v => v.company.trim().toLowerCase() === comp && v.name.trim().toLowerCase() === name
      );

      const contactIndex = contacts.findIndex(
        c => c.companyName.trim().toLowerCase() === comp && c.contactName.trim().toLowerCase() === name
      );

      if (contactIndex >= 0) {
        if (matchingRemaining.length === 0) {
          // No more visits from this person, remove from contacts directory
          contacts.splice(contactIndex, 1);
        } else {
          // Recalculate stats from remaining
          const mergedEq = new Set<string>();
          matchingRemaining.forEach(v => {
            (v.equipmentHandled || []).forEach(e => mergedEq.add(e));
          });
          contacts[contactIndex].visitCount = matchingRemaining.length;
          contacts[contactIndex].lastVisit = matchingRemaining[0].timestamp;
          contacts[contactIndex].equipmentList = Array.from(mergedEq);
        }
        this.saveCompanyContacts(contacts);
      }
    } catch (e) {
      console.error('Error updating contacts after deletion:', e);
    }
  }

  // ================= COMPANY CONTACTS (DEDUPLICATION & AGGREGATION) =================

  static getCompanyContacts(): CompanyContact[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CONTACTS);
      if (!data) {
        const initial = buildInitialContacts(INITIAL_VISITOR_RECORDS).filter(
          c => !isDummyOrPurged(c.companyName, c.contactName)
        );
        this.saveCompanyContacts(initial);
        return initial;
      }
      const parsed: CompanyContact[] = JSON.parse(data);
      const clean = parsed.filter(c => !isDummyOrPurged(c.companyName, c.contactName));
      if (clean.length !== parsed.length) {
        this.saveCompanyContacts(clean);
      }
      return clean;
    } catch (e) {
      console.error('Error reading company contacts:', e);
      return buildInitialContacts(INITIAL_VISITOR_RECORDS).filter(
        c => !isDummyOrPurged(c.companyName, c.contactName)
      );
    }
  }

  static saveCompanyContacts(contacts: CompanyContact[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(contacts));
    } catch (e) {
      console.error('Error saving company contacts:', e);
    }
  }

  /**
   * Rebuild and synchronize company contacts directory directly from all visitor records
   */
  static rebuildContactsFromVisitorLogs(records: VisitorRecord[]): CompanyContact[] {
    const contacts = buildInitialContacts(records).filter(
      c => !isDummyOrPurged(c.companyName, c.contactName)
    );
    this.saveCompanyContacts(contacts);
    return contacts;
  }

  /**
   * Smart Sync: If a contact exists with the same company and name:
   * - If they handle new equipment, add it to their equipment list (aggregating multiple machines)
   * - If they already handle that exact equipment, update last visit without duplicating the contact entry!
   */
  static syncVisitorToCompanyContact(visitor: VisitorRecord): void {
    const contacts = this.getCompanyContacts();
    const compName = visitor.company.trim().toLowerCase();
    const contName = visitor.name.trim().toLowerCase();

    const existingIndex = contacts.findIndex(
      c => c.companyName.trim().toLowerCase() === compName && c.contactName.trim().toLowerCase() === contName
    );

    if (existingIndex >= 0) {
      const existing = contacts[existingIndex];
      const mergedEquipments = new Set(existing.equipmentList || []);
      for (const eq of visitor.equipmentHandled || []) {
        if (eq) mergedEquipments.add(eq);
      }

      const mergedDepts = new Set(existing.departmentsCovered || []);
      if (visitor.department) mergedDepts.add(visitor.department);

      contacts[existingIndex] = {
        ...existing,
        role: visitor.contactRole || existing.role,
        phone: visitor.phone || existing.phone,
        equipmentList: Array.from(mergedEquipments),
        departmentsCovered: Array.from(mergedDepts),
        lastVisit: visitor.timestamp,
        visitCount: (existing.visitCount || 1) + 1,
        notes: `ดูแลเครื่องมือ (${mergedEquipments.size} รายการ): ${Array.from(mergedEquipments).join(', ')}`
      };
    } else {
      const newContact: CompanyContact = {
        id: `contact-${Date.now()}`,
        companyName: visitor.company,
        contactName: visitor.name,
        role: visitor.contactRole || 'ช่าง',
        phone: visitor.phone,
        equipmentList: [...(visitor.equipmentHandled || [])],
        departmentsCovered: visitor.department ? [visitor.department] : [],
        lastVisit: visitor.timestamp,
        visitCount: 1,
        notes: visitor.equipmentHandled && visitor.equipmentHandled.length > 0
          ? `ดูแลเครื่องมือ: ${visitor.equipmentHandled.join(', ')}`
          : undefined
      };
      contacts.unshift(newContact);
    }

    this.saveCompanyContacts(contacts);
  }

  /**
   * Manual Add / Update from Admin Contact form
   */
  static upsertCompanyContact(contact: Omit<CompanyContact, 'id'> & { id?: string }): {
    success: boolean;
    isDuplicateEquipment?: boolean;
    contact: CompanyContact;
    message: string;
  } {
    const contacts = this.getCompanyContacts();
    const compName = contact.companyName.trim().toLowerCase();
    const contName = contact.contactName.trim().toLowerCase();

    const existingIndex = contacts.findIndex(c =>
      (contact.id && c.id === contact.id) ||
      (!contact.id && c.companyName.trim().toLowerCase() === compName && c.contactName.trim().toLowerCase() === contName)
    );

    if (existingIndex >= 0) {
      const existing = contacts[existingIndex];
      const existingEquipments = new Set(existing.equipmentList || []);
      let hasNewEquipment = false;

      for (const eq of contact.equipmentList || []) {
        if (!existingEquipments.has(eq)) {
          existingEquipments.add(eq);
          hasNewEquipment = true;
        }
      }

      const updated: CompanyContact = {
        ...existing,
        ...contact,
        id: existing.id,
        equipmentList: Array.from(existingEquipments),
        visitCount: existing.visitCount,
        lastVisit: contact.lastVisit || existing.lastVisit,
      };

      contacts[existingIndex] = updated;
      this.saveCompanyContacts(contacts);

      return {
        success: true,
        isDuplicateEquipment: !hasNewEquipment,
        contact: updated,
        message: hasNewEquipment
          ? 'อัปเดตข้อมูลและเพิ่มรายการเครื่องมือแพทย์ที่ดูแลเรียบร้อยแล้ว'
          : 'ผู้ติดต่อรายนี้ดูแลเครื่องมือดังกล่าวอยู่แล้ว (อัปเดตข้อมูลทั่วไปเรียบร้อย ไม่สร้างรายการซ้ำ)',
      };
    } else {
      const newContact: CompanyContact = {
        ...contact,
        id: contact.id || `contact-${Date.now()}`,
        visitCount: contact.visitCount || 1,
      };
      contacts.unshift(newContact);
      this.saveCompanyContacts(contacts);

      return {
        success: true,
        contact: newContact,
        message: 'บันทึกผู้ติดต่อบริษัทใหม่เรียบร้อยแล้ว',
      };
    }
  }

  static deleteCompanyContact(id: string): void {
    const contacts = this.getCompanyContacts();
    const filtered = contacts.filter(c => c.id !== id);
    this.saveCompanyContacts(filtered);
  }

  // ================= MASTER DATA: DEPARTMENTS & EQUIPMENT =================

  static getDepartments(): DepartmentInfo[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DEPARTMENTS);
      if (!data) {
        this.saveDepartments(INITIAL_DEPARTMENTS);
        return INITIAL_DEPARTMENTS;
      }
      const parsed: DepartmentInfo[] = JSON.parse(data);
      // Clean any legacy "คู่สัญญา" strings
      const cleaned = parsed.map(d => ({
        ...d,
        buildingFloor: (d.buildingFloor && d.buildingFloor.includes('คู่สัญญา')) ? '' : d.buildingFloor
      }));
      return cleaned;
    } catch {
      return INITIAL_DEPARTMENTS;
    }
  }

  static saveDepartments(depts: DepartmentInfo[]): void {
    localStorage.setItem(STORAGE_KEYS.DEPARTMENTS, JSON.stringify(depts));
  }

  // ================= SHEET COMPANIES (COLUMN A FROM DATA_BASE) =================

  static getSheetCompanies(): string[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SHEET_COMPANIES);
      if (!data) {
        this.saveSheetCompanies(INITIAL_COMPANIES_FROM_SHEET);
        return INITIAL_COMPANIES_FROM_SHEET;
      }
      const parsed: string[] = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      return INITIAL_COMPANIES_FROM_SHEET;
    } catch {
      return INITIAL_COMPANIES_FROM_SHEET;
    }
  }

  static saveSheetCompanies(companies: string[]): void {
    const cleanList = Array.from(new Set(companies.map(c => c.trim()).filter(Boolean)));
    localStorage.setItem(STORAGE_KEYS.SHEET_COMPANIES, JSON.stringify(cleanList));
  }

  static getEquipment(): EquipmentInfo[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EQUIPMENTS);
      if (!data) {
        this.saveEquipment(INITIAL_EQUIPMENT);
        return INITIAL_EQUIPMENT;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_EQUIPMENT;
    }
  }

  static saveEquipment(eqList: EquipmentInfo[]): void {
    localStorage.setItem(STORAGE_KEYS.EQUIPMENTS, JSON.stringify(eqList));
  }

  // ================= TELEGRAM CONFIG =================

  static getTelegramConfig(): TelegramConfig {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TELEGRAM);
      if (!data) return DEFAULT_TELEGRAM_CONFIG;
      return { ...DEFAULT_TELEGRAM_CONFIG, ...JSON.parse(data) };
    } catch {
      return DEFAULT_TELEGRAM_CONFIG;
    }
  }

  static saveTelegramConfig(config: TelegramConfig): void {
    localStorage.setItem(STORAGE_KEYS.TELEGRAM, JSON.stringify(config));
  }

  // ================= ADMIN AUTHENTICATION STATE =================

  static isAdminAuthenticated(): boolean {
    try {
      return sessionStorage.getItem(STORAGE_KEYS.ADMIN_AUTH) === 'true';
    } catch {
      return false;
    }
  }

  static setAdminAuthenticated(auth: boolean): void {
    try {
      if (auth) {
        sessionStorage.setItem(STORAGE_KEYS.ADMIN_AUTH, 'true');
      } else {
        sessionStorage.removeItem(STORAGE_KEYS.ADMIN_AUTH);
      }
    } catch (e) {
      console.error(e);
    }
  }

  // ================= RESET / RESTORE DEFAULT =================

  static resetToDefaultData(): void {
    localStorage.removeItem(STORAGE_KEYS.VISITORS);
    localStorage.removeItem(STORAGE_KEYS.CONTACTS);
    localStorage.removeItem(STORAGE_KEYS.DEPARTMENTS);
    localStorage.removeItem(STORAGE_KEYS.EQUIPMENTS);
    this.getVisitorRecords();
    this.getCompanyContacts();
    this.getDepartments();
    this.getEquipment();
  }
}
