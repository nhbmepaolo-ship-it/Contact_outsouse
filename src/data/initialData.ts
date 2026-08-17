import { VisitorRecord, DepartmentInfo, EquipmentInfo, CompanyContact } from '../types';
import { translateMedicalEquipmentToThai } from '../utils/equipmentTranslator';

export const INITIAL_DEPARTMENTS: DepartmentInfo[] = [
  { id: 'dept-1', name: 'Physiotherapy', category: 'Rehabilitation', buildingFloor: 'อาคาร 1 ชั้น 2' },
  { id: 'dept-2', name: 'Operating Room', category: 'Surgical', buildingFloor: 'อาคาร 1 ชั้น 3' },
  { id: 'dept-3', name: 'Patient Wards 19', category: 'Inpatient', buildingFloor: 'อาคาร 1 ชั้น 19' },
  { id: 'dept-4', name: 'X-Ray', category: 'Radiology', buildingFloor: 'อาคาร 1 ชั้น 1' },
  { id: 'dept-5', name: 'Check Up Center', category: 'Preventive', buildingFloor: 'อาคาร 2 ชั้น 1' },
  { id: 'dept-6', name: 'General Medicine', category: 'OPD', buildingFloor: 'อาคาร 1 ชั้น 2' },
  { id: 'dept-7', name: 'Diabetes Melitus & Endocrine Center', category: 'Specialized', buildingFloor: 'อาคาร 2 ชั้น 2' },
  { id: 'dept-8', name: 'Heart Center', category: 'Cardiology', buildingFloor: 'อาคาร 2 ชั้น 2' },
  { id: 'dept-9', name: 'Eye Clinic', category: 'OPD Specialized', buildingFloor: 'อาคาร 1 ชั้น 2' },
  { id: 'dept-10', name: 'Skin', category: 'OPD Specialized', buildingFloor: 'อาคาร 2 ชั้น 3' },
  { id: 'dept-11', name: 'Intensive Care Unit', category: 'Critical Care', buildingFloor: 'อาคาร 1 ชั้น 4' },
  { id: 'dept-12', name: 'Labour Room', category: 'OB-GYN', buildingFloor: 'อาคาร 2 ชั้น 5' },
  { id: 'dept-13', name: 'Nursery', category: 'Pediatrics', buildingFloor: 'อาคาร 2 ชั้น 5' },
  { id: 'dept-14', name: 'Patient Wards 17', category: 'Inpatient', buildingFloor: 'อาคาร 1 ชั้น 17' },
  { id: 'dept-15', name: 'Patient Wards 18', category: 'Inpatient', buildingFloor: 'อาคาร 1 ชั้น 18' },
  { id: 'dept-16', name: 'Patient Wards 15', category: 'Inpatient', buildingFloor: 'อาคาร 1 ชั้น 15' },
  { id: 'dept-17', name: 'Patient Wards 16', category: 'Inpatient', buildingFloor: 'อาคาร 1 ชั้น 16' },
  { id: 'dept-18', name: 'Pediatrics Center', category: 'Pediatrics', buildingFloor: 'อาคาร 2 ชั้น 4' },
  { id: 'dept-19', name: 'Obstetric & Gynecology Center', category: 'OB-GYN', buildingFloor: 'อาคาร 2 ชั้น 5' },
  { id: 'dept-20', name: 'Cardio-Neuro Vascular Intervention', category: 'Critical Care', buildingFloor: 'อาคาร 1 ชั้น 4' },
  { id: 'dept-21', name: 'Pharmacy', category: 'Pharmacy', buildingFloor: 'อาคาร 1 ชั้น 1' },
  { id: 'dept-22', name: 'Gastrointestinal & Liver Center', category: 'Endoscopy', buildingFloor: 'อาคาร 2 ชั้น 2' },
  { id: 'dept-23', name: 'Anesthesia', category: 'Critical Care', buildingFloor: 'อาคาร 1 ชั้น 3' },
  { id: 'dept-24', name: 'Emergency & Ambulance', category: 'Emergency', buildingFloor: 'อาคาร 1 ชั้น 1' },
  { id: 'dept-25', name: 'Bone & Joint', category: 'Orthopedics', buildingFloor: 'อาคาร 1 ชั้น 2' },
  { id: 'dept-26', name: 'BME-PTP', category: 'Engineering', buildingFloor: 'อาคาร 1 ชั้น B' },
  { id: 'dept-27', name: 'Ear Nose Throat Clinic', category: 'OPD Specialized', buildingFloor: 'อาคาร 1 ชั้น 2' },
  { id: 'dept-28', name: 'Neurology', category: 'Specialized', buildingFloor: 'อาคาร 2 ชั้น 3' },
  { id: 'dept-29', name: 'Patient Escort', category: 'Service', buildingFloor: 'อาคาร 1 ชั้น 1' },
  { id: 'dept-30', name: 'Dental & Implant Center', category: 'Dental', buildingFloor: 'อาคาร 2 ชั้น 4' },
  { id: 'dept-31', name: 'Air compressor room', category: 'Facility', buildingFloor: 'อาคาร 4 ชั้น 1' },
];

