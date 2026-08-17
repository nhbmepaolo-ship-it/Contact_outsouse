export type VehicleType =
  | 'ไม่มีพาหนะ/เดินเท้า'
  | 'จักรยานยนต์'
  | 'รถยนต์ส่วนบุคคล'
  | 'รถบรรทุก 4 ล้อ'
  | 'รถบรรทุก 6 ล้อ'
  | 'รถบรรทุก 10 ล้อ';

export type ContactRole =
  | 'ผู้แทน'
  | 'ช่าง'
  | 'สเปเชียลลิสต์/ผู้เชี่ยวชาญ'
  | 'เจ้าหน้าที่ส่งสินค้า'
  | 'วิศวกรบริการ'
  | 'อื่นๆ';

export interface VisitorRecord {
  id: string;
  timestamp: string; // e.g. "25/2/2025, 16:40:51"
  name: string;
  company: string;
  phone: string;
  department: string;
  workType: string;
  visitorCount: number;
  cardImageUrl?: string;
  vehicleType: VehicleType;
  licensePlate: string;
  equipmentHandled: string[];
  contactRole?: ContactRole;
  workDetails?: string;
  notes?: string;
  createdDate: string; // ISO string or timestamp
  isImageExpired?: boolean;
  imageExpireDate?: string;
}

export interface CompanyContact {
  id: string;
  companyName: string;
  contactName: string;
  role: ContactRole;
  phone: string;
  equipmentList: string[]; // Deduplicated list of all medical equipments managed
  departmentsCovered: string[];
  lastVisit?: string;
  visitCount: number;
  email?: string;
  notes?: string;
}

export interface DepartmentInfo {
  id: string;
  name: string;
  buildingFloor?: string;
  category?: string;
}

export interface EquipmentInfo {
  id: string;
  code: string;
  name: string;
  nameTh?: string; // ชื่อภาษาไทยตามหลักสากลวิศวกรรมการแพทย์ (คอลัมน์ D Name_EqupmentTH)
  brand?: string;
  category: string;
  department?: string;
  vendorCompany?: string;
}

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
  notifyOnNewVisitor: boolean;
  notifyOnUrgentRepair: boolean;
  lastTestStatus?: 'success' | 'error' | null;
  lastTestMessage?: string;
}

export interface DashboardStats {
  totalVisits: number;
  todayVisits: number;
  totalRepairs: number;
  totalPM: number;
  totalDemo: number;
  totalTraining: number;
  totalCompanies: number;
  totalUniquePeople: number;
  vehiclesCount: Record<string, number>;
  topDepartments: { name: string; count: number }[];
  topCompanies: { name: string; count: number }[];
  workTypeBreakdown: { name: string; count: number; percentage: number }[];
  monthlyTrends: { month: string; count: number }[];
}
