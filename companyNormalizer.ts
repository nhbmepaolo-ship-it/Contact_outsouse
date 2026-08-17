import { CompanyContact } from '../types';

/**
 * Known aliases / synonym mappings between English & Thai company names
 */
const COMPANY_SYNONYMS: Record<string, string> = {
  // Double U Tech
  'double u tech': 'Double U Tech (ดับเบิ้ลยู เทค)',
  'doubleutech': 'Double U Tech (ดับเบิ้ลยู เทค)',
  'ดับเบิ้ลยู เทค': 'Double U Tech (ดับเบิ้ลยู เทค)',
  'ดับเบิ้ล ยู เทค': 'Double U Tech (ดับเบิ้ลยู เทค)',
  'ดับเบิ้ลยูเทค': 'Double U Tech (ดับเบิ้ลยู เทค)',

  // Olympus
  'olympus': 'Olympus (โอลิมปัส)',
  'โอลิมปัส': 'Olympus (โอลิมปัส)',

  // Philips
  'philips': 'Philips (ฟิลิปส์)',
  'ฟิลิปส์': 'Philips (ฟิลิปส์)',
  'ฟิลิป': 'Philips (ฟิลิปส์)',

  // Xovic
  'xovic': 'Xovic (โซวิค)',
  'โซวิค': 'Xovic (โซวิค)',

  // GE Healthcare
  'ge healthcare': 'GE Healthcare (จีอี เฮลธ์แคร์)',
  'ge': 'GE Healthcare (จีอี เฮลธ์แคร์)',
  'จีอี': 'GE Healthcare (จีอี เฮลธ์แคร์)',

  // Draeger
  'draeger': 'Draeger (ดราเกอร์)',
  'ดราเกอร์': 'Draeger (ดราเกอร์)',

  // Zeiss / Carl Zeiss
  'zeiss': 'Carl Zeiss (คาร์ล ไซส์)',
  'carl zeiss': 'Carl Zeiss (คาร์ล ไซส์)',
  'ไซส์': 'Carl Zeiss (คาร์ล ไซส์)',

  // Getinge
  'getinge': 'Getinge (เกทิงเกะ)',
  'เกทิงเกะ': 'Getinge (เกทิงเกะ)',
  'เกทิงเก': 'Getinge (เกทิงเกะ)',

  // B.Braun
  'b.braun': 'B.Braun (บี. บราวน์)',
  'b. braun': 'B.Braun (บี. บราวน์)',
  'บี. บราวน์': 'B.Braun (บี. บราวน์)',
  'บี บราวน์': 'B.Braun (บี. บราวน์)',
  'บี.บราวน์': 'B.Braun (บี. บราวน์)',

  // Paramount Bed
  'paramount bed': 'Paramount Bed (พาราเมาท์ เบด)',
  'paramountbed': 'Paramount Bed (พาราเมาท์ เบด)',
  'พาราเมาท์ เบด': 'Paramount Bed (พาราเมาท์ เบด)',
  'พาราเมาท์': 'Paramount Bed (พาราเมาท์ เบด)',

  // Bayer
  'bayer': 'Bayer (ไบเออร์)',
  'ไบเออร์': 'Bayer (ไบเออร์)',

  // SMKT
  'smkt': 'SMKT (เอสเอ็มเคที)',
  'smkt thailand': 'SMKT (เอสเอ็มเคที)',
  'เอสเอ็มเคที': 'SMKT (เอสเอ็มเคที)',

  // Kainatic / EndoSMART
  'kainatic': 'Kainatic / EndoSMART (ไกเนติค)',
  'ไกเนติค': 'Kainatic / EndoSMART (ไกเนติค)',
  'endosmart': 'Kainatic / EndoSMART (ไกเนติค)',
  'เอนโดสมาร์ท': 'Kainatic / EndoSMART (ไกเนติค)',

  // Transmedic
  'transmedic': 'Transmedic (ทรานส์เมดิคอล)',
  'ทรานส์เมดิคอล': 'Transmedic (ทรานส์เมดิคอล)',

  // Dentsply Sirona
  'dentsply sirona': 'Dentsply Sirona (เดนท์สพลาย ซิโรน่า)',
  'เดนท์สพลาย ซิโรน่า': 'Dentsply Sirona (เดนท์สพลาย ซิโรน่า)',
  'sirona': 'Dentsply Sirona (เดนท์สพลาย ซิโรน่า)',

  // Allwell Life
  'allwell': 'Allwell Life (ออลล์เวลไลฟ์)',
  'ออลล์เวลไลฟ์': 'Allwell Life (ออลล์เวลไลฟ์)',
  'ออลล์เวล ไลฟ์': 'Allwell Life (ออลล์เวลไลฟ์)',

  // Nhealth
  'nhealth': 'N Health (เอ็นเฮลท์)',
  'เอ็นเฮลท์': 'N Health (เอ็นเฮลท์)',
  'เอ็น เฮลท์': 'N Health (เอ็นเฮลท์)',

  // Prime Medical
  'prime medical': 'Prime Medical (ไพรม์ เมดิคอล)',
  'ไพรม์ เมดิคอล': 'Prime Medical (ไพรม์ เมดิคอล)',
  'ไพรม์เมดิคอล': 'Prime Medical (ไพรม์ เมดิคอล)',

  // CMC
  'cmc': 'CMC (ซีเอ็มซี ไบโอเท็ค)',
  'ซีเอ็มซี': 'CMC (ซีเอ็มซี ไบโอเท็ค)',
  'ซีเอ็มซี ไบโอเท็ค': 'CMC (ซีเอ็มซี ไบโอเท็ค)',

  // Alcon
  'alcon': 'Alcon (อัลคอน)',
  'อัลคอน': 'Alcon (อัลคอน)',

  // Mindray
  'mindray': 'Mindray (มายด์เรย์)',
  'มายด์เรย์': 'Mindray (มายด์เรย์)',

  // St. Jude / Abbott
  'abbott': 'Abbott (แอ๊บบอต)',
  'แอ๊บบอต': 'Abbott (แอ๊บบอต)',

  // Laser Engineering
  'เลเซอร์ เอ็นจิเนียริ่ง': 'Laser Engineering (เลเซอร์ เอ็นจิเนียริ่ง)',
  'laser engineering': 'Laser Engineering (เลเซอร์ เอ็นจิเนียริ่ง)',
};