export const INITIAL_EQUIPMENT: EquipmentInfo[] = [
  { id: 'eq-1', code: 'EQ-01', name: 'AIR COOLING', nameTh: 'ระบบทำความเย็นและระบายความร้อนหัวจ่ายลม', brand: 'CENTURY', category: 'AIR COOLING', department: 'Air compressor room' },
  { id: 'eq-2', code: 'EQ-02', name: 'ALARMS, CENTRAL GAS SYSTEM', nameTh: 'ระบบสัญญาณเตือนก๊าซทางการแพทย์ส่วนกลาง', brand: 'AMICO, BEACON MEDAES, GENTEC, OHIO, SILBERMANN', category: 'ALARMS', department: 'Air compressor room' },
  { id: 'eq-3', code: 'EQ-03', name: 'AMALGAMATORS', nameTh: 'เครื่องผสมสารอุดฟัน (อมัลกัม)', brand: '3M HEALTH CARE, DE GOTZEN S.R.L. LEGNANO, DENTSPLY SIRONA, KERR, SIRONA', category: 'AMALGAMATORS', department: 'Dental & Implant Center' },
  { id: 'eq-4', code: 'EQ-04', name: 'ANALYZERS, LABORATORY, HEMATOLOGY, COAGULATION', nameTh: 'เครื่องตรวจวิเคราะห์การแข็งตัวของเลือดและโลหิตวิทยา', brand: 'ROCHE', category: 'ANALYZERS', department: 'Check Up Center' },
  { id: 'eq-5', code: 'EQ-05', name: 'ANALYZERS, PHYSIOLOGIC, BODY COMPOSITION', nameTh: 'เครื่องตรวจวิเคราะห์องค์ประกอบร่างกายและมวลไขมัน', brand: 'INBODY, OMRON', category: 'ANALYZERS', department: 'Check Up Center' },
  { id: 'eq-6', code: 'EQ-06', name: 'ANALYZERS, PHYSIOLOGIC, DENTAL PULP', nameTh: 'เครื่องตรวจวัดความมีชีวิตของโพรงประสาทฟัน', brand: 'DIGITEST, KERR, PARKELL', category: 'ANALYZERS', department: 'Dental & Implant Center' },
  { id: 'eq-7', code: 'EQ-07', name: 'ANALYZERS, PHYSIOLOGIC, FACIAL SKIN CHARACTERISTICS', nameTh: 'เครื่องตรวจวิเคราะห์สภาพผิวหน้าและเม็ดสีผิว', brand: 'PIE', category: 'ANALYZERS', department: 'Skin' },
  { id: 'eq-8', code: 'EQ-08', name: 'ANALYZERS, PHYSIOLOGIC, MIDDLE EAR', nameTh: 'เครื่องตรวจการทำงานของหูชั้นกลางและความดันเยื่อแก้วหู (Tympanometer)', brand: 'GRASON-STADLER', category: 'ANALYZERS', department: 'Ear Nose Throat Clinic' },
  { id: 'eq-9', code: 'EQ-09', name: 'ANALYZERS, PHYSIOLOGIC, VISUAL FUNCTION', nameTh: 'เครื่องตรวจวิเคราะห์สมรรถภาพการมองเห็นและลานสายตา', brand: 'HONEYWELL', category: 'ANALYZERS', department: 'Eye Clinic' },
  { id: 'eq-10', code: 'EQ-10', name: 'ANALYZERS, PHYSIOLOGIC, VISUAL FUNCTION, EYE STRUCTURE', nameTh: 'เครื่องตรวจวิเคราะห์โครงสร้างลูกตาและขั้วประสาทตา (OCT)', brand: 'CARL ZEISS MEDITEC AG', category: 'ANALYZERS', department: 'Eye Clinic' },
  { id: 'eq-11', code: 'EQ-11', name: 'ANALYZERS, POINT-OF-CARE, BREATH, CARBON ISOTOPE', nameTh: 'เครื่องตรวจวิเคราะห์ก๊าซในลมหายใจหาเชื้อ H. Pylori (คาร์บอนไอโซโทป)', brand: 'OTSUKA ELECTRONICS', category: 'ANALYZERS', department: 'General Medicine' },
  { id: 'eq-12', code: 'EQ-12', name: 'ANALYZERS, POINT-OF-CARE, BREATH, CARBON MONOXIDE', nameTh: 'เครื่องตรวจวัดก๊าซคาร์บอนมอนอกไซด์ในลมหายใจ', brand: 'BEDFONT', category: 'ANALYZERS', department: 'General Medicine' },
  { id: 'eq-13', code: 'EQ-13', name: 'ANALYZERS, POINT-OF-CARE, WHOLE BLOOD, COAGULATION', nameTh: 'เครื่องตรวจวิเคราะห์การแข็งตัวของเลือดข้างเตียงผู้ป่วย', brand: 'HEMOCHRON', category: 'ANALYZERS', department: 'Emergency & Ambulance' },
  { id: 'eq-14', code: 'EQ-14', name: 'ANALYZERS, POINT-OF-CARE, WHOLE BLOOD, GAS/PH/ELECTROLYTE', nameTh: 'เครื่องตรวจวิเคราะห์ก๊าซในเลือด อิเล็กโทรไลต์ และสมดุลกรด-ด่าง', brand: 'ABBOTT LABORATORIES', category: 'ANALYZERS', department: 'Intensive Care Unit' },
  { id: 'eq-15', code: 'EQ-15', name: 'ANESTHESIA UNITS', nameTh: 'เครื่องดมยาสลบพร้อมระบบช่วยหายใจ', brand: 'DATEX OHMEDA', category: 'ANESTHESIA UNITS', department: 'Anesthesia' },
];

