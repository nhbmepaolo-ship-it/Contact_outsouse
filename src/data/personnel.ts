export interface StaffMember {
  name: string;
  position?: string;
}

export interface ApproverPreset {
  id: string;
  name: string;
  position: string;
  department: string;
  email: string;
  badge: string;
}

export const PROPOSER_OPTIONS: string[] = [
  'รัชณี มาจานิตย์',
  'ณัฐพร เสวิสิทธิ์',
  'สุพัตรา แก้วสุวรรณ์',
  'ไอยเรศ กิจจาชาญชัยกุล',
  'ศุภวัฒน์ เกตุมาน',
  'สุวภา เผือกพันธ์',
  'ทวีวัฒน์ ทุเครือ',
  'ธิติมา ภูช่างทอง',
  'กานต์ธิดา หามนตรี',
  'พรรณพัชร พิศพรรณ์',
  'เจตสิก อิ่มทั่ว',
  'ปิ่นมณี ทัสสะคัง',
  'สุธาทิพย์ เอี่ยมมี',
  'พิชญา นราพงศ์',
];

export const SUPERVISOR_APPROVER_OPTIONS: StaffMember[] = [
  { name: 'ชาลี เมฆสุวรรณ', position: 'ผู้จัดการแผนกวิศวกรรมการแพทย์' },
  { name: 'ภญ. พรรณพัชร พิศพรรณ์', position: 'ผู้อำนวยการศูนย์คุณภาพ QMS' },
  { name: 'ภก. สมชาย สายยา', position: 'หัวหน้าฝ่ายเภสัชกรรม' },
  { name: 'พว. วนิดา จิตบริการ', position: 'ผู้อำนวยการฝ่ายการพยาบาล' },
  { name: 'พญ. สุพัตรา แก้วสุวรรณ์', position: 'หัวหน้าแผนกผู้ป่วยนอก (OPD)' },
  { name: 'นพ. สมศักดิ์ คุณภาพ', position: 'ผู้อำนวยการฝ่ายการแพทย์' },
];

export const APPROVER_PRESETS: ApproverPreset[] = [
  {
    id: 'qms_head',
    name: 'ภญ. พรรณพัชร พิศพรรณ์',
    position: 'ผู้อำนวยการศูนย์คุณภาพ QMS',
    department: 'ศูนย์พัฒนาระบบคุณภาพ (QMS)',
    email: 'qms.phyathai@hospital.com',
    badge: 'ศูนย์คุณภาพ QMS',
  },
  {
    id: 'dept_head_eng',
    name: 'ชาลี เมฆสุวรรณ',
    position: 'ผู้จัดการแผนกวิศวกรรมการแพทย์',
    department: 'ฝ่ายวิศวกรรมและสนับสนุนการแพทย์',
    email: 'charlie.m@phyathai.com',
    badge: 'ผจก. วิศวกรรมการแพทย์',
  },
  {
    id: 'pharmacy_head',
    name: 'ภก. สมชาย สายยา',
    position: 'หัวหน้าฝ่ายเภสัชกรรม',
    department: 'ฝ่ายเภสัชกรรม (OPD/IPD)',
    email: 'pharmacy.head@phyathai.com',
    badge: 'หัวหน้าฝ่ายเภสัชกรรม',
  },
  {
    id: 'nursing_head',
    name: 'พว. วนิดา จิตบริการ',
    position: 'ผู้อำนวยการฝ่ายการพยาบาล',
    department: 'ฝ่ายการพยาบาล',
    email: 'nursing.head@phyathai.com',
    badge: 'ผู้อำนวยการการพยาบาล',
  },
  {
    id: 'opd_head',
    name: 'พญ. สุพัตรา แก้วสุวรรณ์',
    position: 'หัวหน้าแผนกผู้ป่วยนอก (OPD)',
    department: 'แผนกผู้ป่วยนอก (OPD)',
    email: 'opd.head@phyathai.com',
    badge: 'หัวหน้าแผนก OPD',
  },
  {
    id: 'medical_director',
    name: 'นพ. สมศักดิ์ คุณภาพ',
    position: 'ผู้อำนวยการฝ่ายการแพทย์',
    department: 'ฝ่ายการแพทย์',
    email: 'medical.director@phyathai.com',
    badge: 'ผอ. ฝ่ายการแพทย์',
  },
];