/**
 * Clean & simplify company name for group matching
 */
export function normalizeCompanyKey(rawName: string): string {
  if (!rawName) return 'unspecified';
  let s = rawName.toLowerCase().trim();

  // Strip common Thai company prefixes and suffixes
  s = s.replace(/^บริษัท\s*/g, '');
  s = s.replace(/^บจก\.\s*/g, '');
  s = s.replace(/^บมจ\.\s*/g, '');
  s = s.replace(/\s*จำกัด\s*\(มหาชน\)/g, '');
  s = s.replace(/\s*จำกัด/g, '');
  s = s.replace(/\s*\(ประเทศไทย\)/g, '');
  s = s.replace(/\s*\(thailand\)/g, '');
  s = s.replace(/\s*thailand\b/g, '');

  // Strip English corporate suffixes
  s = s.replace(/\s*co\.,\s*ltd\.?/g, '');
  s = s.replace(/\s*co\.,ltd\.?/g, '');
  s = s.replace(/\s*ltd\.?/g, '');
  s = s.replace(/\s*inc\.?/g, '');
  s = s.replace(/\s*corp\.?/g, '');
  s = s.replace(/\s*corporation/g, '');

  // Remove multiple spaces and punctuation
  s = s.replace(/[.,()]/g, ' ').replace(/\s+/g, ' ').trim();

  if (COMPANY_SYNONYMS[s]) {
    return COMPANY_SYNONYMS[s].toLowerCase();
  }

  // Check partial key matches
  for (const [alias, canonical] of Object.entries(COMPANY_SYNONYMS)) {
    if (s === alias || s.includes(alias) || alias.includes(s)) {
      if (s.length >= 3 && alias.length >= 3) {
        return canonical.toLowerCase();
      }
    }
  }

  return s || 'unspecified';
}