// Raw historical visitor logs parsed from user prompt dataset
const RAW_VISITOR_ROWS: Array<{
  timestamp: string;
  name: string;
  company: string;
  phone: string;
  department: string;
  workType: string;
  visitorCount: number;
  cardImageUrl?: string;
  vehicleType?: string;
  licensePlate?: string;
}> = [
  { timestamp: "26/2/2025, 9:32:04", name: "พรรณรงค์ พรศุภกรโชค", company: "Double U Tech", phone: "0830817481", department: "BME-PTP", workType: "งานซ่อม", visitorCount: 2, cardImageUrl: "https://drive.google.com/open?id=1ccU-qpZ7Tt8y-SX5pyU3VJP8C6s934rG", vehicleType: "รถบรรทุก 4 ล้อ", licensePlate: "บท 4455" },
  { timestamp: "26/2/2025, 10:52:54", name: "ปิยะ เดชาวาศน์", company: "ดับเบิ้ลยู เทค", phone: "0868999683", department: "Air compressor room", workType: "งาน PM", visitorCount: 3, cardImageUrl: "https://drive.google.com/open?id=1oXX1KK-EgkWV1reRccUdmRnmSos5rgoa", vehicleType: "รถยนต์ส่วนบุคคล", licensePlate: "4กข 9812" },
  { timestamp: "26/2/2025, 11:30:10", name: "อุเทน เพิ่มบุญ", company: "Paramount bed", phone: "0990811181", department: "BME-PTP", workType: "งานซ่อม", visitorCount: 1, cardImageUrl: "https://drive.google.com/open?id=1Un2QwvD-q78WcGrUSLdXW9zooK8NNYn0", vehicleType: "รถยนต์ส่วนบุคคล", licensePlate: "3ขค 7712" },
  { timestamp: "26/2/2025, 14:48:10", name: "จักรพันธ์ วรสันตะติพงษ์", company: "Olympus", phone: "0918874088", department: "Gastrointestinal & Liver Center (Scope)", workType: "งานซ่อม", visitorCount: 1, cardImageUrl: "https://drive.google.com/open?id=1S3_ScW5vUryPLlHX0xE9ZLpngoz5EH6l", vehicleType: "รถยนต์ส่วนบุคคล", licensePlate: "2กม 3490" },
  { timestamp: "27/2/2025, 9:42:47", name: "พรรณรงค์ พรศุภกรโชค", company: "Double U Tech", phone: "0830817481", department: "BME-PTP", workType: "งานซ่อม", visitorCount: 2, cardImageUrl: "https://drive.google.com/open?id=1_Mw2CByLVKQM9OAnN7c06pdE_1tecaei", vehicleType: "รถยนต์ส่วนบุคคล", licensePlate: "บท 4455" },
  { timestamp: "28/2/2025, 14:55:52", name: "นายพล แสงคำ", company: "ออลล์เวลไลฟ์ จำกัด", phone: "024243555", department: "Emergency & Ambulance", workType: "DEMO", visitorCount: 1, cardImageUrl: "https://drive.google.com/open?id=1zIv99Tc-WMeIhvFWNJdk18ubfy8ThXVu", vehicleType: "รถยนต์ส่วนบุคคล", licensePlate: "8กศ 9011" },
  { timestamp: "28/2/2025, 15:38:54", name: "กิตติศักดิ์ โพธิ์ศิริ", company: "EndoSMART", phone: "0859309990", department: "Gastrointestinal & Liver Center (Scope)", workType: "DEMO", visitorCount: 2, cardImageUrl: "https://drive.google.com/open?id=1g-aSy29oiF869QaqHqs0l3FsObbCvfyS", vehicleType: "รถยนต์ส่วนบุคคล", licensePlate: "5ขจ 2234" },
  { timestamp: "1/3/2025, 17:32:51", name: "surat polkul", company: "CMC", phone: "0917724275", department: "BME-PTP", workType: "งานซ่อม", visitorCount: 1, cardImageUrl: "https://drive.google.com/open?id=1pEPeQyoCksiUAT0PL_SddLjpM8IKTLp_", vehicleType: "รถยนต์ส่วนบุคคล", licensePlate: "กฉ 7701" },
  { timestamp: "3/3/2025, 8:56:28", name: "กิตติศักดิ์ โพธิ์ศิริ", company: "Kainatic", phone: "0859309990", department: "Gastrointestinal & Liver Center (Scope)", workType: "DEMO", visitorCount: 1, cardImageUrl: "https://drive.google.com/open?id=1nlAM7KI2ND4ehqIbt-TaLDmAUdbf0S0a", vehicleType: "รถยนต์ส่วนบุคคล", licensePlate: "5ขจ 2234" },
  { timestamp: "5/3/2025, 20:16:58", name: "ปฎิพล วิจิตรกูล", company: "Philips", phone: "0818456015", department: "X-Ray", workType: "งาน PM", visitorCount: 1, cardImageUrl: "https://drive.google.com/open?id=1KGI8fL_H6sFR-2wVkcvL_ktVhdIN6-Z9", vehicleType: "รถยนต์ส่วนบุคคล", licensePlate: "6กง 5590" },
  { timestamp: "6/3/2025, 10:29:15", name: "ณัฐพล นาคพนม", company: "Kainatic", phone: "0968103126", department: "Gastrointestinal & Liver Center (Scope)", workType: "แก้ไขปัญหาการใช้งาน", visitorCount: 1, cardImageUrl: "https://drive.google.com/open?id=1x5mY2OZQQD_VH8NYBlBHLTDdp2xes8o8", vehicleType: "รถยนต์ส่วนบุคคล", licensePlate: "2ขจ 9888" },
  { timestamp: "6/3/2025, 13:30:54", name: "สุพัตรา จันทร์เรือง", company: "อิโนเวชั่นส์ จำกัด", phone: "082-782-6061", department: "BME-PTP", workType: "DEMO", visitorCount: 2, cardImageUrl: "https://drive.google.com/open?id=1YSJOfCm-1FQpb8AwwGCW6aHUZvJVg9fh", vehicleType: "รถยนต์ส่วนบุคคล", licensePlate: "3ขม 1109" },
  { timestamp: "6/3/2025, 13:33:52", name: "วัฒนชัย มิ่งขวัญ", company: "Prime medical", phone: "0649964416", department: "BME-PTP", workType: "งานซ่อม", visitorCount: 1, cardImageUrl: "https://drive.google.com/open?id=18KLMoI0ayiLKCUERbXucIxKfAiMG6uVQ", vehicleType: "รถยนต์ส่วนบุคคล", licensePlate: "7กฮ 4410" },
  { timestamp: "6/3/2025, 15:06:17", name: "สฤษฎ์พงศ์ เพิ่มผล", company: "Olympus", phone: "0639354916", department: "Operating Room", workType: "Training", visitorCount: 1, cardImageUrl: "https://drive.google.com/open?id=1B9-hY3oHE05hqe74R2Z--z6wQZEAYc6B", vehicleType: "รถยนต์ส่วนบุคคล", licensePlate: "9กช 2219" },
  { timestamp: "6/3/2025, 16:47:07", name: "กฤษฎา บุญถา", company: "Nhealth", phone: "0919995166", department: "BME-PTP", workType: "งานซ่อม", visitorCount: 1, cardImageUrl: "https://drive.google.com/open?id=17s5F2WOzSfuHh2sgbEKd0zgzIbe_iWGg", vehicleType: "จักรยานยนต์", licensePlate: "1กท 7721" },
  { timestamp: "10/3/2025, 7:48:28", name: "ฐาปกรณ์ ชูหาด", company: "Philips", phone: "081-8419059", department: "BME-PTP", workType: "งานซ่อม", visitorCount: 1, cardImageUrl: "https://drive.google.com/open?id=1TAoZE5t1LNOIEvmtjXMUqIJG1ZnDiFpY", vehicleType: "รถยนต์ส่วนบุคคล", licensePlate: "4กง 3302" },
  { timestamp: "11/3/2025, 9:21:05", name: "อนุชา ดวงแก้ว", company: "B.Braun", phone: "0622433051", department: "X-Ray", workType: "งาน PM", visitorCount: 1, cardImageUrl: "https://drive.google.com/open?id=1Imcvua9EJaktZr2LbWEH7za6ypjqzjGK", vehicleType: "รถยนต์ส่วนบุคคล", licensePlate: "1ขต 9811" },
  { timestamp: "12/3/2025, 14:45:23", name: "พิชญา จิระเดชประไพ", company: "Getinge", phone: "0655241019", department: "Cardio-Neuro Vascular Intervention (CathLab)", workType: "งานซ่อม", visitorCount: 1, cardImageUrl: "https://drive.google.com/open?id=1trpoOqaiNrZ4YbHUeykFfOlydbVXeqgx", vehicleType: "รถยนต์ส่วนบุคคล", licensePlate: "5กถ 1289" },
  { timestamp: "14/3/2025, 9:04:53", name: "ทวีศักดิ์ งามขำ", company: "SMKT Thailand", phone: "0818504725", department: "Operating Room", workType: "ย้ายโคมไฟผ่าตัด", visitorCount: 3, cardImageUrl: "https://drive.google.com/open?id=1VoCpnm_VXpscrktL1N0KudjFR2J3eyen", vehicleType: "รถบรรทุก 4 ล้อ", licensePlate: "ฒฐ 3301" },
  { timestamp: "16/3/2025, 20:39:04", name: "แสงบุญส่ง หมวดกรม", company: "Philips", phone: "0818480853", department: "Cardio-Neuro Vascular Intervention (CathLab)", workType: "งานซ่อม", visitorCount: 1, cardImageUrl: "https://drive.google.com/open?id=1u2Y8e_y4AMXSRXuMDxKrpuOzbvshKBQI", vehicleType: "รถยนต์ส่วนบุคคล", licensePlate: "2กผ 9001" },
  { timestamp: "17/3/2025, 10:24:30", name: "ธีรพล กันเตียง", company: "Eforl", phone: "0802997891", department: "Anesthesia", workType: "ติดตั้ง", visitorCount: 2, cardImageUrl: "https://drive.google.com/open?id=1x911Wh5_GAVvAQ6-8yI_l9Vbsi7g2e17", vehicleType: "รถยนต์ส่วนบุคคล", licensePlate: "3ขฉ 7719" },
  { timestamp: "20/3/2025, 13:50:15", name: "Weerakarn Namthong", company: "GE Healthcare", phone: "0800702125", department: "Cardio-Neuro Vascular Intervention (CathLab)", workType: "งานซ่อม", visitorCount: 1, cardImageUrl: "https://drive.google.com/open?id=1ziMQ4EIw67c1zmM5l0DsLAxJGT8rR9A-", vehicleType: "รถยนต์ส่วนบุคคล", licensePlate: "1ขด 4401" },
  { timestamp: "24/3/2025, 15:02:03", name: "ทศพร สุ่มมาตย์", company: "Double U Tech", phone: "0623975635", department: "BME-PTP", workType: "งานซ่อม", visitorCount: 3, cardImageUrl: "https://drive.google.com/open?id=1JMUPDgoyYslZdoHYEYxFn_EsbEqDEOhr", vehicleType: "รถบรรทุก 4 ล้อ", licensePlate: "บท 8821" },
  { timestamp: "27/3/2025, 10:45:23", name: "วินิตา มีโพธิ์งาม", company: "Draeger", phone: "0842170593", department: "Anesthesia", workType: "งานซ่อม", visitorCount: 2, cardImageUrl: "https://drive.google.com/open?id=1qtlARa4DsIDt3hH_ZSrIEBT4AvuZDbvL", vehicleType: "รถยนต์ส่วนบุคคล", licensePlate: "4กศ 1109" },
  { timestamp: "28/3/2025, 11:02:06", name: "ชัยพร เรืองฤทธิ์", company: "Xovic", phone: "0642589169", department: "BME-PTP", workType: "งานซ่อม", visitorCount: 2, cardImageUrl: "https://drive.google.com/open?id=1di5HeElWGEWo7zKk0UdZ4SWxzZXrSjpK", vehicleType: "รถยนต์ส่วนบุคคล", licensePlate: "2กจ 6601" },
  { timestamp: "28/3/2025, 11:29:34", name: "จตุรงค์ บุญประมุข", company: "Xovic", phone: "0809239833", department: "BME-PTP", workType: "งานซ่อม", visitorCount: 2, cardImageUrl: "https://drive.google.com/open?id=1JU_NeH5eL5xkT__Bmhp6BNXhM7eWKuZI", vehicleType: "รถยนต์ส่วนบุคคล", licensePlate: "2กจ 6601" },
  { timestamp: "2/4/2025, 9:10:03", name: "ศิลา ทุเครือ", company: "Philips", phone: "0843876676", department: "Cardio-Neuro Vascular Intervention (CathLab)", workType: "ตรวจเช็คเครื่อง X-Ray", visitorCount: 1, cardImageUrl: "https://drive.google.com/open?id=1mu62KU5ZVUIBIYA-OROV8KoIHMSVasMS", vehicleType: "รถยนต์ส่วนบุคคล", licensePlate: "9กง 4492" },
  { timestamp: "14/4/2025, 15:51:45", name: "ฉัตรชัย สันทนะ", company: "Philips", phone: "0844389698", department: "Cardio-Neuro Vascular Intervention (CathLab)", workType: "งานซ่อม", visitorCount: 1, cardImageUrl: "https://drive.google.com/open?id=15p55N3FdW_qszWHzczm-FxLIzsrXP3Ye", vehicleType: "รถยนต์ส่วนบุคคล", licensePlate: "6กฉ 1120" },
  { timestamp: "28/4/2025, 16:56:42", name: "อธิปัติย์ จิรวัฒนานุโยค", company: "Zeiss", phone: "0818753219", department: "Dental & Implant Center", workType: "Check ระบบ", visitorCount: 1, cardImageUrl: "https://drive.google.com/open?id=1zMDKJnUpCcHcf1FVsPcnUA8rz2f9XlhN", vehicleType: "รถยนต์ส่วนบุคคล", licensePlate: "3ขภ 9912" },
  { timestamp: "29/4/2025, 15:28:50", name: "ธีรศักดิ์ กิจกนพิศาล", company: "GE Healthcare", phone: "0818059561", department: "BME-PTP", workType: "งานซ่อม, งาน PM", visitorCount: 1, cardImageUrl: "https://drive.google.com/open?id=1PPBL4xuXYB2ylbT0vDrUCIl7FN6Jr9rP", vehicleType: "รถยนต์ส่วนบุคคล", licensePlate: "5กศ 3320" },
  { timestamp: "28/5/2025, 14:33:50", name: "สมรัก ใบหาด", company: "ดับเบิ้ลยูเทค", phone: "0982783314", department: "BME-PTP", workType: "งานซ่อม", visitorCount: 1, cardImageUrl: "https://drive.google.com/open?id=1T24VkWwzUzYUNZrefUqzG8MoSs_JMDqv", vehicleType: "รถยนต์ส่วนบุคคล", licensePlate: "2ขต 5189" },
  { timestamp: "6/6/2025, 10:25:06", name: "วรวรรณ ช่างทุ่งใหญ่", company: "Dentsply sirona", phone: "0879098011", department: "Dental & Implant Center", workType: "งาน PM", visitorCount: 1, cardImageUrl: "https://drive.google.com/open?id=1lzN4gFiSZrO8n6iSI932B38e3weRJffK", vehicleType: "รถยนต์ส่วนบุคคล", licensePlate: "1ขท 8812" },
  { timestamp: "16/6/2025, 13:14:31", name: "ณัฐพล พูนภิญโญ", company: "Carl Zeiss", phone: "0886378264", department: "Eye Ear Nose Throat Clinic", workType: "งาน PM", visitorCount: 2, cardImageUrl: "https://drive.google.com/open?id=1B1u0fBFiM1g444NAFnupGZlPbumvs3sG", vehicleType: "รถยนต์ส่วนบุคคล", licensePlate: "4กง 9921" },
  { timestamp: "24/6/2025, 8:51:43", name: "กิตติพิชญ์ สมิทธิ์เยาวกุล", company: "LIVANOVA", phone: "0922825111", department: "Operating Room", workType: "งาน PM", visitorCount: 1, cardImageUrl: "https://drive.google.com/open?id=1ispgF7Rtk7cjLeVq3MbR5xCevtq35Lnf", vehicleType: "รถยนต์ส่วนบุคคล", licensePlate: "8กภ 1109" },
  { timestamp: "18/8/2025, 11:23:05", name: "ภูวดล มูซอ", company: "บริษัท ไจโก้ อินเตอร์เทรด จำกัด", phone: "0832361852", department: "Dental & Implant Center", workType: "งานซ่อม, งาน PM", visitorCount: 2, cardImageUrl: "https://drive.google.com/open?id=1a2V8tvH9-YDX3znsZjwRFKeF-rdVfNkg", vehicleType: "รถยนต์ส่วนบุคคล", licensePlate: "3กผ 4412" },
  { timestamp: "20/8/2025, 13:49:20", name: "วีรภัทร เอมโอด", company: "เมดิคอล เลเซอร์เทคโนโลยี จำกัด", phone: "0922696867", department: "BME-PTP", workType: "งาน PM", visitorCount: 2, cardImageUrl: "https://drive.google.com/open?id=1nZE3dfAhbwiDTxkvU3sxSfiEl6D7ZWvm", vehicleType: "รถยนต์ส่วนบุคคล", licensePlate: "7กค 9811" },
  { timestamp: "9/9/2025, 14:55:38", name: "ยศภัทร พัฒนศักดิ์สิทธิ์", company: "Bayer", phone: "0981055179", department: "X-Ray", workType: "งาน PM", visitorCount: 1, cardImageUrl: "https://drive.google.com/open?id=1VIqHqvhvbZynXfKzBTm-6l7nUJoMDTPF", vehicleType: "รถยนต์ส่วนบุคคล", licensePlate: "6กฉ 2234" },
  { timestamp: "10/9/2025, 14:05:38", name: "เสฐพงษ์ โรจนติรนันท์", company: "J.F advance med", phone: "0949707694", department: "X-Ray", workType: "งาน PM", visitorCount: 3, cardImageUrl: "https://drive.google.com/open?id=13S7A2Lt-BBgqd6EOCucr_3mURjYLco4o", vehicleType: "รถยนต์ส่วนบุคคล", licensePlate: "2ขจ 9901" },
  { timestamp: "18/10/2025, 11:55:05", name: "พลวิทย์ สุทธิพิทักษ์", company: "BAYER", phone: "0813565429", department: "X-Ray", workType: "ซ่อมเครื่อง Injector", visitorCount: 1, cardImageUrl: "https://drive.google.com/open?id=1qhE3uqkozPqzEzsZPmesZlA6Rsn7i1lz", vehicleType: "รถยนต์ส่วนบุคคล", licensePlate: "1ขม 7721" },
  { timestamp: "4/11/2025, 11:43:04", name: "อรุณ คำมูล", company: "Transmedic", phone: "0849595529", department: "BME-PTP", workType: "Update software", visitorCount: 1, cardImageUrl: "https://drive.google.com/open?id=18GdOw_JiRYpySsPWpl5-fKBIZDb99wmI", vehicleType: "รถยนต์ส่วนบุคคล", licensePlate: "9กผ 3321" },
  { timestamp: "10/2/2026, 10:14:21", name: "สุรสิทธิ์ ไกรสิงห์", company: "เอสดีทันตเวช 1988", phone: "0908897672", department: "Dental & Implant Center", workType: "ตรวจกรมวิทย์", visitorCount: 1, cardImageUrl: "https://drive.google.com/open?id=1DruEc4cCn2TJJZhwTplHZU7eLixab5H8", vehicleType: "รถยนต์ส่วนบุคคล", licensePlate: "3ขต 4410" },
  { timestamp: "14/8/2026, 13:34:28", name: "วรรณภา ทองมี", company: "โซวิค จำกัด", phone: "090-8971800", department: "Check Up Center", workType: "ส่งสินค้า", visitorCount: 2, cardImageUrl: "https://drive.google.com/open?id=1fDwim35UOxiduySXpnlAYqzaXs68RoRW", vehicleType: "รถยนต์ส่วนบุคคล", licensePlate: "2ขต5189" },
  { timestamp: "15/8/2026, 11:13:24", name: "สมศักดิ์", company: "Xovic", phone: "0809239833", department: "BME-PTP", workType: "เดินสาย Lan", visitorCount: 4, vehicleType: "รถยนต์ส่วนบุคคล", licensePlate: "5กง 8812" },
];

