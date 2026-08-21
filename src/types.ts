export interface SourceTypes {
  visionPolicy: boolean;
  satisfactionSurvey: boolean;
  riskReview: boolean;
  staffSuggestion: boolean;
  internalAudit: boolean;
  internalAuditNo: string;
  complaint: boolean;
  complaintNo: string;
  kpiUnmet: boolean;
  other: boolean;
  otherDetail: string;
}

export interface BenefitsReceived {
  increaseSatisfaction: boolean;
  internalCommEfficiency: boolean;
  reduceErrors: boolean;
  staffSkill: boolean;
  efficientResource: boolean;
  staffSatisfaction: boolean;
  reduceComplications: boolean;
  treatmentOutcome: boolean;
  increaseSpeed: boolean;
  increaseSafety: boolean;
  increaseValue: boolean;
  costReduction: boolean;
  costReductionAmount: string;
  revenueIncrease: boolean;
  revenueIncreaseAmount: string;
  other: boolean;
  otherDetail: string;
  otherBenefit?: boolean;
  otherBenefitDetail?: string;
}

export interface Obstacles {
  dataCollection: string;
  kpiCollection: string;
  findingSolutions: string;
  other: string;
}

export interface ClosureOpinion {
  closeApproved: boolean;
  reliableData: boolean;
  studyMore: boolean;
  studyMoreDetail: string;
  expandProcess: boolean;
  other: boolean;
  otherDetail: string;
}

export interface CPIFormData {
  id: string;
  docNo: string; // เลขที่โครงการ
  docDate: string; // วัน/เดือน/ปี ขอดำเนินการ
  department: string; // ฝ่าย/แผนก/หน่วยงาน
  projectTitle: string; // ชื่อโครงการ
  
  // ประเภทโครงการ (เลือกได้)
  projectType: ('IA' | 'PIP' | 'BIP')[];
  
  // ประเภทการพัฒนา (เลือกได้)
  developmentType: ('clinical' | 'service_process' | 'mini_research')[];
  
  // ที่มาโครงการ
  sourceTypes: SourceTypes;
  
  // ส่วนที่ 2: รายละเอียดโครงการ
  problemStatement: string; // 1. สถานการณ์ปัญหา/โอกาสพัฒนา
  goal: string; // 2. เป้าหมาย
  kpiAndTarget: string; // 3. ตัวชี้วัด (KPI) และ target
  improvementSteps: string; // 4. ขั้นตอนการปรับปรุง/เปลี่ยนแปลงกระบวนการ (Bullet)
  startDate: string; // 5. วันที่เริ่มต้น
  endDate: string; // 5. วันที่สิ้นสุดโครงการ
  expectedBenefits: string; // 6. ประโยชน์ที่คาดว่าจะได้รับ
  budget: string; // 7. งบประมาณ (ถ้ามี)
  
  // ลายเซ็นส่วนที่ 1
  proposerSignature: string; // base64
  proposerName: string;
  proposerDate: string;
  
  deptHeadOpinion: 'approve' | 'disapprove' | null;
  deptHeadSignature: string; // base64
  deptHeadName: string;
  deptHeadPosition: string;
  deptHeadDate: string;
  
  // ส่วนที่ 3: รายงานผลการพัฒนาผลสัมฤทธิ์ของงาน (หน้า 2)
  resultsKPI: string; // 1.1 ผลลัพธ์ KPI
  resultsOther: string; // 1.2 ผลลัพธ์อื่นๆ
  
  benefitsReceived: BenefitsReceived;
  obstacles: Obstacles;
  recommendationsExpansion: string; // 4. ข้อเสนอแนะ / การขยายผลโครงการ
  
  // ลายเซ็นส่วนที่ 3
  projectOwnerSignaturePage2: string; // base64
  projectOwnerNamePage2: string;
  projectOwnerDatePage2: string;
  
  closureOpinion: ClosureOpinion;
  approverSignature: string; // base64
  approverName: string;
  approverDate: string;
  
  status: 'draft' | 'pending_approval' | 'approved_closed';
  createdAt: string;
  updatedAt: string;
}

export type AutoFillSection = 'all' | 'problem' | 'goal' | 'kpis' | 'steps' | 'benefits' | 'results' | 'obstacles';