/**
 * Format primary display name for a company
 */
export function getCanonicalCompanyName(rawName: string): string {
  if (!rawName || rawName === '-') return 'ไม่ระบุบริษัท';
  const clean = rawName.trim();
  const key = normalizeCompanyKey(clean);

  // Check if we have a mapped canonical name
  for (const [_, canonical] of Object.entries(COMPANY_SYNONYMS)) {
    if (canonical.toLowerCase() === key) {
      return canonical;
    }
  }

  return clean;
}

export interface GroupedCompany {
  id: string;
  companyKey: string;
  companyName: string;
  aliases: string[];
  contacts: CompanyContact[];
  allEquipments: string[];
  allDepartments: string[];
  totalVisits: number;
  lastVisit: string;
}

/**
 * Groups contacts by Company so multiple employees/contacts of the same company
 * are displayed inside the SAME card/frame.
 */
export function groupContactsByCompany(contacts: CompanyContact[]): GroupedCompany[] {
  const map = new Map<string, GroupedCompany>();

  for (const c of contacts) {
    const rawComp = c.companyName || 'ไม่ระบุบริษัท';
    const key = normalizeCompanyKey(rawComp);

    if (!map.has(key)) {
      const canonicalName = getCanonicalCompanyName(rawComp);
      map.set(key, {
        id: `grp-${key.replace(/[^a-z0-9]/gi, '_')}`,
        companyKey: key,
        companyName: canonicalName,
        aliases: [rawComp],
        contacts: [c],
        allEquipments: [...(c.equipmentList || [])],
        allDepartments: [...(c.departmentsCovered || [])],
        totalVisits: c.visitCount || 1,
        lastVisit: c.lastVisit || '-',
      });
    } else {
      const group = map.get(key)!;

      // Add alias if different
      if (!group.aliases.includes(rawComp)) {
        group.aliases.push(rawComp);
      }

      // Check if contact is already in group (by contact name and phone)
      const existingContactIdx = group.contacts.findIndex(
        item => item.contactName.trim().toLowerCase() === c.contactName.trim().toLowerCase()
      );

      if (existingContactIdx >= 0) {
        // Merge existing contact info
        const existing = group.contacts[existingContactIdx];
        const mergedEq = new Set([...(existing.equipmentList || []), ...(c.equipmentList || [])]);
        const mergedDept = new Set([...(existing.departmentsCovered || []), ...(c.departmentsCovered || [])]);
        
        group.contacts[existingContactIdx] = {
          ...existing,
          role: c.role || existing.role,
          phone: c.phone || existing.phone,
          equipmentList: Array.from(mergedEq),
          departmentsCovered: Array.from(mergedDept),
          visitCount: Math.max(existing.visitCount || 1, c.visitCount || 1),
          lastVisit: c.lastVisit || existing.lastVisit,
        };
      } else {
        // Add new contact person to this company
        group.contacts.push(c);
      }

      // Aggregate company-wide equipment & departments
      (c.equipmentList || []).forEach(eq => {
        if (eq && !group.allEquipments.includes(eq)) {
          group.allEquipments.push(eq);
        }
      });
      (c.departmentsCovered || []).forEach(dept => {
        if (dept && !group.allDepartments.includes(dept)) {
          group.allDepartments.push(dept);
        }
      });

      group.totalVisits += (c.visitCount || 1);

      // Keep latest visit
      if (c.lastVisit && c.lastVisit !== '-') {
        group.lastVisit = c.lastVisit;
      }
    }
  }

  // Sort companies alphabetically by name
  return Array.from(map.values()).sort((a, b) => a.companyName.localeCompare(b.companyName, 'th'));
}