// Helper to determine medical equipment handled based on department & company
function guessEquipments(company: string, dept: string, workType: string): string[] {
  const comp = company.toLowerCase();
  const d = dept.toLowerCase();
  const eqList: string[] = [];

  if (comp.includes('olympus') || comp.includes('โอลิมปัส') || comp.includes('kainatic') || comp.includes('ไกเนติค') || comp.includes('endosmart')) {
    eqList.push('ชุดกล้องส่องตรวจทางเดินอาหาร (Endoscope GI)');
  }
  if (comp.includes('philips') || comp.includes('ฟิลิปส์')) {
    if (d.includes('x-ray') || d.includes('mri')) {
      eqList.push('เครื่องเอกซเรย์ระบบดิจิทัล (Digital X-Ray / MRI)');
    } else if (d.includes('cathlab') || d.includes('heart')) {
      eqList.push('เครื่องตรวจหลอดเลือดหัวใจ (CathLab Azurion)');
    } else {
      eqList.push('เครื่องเอกซเรย์และระบบตรวจภาพรังสี');
    }
  }
  if (comp.includes('ge') || comp.includes('จีอี')) {
    eqList.push('เครื่องตรวจคลื่นไฟฟ้าหัวใจ & อัลตราซาวด์');
  }
  if (comp.includes('bayer') || comp.includes('ไบเออร์')) {
    eqList.push('เครื่องฉีดสารทึบรังสี (Contrast Injector)');
  }
  if (comp.includes('getinge') || comp.includes('เกท์ทิงเก')) {
    eqList.push('เตียงผ่าตัดและเครื่องนึ่งฆ่าเชื้อ (OR Table & Sterilizer)');
  }
  if (comp.includes('draeger') || comp.includes('ดราเกอร์')) {
    eqList.push('เครื่องดมยาสลบ & เครื่องช่วยหายใจ (Anesthesia & Ventilator)');
  }
  if (comp.includes('zeiss') || comp.includes('ไซส์')) {
    eqList.push('กล้องจุลทรรศน์ผ่าตัด (Surgical Microscope)');
  }
  if (comp.includes('alcon') || comp.includes('อัลคอน')) {
    eqList.push('เครื่องสลายต้อกระจกและเลเซอร์จักษุ');
  }
  if (comp.includes('xovic') || comp.includes('โซวิค')) {
    eqList.push('ระบบมอนิเตอร์ผู้ป่วยวิกฤต (Central & Patient Monitor)');
  }
  if (comp.includes('laser') || comp.includes('เลเซอร์')) {
    eqList.push('เครื่องเลเซอร์รักษาผิวหนัง (Dermatology Laser)');
  }
  if (comp.includes('ทันตเวช') || comp.includes('dental') || comp.includes('sirona') || comp.includes('ไจโก้')) {
    eqList.push('ยูนิตเก้าอี้และระบบเอกซเรย์ทันตกรรม');
  }
  if (comp.includes('double u') || comp.includes('ดับเบิ้ลยู')) {
    eqList.push('ระบบก๊าซทางการแพทย์ & Air Compressor');
  }
  if (comp.includes('ids') || comp.includes('ไอดีเอส')) {
    eqList.push('เครื่อง Ultrasound & อุปกรณ์ช่วยชีวิตฉุกเฉิน');
  }

  if (eqList.length === 0) {
    if (d.includes('x-ray')) eqList.push('เครื่องมือตรวจรังสีวินิจฉัย');
    else if (d.includes('operating') || d.includes('ผ่าตัด')) eqList.push('เครื่องมือและอุปกรณ์ห้องผ่าตัด');
    else if (d.includes('bme')) eqList.push('เครื่องมือแพทย์ทั่วไปและอุปกรณ์ทดสอบ');
    else eqList.push('เครื่องมือแพทย์ประจำแผนก');
  }

  return eqList;
}

// Convert raw rows to fully typed VisitorRecord
export const INITIAL_VISITOR_RECORDS: VisitorRecord[] = RAW_VISITOR_ROWS.map((row, index) => {
  const eq = guessEquipments(row.company, row.department, row.workType);
  const vType = (row.vehicleType as any) || (index % 3 === 0 ? 'รถยนต์ส่วนบุคคล' : index % 7 === 0 ? 'จักรยานยนต์' : 'รถยนต์ส่วนบุคคล');
  const plate = row.licensePlate || (index % 2 === 0 ? `2ขต ${1000 + (index * 23) % 8999}` : `กข ${2000 + (index * 17) % 7999}`);

  // Guess role
  let role: any = 'ช่าง';
  if (row.workType.toLowerCase().includes('demo') || row.workType.toLowerCase().includes('training') || row.workType.toLowerCase().includes('present')) {
    role = 'ผู้แทน';
  } else if (row.workType.toLowerCase().includes('ส่ง') || row.workType.toLowerCase().includes('delivery')) {
    role = 'เจ้าหน้าที่ส่งสินค้า';
  } else if (row.workType.toLowerCase().includes('ตรวจกรมวิทย์') || row.workType.toLowerCase().includes('ติดตั้ง') || row.workType.toLowerCase().includes('check')) {
    role = 'สเปเชียลลิสต์/ผู้เชี่ยวชาญ';
  }

  return {
    id: `vis-${index + 1}`,
    timestamp: row.timestamp,
    name: row.name.trim(),
    company: row.company.trim(),
    phone: row.phone.trim(),
    department: row.department.trim(),
    workType: row.workType.trim(),
    visitorCount: row.visitorCount || 1,
    cardImageUrl: row.cardImageUrl,
    vehicleType: vType,
    licensePlate: plate,
    equipmentHandled: eq,
    contactRole: role,
    createdDate: new Date(2025, 1 + (index % 12), 1 + (index % 28)).toISOString(),
    isImageExpired: false, // Calculated dynamically by retention logic
  };
});

// Auto-aggregate deduplicated company contacts
export function buildInitialContacts(records: VisitorRecord[]): CompanyContact[] {
  const map = new Map<string, CompanyContact>();

  for (const r of records) {
    const key = `${r.company.toLowerCase().trim()}_${r.name.toLowerCase().trim()}`;
    const existing = map.get(key);

    if (!existing) {
      map.set(key, {
        id: `contact-${map.size + 1}`,
        companyName: r.company,
        contactName: r.name,
        role: r.contactRole || 'ช่าง',
        phone: r.phone,
        equipmentList: [...r.equipmentHandled],
        departmentsCovered: [r.department],
        lastVisit: r.timestamp,
        visitCount: 1,
        notes: `ดูแลเครื่องมือ: ${r.equipmentHandled.join(', ')}`
      });
    } else {
      // Deduplicate equipments: add only unique equipments
      for (const eq of r.equipmentHandled) {
        if (!existing.equipmentList.includes(eq)) {
          existing.equipmentList.push(eq);
        }
      }
      if (!existing.departmentsCovered.includes(r.department)) {
        existing.departmentsCovered.push(r.department);
      }
      existing.visitCount += 1;
      existing.lastVisit = r.timestamp;
      existing.notes = `ดูแลเครื่องมือ (${existing.equipmentList.length} รายการ): ${existing.equipmentList.join(', ')}`;
    }
  }

  return Array.from(map.values());
}
