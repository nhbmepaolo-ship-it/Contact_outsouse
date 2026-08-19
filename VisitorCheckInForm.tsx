import React, { useState, useRef, useEffect } from 'react';
import {
  UserPlus,
  Building2,
  Phone,
  User,
  Layers,
  Wrench,
  Car,
  Camera,
  Upload,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  Truck,
  Bike,
  Sparkles,
  Printer,
  QrCode,
  Search,
  ChevronDown,
  Check,
  Languages,
  Plus
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  VehicleType,
  ContactRole,
  VisitorRecord,
  DepartmentInfo,
  EquipmentInfo
} from '../types';
import { StorageService } from '../services/storageService';
import { translateMedicalEquipmentToThai } from '../utils/equipmentTranslator';
import { sendTelegramNotification, formatVisitorTelegramMessage } from '../services/telegramService';
import { sendLineFlexNotification } from '../services/lineNotifyService';
import { GoogleSheetsService } from '../services/googleSheetsService';
import { compressImage } from '../utils/imageCompressor';
import { cleanPhoneNumber } from '../utils/phoneFormatter';

interface VisitorCheckInFormProps {
  departments: DepartmentInfo[];
  equipmentList: EquipmentInfo[];
  sheetCompanies?: string[];
  onRecordAdded: (record: VisitorRecord) => void;
  onViewLogs: () => void;
}

export const VisitorCheckInForm: React.FC<VisitorCheckInFormProps> = ({
  departments,
  equipmentList,
  sheetCompanies: propSheetCompanies,
  onRecordAdded,
  onViewLogs,
}) => {
  // Form State
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [companySearch, setCompanySearch] = useState('');
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const [sheetCompanies, setSheetCompanies] = useState<string[]>(() => {
    if (propSheetCompanies && propSheetCompanies.length > 0) return propSheetCompanies;
    return StorageService.getSheetCompanies();
  });
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<ContactRole>('ช่าง');
  const [department, setDepartment] = useState(departments[0]?.name || 'Physiotherapy');
  const [workType, setWorkType] = useState('สำรวจหน้างาน / ดูพื้นที่');
  const [customWorkType, setCustomWorkType] = useState('');
  const [workDetails, setWorkDetails] = useState('');
  const [visitorCount, setVisitorCount] = useState<number>(1);
  const [vehicleType, setVehicleType] = useState<VehicleType>('รถยนต์ส่วนบุคคล');
  const [licensePlate, setLicensePlate] = useState('');
  const [selectedEquipments, setSelectedEquipments] = useState<string[]>([]);
  const [equipmentSearch, setEquipmentSearch] = useState('');
  const [equipmentBrandFilter, setEquipmentBrandFilter] = useState('all');
  const [customEquipment, setCustomEquipment] = useState('');
  const [customEquipmentBrand, setCustomEquipmentBrand] = useState('');
  const [cardImage, setCardImage] = useState<string>('');
  const [sendTelegram, setSendTelegram] = useState<boolean>(true);
  const [sendLine, setSendLine] = useState<boolean>(true);
  const [notes, setNotes] = useState('');
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [lineStatus, setLineStatus] = useState<string | null>(null);

  const companyDropdownRef = useRef<HTMLDivElement>(null);

  // Sync Sheet Companies from props or storage
  useEffect(() => {
    if (propSheetCompanies && propSheetCompanies.length > 0) {
      setSheetCompanies(propSheetCompanies);
    } else {
      const list = StorageService.getSheetCompanies();
      setSheetCompanies(list);
    }
  }, [propSheetCompanies]);

  // Close company dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (companyDropdownRef.current && !companyDropdownRef.current.contains(event.target as Node)) {
        setIsCompanyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter companies from Data_base Col A based on search query
  const filteredCompanies = sheetCompanies.filter(comp =>
    comp.toLowerCase().includes(companySearch.toLowerCase().trim())
  );

  // Keep department selected in sync when departments load
  useEffect(() => {
    if (departments.length > 0 && (!department || !departments.some(d => d.name === department))) {
      setDepartment(departments[0].name);
    }
  }, [departments]);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRecord, setSubmittedRecord] = useState<VisitorRecord | null>(null);
  const [telegramStatus, setTelegramStatus] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Common quick work types with emojis
  const WORK_TYPES = [
    'สำรวจหน้างาน / ดูพื้นที่',
    'Demo',
    'ส่งมอบสินค้า / ส่งเครื่อง',
    'Demo Return',
    'อื่นๆ (ระบุเอง)',
    'งาน PM',
    'ตรวจกรมวิทย์ (สอบเทียบรังสี)',
    'สอบเทียบเครื่องมือ',
    'งานซ่อม',
    'ติดตั้ง',
    'Training (สอนการใช้งาน)',
  ];

  const WORK_TYPE_EMOJIS: Record<string, string> = {
    'สำรวจหน้างาน / ดูพื้นที่': '🔍',
    'Demo': '✨',
    'ส่งมอบสินค้า / ส่งเครื่อง': '📦',
    'Demo Return': '🔄',
    'อื่นๆ (ระบุเอง)': '📝',
    'งาน PM': '⚙️',
    'ตรวจกรมวิทย์ (สอบเทียบรังสี)': '☢️',
    'สอบเทียบเครื่องมือ': '🎯',
    'งานซ่อม': '🛠️',
    'ติดตั้ง': '🔌',
    'Training (สอนการใช้งาน)': '🎓',
  };

  // Role options with emojis
  const ROLE_OPTIONS: { role: ContactRole; emoji: string; label: string }[] = [
    { role: 'ช่าง', emoji: '🔧', label: 'ช่าง / วิศวกร (Engineer)' },
    { role: 'ผู้แทน', emoji: '💼', label: 'ผู้แทนขาย (Sales Rep)' },
    { role: 'สเปเชียลลิสต์/ผู้เชี่ยวชาญ', emoji: '🧑‍⚕️', label: 'Product Specialist' },
    { role: 'เจ้าหน้าที่ส่งสินค้า', emoji: '📦', label: 'ส่งมอบสินค้า (Delivery)' },
    { role: 'อื่นๆ', emoji: '👤', label: 'บุคคลทั่วไป / อื่นๆ' },
  ];

  // Common vehicle types with emojis
  const VEHICLE_OPTIONS: { type: VehicleType; emoji: string; label: string }[] = [
    { type: 'รถยนต์ส่วนบุคคล', emoji: '🚗', label: 'รถยนต์ส่วนบุคคล / กระบะ' },
    { type: 'จักรยานยนต์', emoji: '🛵', label: 'จักรยานยนต์' },
    { type: 'รถบรรทุก 4 ล้อ', emoji: '🚚', label: 'รถบรรทุก 4 ล้อ' },
    { type: 'รถบรรทุก 6 ล้อ', emoji: '🚛', label: 'รถบรรทุก 6 ล้อ' },
    { type: 'รถบรรทุก 10 ล้อ', emoji: '🚛', label: 'รถบรรทุก 10 ล้อ' },
    { type: 'ไม่มีพาหนะ/เดินเท้า', emoji: '🚶', label: 'เดินเท้า / ไม่มีพาหนะ' },
  ];

  // Quick suggestions for companies
  const POPULAR_COMPANIES = [
    'เนชั่นแนล เฮลท์แคร์',
    'ฟิลิปส์ (Philips)',
    'จีอี เฮลธ์แคร์ (GE)',
    'จำเริญแพทย์ภัณฑ์',
    'เอสอาร์เอส แม็กซ์พลัส',
    'ยู.พี.เมดิคอล ซอลเดอร์',
    'เกตเวย์ เฮลท์แคร์',
    'สิงห์ คอร์เปอเรชั่น',
    'เทรูโม (Terumo)',
    'มิตรการแพทย์',
    'คอนเนค ไดแอกโนสติกส์',
    'โซวี',
    'ซีเอ็มดี เฮลธ์แคร์',
    'มัตสึนากะ',
    'ไอดีลเวล',
    'แกรนดี อินเตอร์เนชั่นแนล',
    'แบ็กซ์เตอร์ (Baxter)',
    'สมิท แอนด์ เนฟฟิว',
    'เลเซอร์ เอนจิเนียร์',
    'แอคทีออน (Acteon)',
    'วาเลอร์ เฮลธ์',
    'ไพโอเนียร์ อินเตอร์ ซัพพลาย',
    'ออริจิเนเตอร์',
    'สยาม ฮอสพิทอล ซัพพลาย',
    'ไพชีส เมดิคอล',
    'ไซเอนซ์ เอนจิเนียร์',
    'ไบโอแอคทีฟ อินเตอร์',
    'เจเอส ยูนิทค',
    'เซอร์เคิลไลฟ์',
    'เอส.ดี. ทันตเวช 1988',
    'Double U Tech',
    'Olympus',
  ];

  // Extract unique brands from equipmentList
  const availableBrands = React.useMemo(() => {
    const brandsSet = new Set<string>();
    equipmentList.forEach(eq => {
      if (eq.brand && eq.brand.trim()) {
        eq.brand.split(/[,;/]+/).forEach(b => {
          const trimmed = b.trim();
          if (trimmed && trimmed.length > 1) {
            brandsSet.add(trimmed);
          }
        });
      }
    });
    return Array.from(brandsSet).sort((a, b) => a.localeCompare(b, 'en'));
  }, [equipmentList]);

  // Real-time dynamic equipment filtering matching Name, Brand, Thai Translation, and Category
  const filteredEquipmentList = React.useMemo(() => {
    const term = equipmentSearch.toLowerCase().trim();
    return equipmentList.filter(eq => {
      // Brand filter
      if (equipmentBrandFilter !== 'all') {
        const brandLower = (eq.brand || '').toLowerCase();
        if (!brandLower.includes(equipmentBrandFilter.toLowerCase())) {
          return false;
        }
      }

      // Keyword search
      if (!term) return true;

      const nameMatch = eq.name.toLowerCase().includes(term);
      const nameThMatch = (eq.nameTh || '').toLowerCase().includes(term);
      const brandMatch = (eq.brand || '').toLowerCase().includes(term);
      const catMatch = (eq.category || '').toLowerCase().includes(term);

      return nameMatch || nameThMatch || brandMatch || catMatch;
    });
  }, [equipmentList, equipmentSearch, equipmentBrandFilter]);

  // Helper to format an equipment string with Brand
  const formatEquipmentWithBrand = (eq: EquipmentInfo): string => {
    const brandStr = eq.brand ? ` [Brand: ${eq.brand}]` : '';
    return `${eq.name}${brandStr}`;
  };

  // Check if an equipment is currently selected
  const isEquipmentSelected = (eq: EquipmentInfo): boolean => {
    const fullTag = formatEquipmentWithBrand(eq);
    return (
      selectedEquipments.includes(fullTag) ||
      selectedEquipments.includes(eq.name) ||
      selectedEquipments.some(s => s.startsWith(eq.name))
    );
  };

  // Toggle Equipment selection
  const handleToggleEquipment = (eq: EquipmentInfo) => {
    const fullTag = formatEquipmentWithBrand(eq);
    setSelectedEquipments(prev => {
      const alreadySelected = isEquipmentSelected(eq);
      if (alreadySelected) {
        return prev.filter(
          item =>
            item !== fullTag &&
            item !== eq.name &&
            !item.startsWith(eq.name)
        );
      } else {
        return [...prev, fullTag];
      }
    });
  };

  // Remove specific selected equipment
  const handleRemoveSelectedEquipment = (itemToRemove: string) => {
    setSelectedEquipments(prev => prev.filter(e => e !== itemToRemove));
  };

  // Add custom equipment with Brand
  const handleAddCustomEquipment = () => {
    const cleanName = customEquipment.trim();
    const cleanBrand = customEquipmentBrand.trim();
    if (!cleanName) return;

    const formatted = cleanBrand
      ? `${cleanName} [Brand: ${cleanBrand}]`
      : cleanName;

    if (!selectedEquipments.includes(formatted)) {
      setSelectedEquipments(prev => [...prev, formatted]);
      setCustomEquipment('');
      setCustomEquipmentBrand('');
    }
  };

  // Image Upload Handling with Fast Auto Compression
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 800, 800, 0.75);
        setCardImage(compressed);
        if (formErrors.cardImage) setFormErrors(prev => ({ ...prev, cardImage: '' }));
      } catch (err) {
        console.error('Failed to compress file image:', err);
        const reader = new FileReader();
        reader.onloadend = () => {
          setCardImage(reader.result as string);
          if (formErrors.cardImage) setFormErrors(prev => ({ ...prev, cardImage: '' }));
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Camera Handling
  const startCamera = async () => {
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      alert('ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการเข้าถึงกล้อง หรือใช้วิธีอัปโหลดรูปภาพแทน');
      setIsCameraActive(false);
    }
  };

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const rawDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const compressed = await compressImage(rawDataUrl, 800, 800, 0.75);
        setCardImage(compressed);
        if (formErrors.cardImage) setFormErrors(prev => ({ ...prev, cardImage: '' }));
      }
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
    }
    setIsCameraActive(false);
  };

  // Form Validation
  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!name.trim()) {
      errors.name = 'กรุณากรอกชื่อ - นามสกุล';
    }
    if (!phone.trim()) {
      errors.phone = 'กรุณากรอกเบอร์โทรศัพท์ติดต่อ';
    }
    if (!company.trim()) {
      errors.company = 'กรุณากรอกหรือเลือกชื่อบริษัท / สังกัด';
    }
    if (!role) {
      errors.role = 'กรุณาเลือกตำแหน่ง / บทบาท';
    }
    if (!department) {
      errors.department = 'กรุณาเลือกแผนกที่เข้าติดต่อ';
    }
    if (!workType) {
      errors.workType = 'กรุณาเลือกลักษณะงาน';
    } else if (workType === 'อื่นๆ (ระบุเอง)' && !customWorkType.trim()) {
      errors.workType = 'กรุณาระบุลักษณะงานเพิ่มเติม';
    }
    if (!visitorCount || visitorCount < 1) {
      errors.visitorCount = 'กรุณาระบุจำนวนผู้มาติดต่ออย่างน้อย 1 ท่าน';
    }
    if (selectedEquipments.length === 0) {
      errors.equipments = 'กรุณาเลือกหรือระบุเครื่องมือแพทย์อย่างน้อย 1 รายการ';
    }
    if (!vehicleType) {
      errors.vehicleType = 'กรุณาเลือกประเภทยานพาหนะ';
    }
    if (vehicleType !== 'ไม่มีพาหนะ/เดินเท้า' && !licensePlate.trim()) {
      errors.licensePlate = 'กรุณาระบุเลขทะเบียนยานพาหนะ';
    }
    if (!cardImage) {
      errors.cardImage = 'กรุณาถ่ายรูปบัตรหรืออัปโหลดรูปภาพบัตรที่แลก';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Form (Ultra Fast + Non-blocking Parallel Delivery)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);

    if (!validateForm()) {
      const firstErrorEl = document.querySelector('.has-error, input:invalid');
      if (firstErrorEl) {
        firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setIsSubmitting(true);
    setTelegramStatus('กำลังบันทึกข้อมูลและส่งแจ้งเตือน...');

    const actualWorkType = workType === 'อื่นๆ (ระบุเอง)' && customWorkType ? customWorkType.trim() : workType;
    const finalEquipments = [...selectedEquipments];

    const now = new Date();
    const timestampStr = now.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });

    const newRecordData = {
      timestamp: timestampStr,
      name: name.trim(),
      company: company.trim(),
      phone: cleanPhoneNumber(phone.trim()),
      department: department,
      workType: actualWorkType,
      workDetails: workDetails.trim() || undefined,
      visitorCount: Number(visitorCount) || 1,
      cardImageUrl: cardImage,
      vehicleType: vehicleType,
      licensePlate: vehicleType === 'ไม่มีพาหนะ/เดินเท้า' ? '-' : (licensePlate.trim() || '-'),
      equipmentHandled: finalEquipments,
      contactRole: role,
      notes: notes.trim() || undefined,
      createdDate: now.toISOString(),
    };

    // 1. Instant Local Save & Show Success Pass Immediately
    const savedRecord = StorageService.addVisitorRecord(newRecordData);
    onRecordAdded(savedRecord);
    setSubmittedRecord(savedRecord);
    setIsSubmitting(false);

    // Celebration Confetti
    try {
      confetti({
        particleCount: 70,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {}

    // 2. Parallel Background Sync (LINE Flex Card + Telegram + Google Sheets)
    const backgroundTasks: Promise<any>[] = [];

    // Task A: LINE Messaging API Flex Message Card
    if (sendLine) {
      backgroundTasks.push(
        sendLineFlexNotification(savedRecord).then(res => {
          if (res.success) {
            setLineStatus('✅ ส่งการ์ดแจ้งเตือน Flex Card เข้า LINE สำเร็จ');
          } else {
            setLineStatus(`⚠️ LINE แจ้งเตือนไม่สำเร็จ: ${res.message || ''}`);
          }
          return res;
        }).catch(err => {
          setLineStatus(`⚠️ เกิดข้อผิดพลาดส่ง LINE: ${err.message}`);
        })
      );
    } else {
      setLineStatus(null);
    }

    // Task B: Google Sheets Webhook (Visitor_Logs)
    backgroundTasks.push(
      GoogleSheetsService.sendRecordToGoogleSheet(savedRecord).catch(err => {
        console.warn('Google Sheets background sync notice:', err);
        return { success: false, message: err?.message };
      })
    );

    // Task C: Telegram Notification (with photo)
    if (sendTelegram) {
      const telegramMessage = formatVisitorTelegramMessage(savedRecord);
      backgroundTasks.push(
        sendTelegramNotification(
          telegramMessage,
          undefined,
          savedRecord.cardImageUrl || cardImage || undefined
        ).then(res => {
          if (res.success) {
            setTelegramStatus('✅ ส่งการแจ้งเตือนและรูปภาพเข้า Telegram สำเร็จ');
          } else {
            setTelegramStatus(`⚠️ บันทึกสำเร็จแล้ว แต่ Telegram แจ้งเตือนไม่สำเร็จ: ${res.error || ''}`);
          }
          return res;
        }).catch(err => {
          setTelegramStatus(`⚠️ เกิดข้อผิดพลาดส่ง Telegram: ${err.message}`);
        })
      );
    } else {
      setTelegramStatus(null);
    }

    // Execute in parallel without blocking user interaction
    Promise.allSettled(backgroundTasks);
  };

  const handleResetForNew = () => {
    setName('');
    setCompany('');
    setCompanySearch('');
    setPhone('');
    setSelectedEquipments([]);
    setCustomEquipment('');
    setCardImage('');
    setLicensePlate('');
    setNotes('');
    setWorkDetails('');
    setCustomWorkType('');
    setSubmittedRecord(null);
    setTelegramStatus(null);
    setLineStatus(null);
    setFormErrors({});
    setSubmitAttempted(false);
  };

  // If already submitted, show instant confirmation / visitor badge card
  if (submittedRecord) {
    return (
      <div id="checkin-success-view" className="max-w-2xl mx-auto py-8 px-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-200 shadow-2xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              บันทึกการเข้าติดต่อสำเร็จ
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              ระบบได้บันทึกประวัติการเข้าปฏิบัติงานและอัปเดตสมุดติดต่อคู่ค้าเรียบร้อยแล้ว
            </p>
            
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              {lineStatus && (
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  lineStatus.startsWith('✅') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}>
                  <span>💬</span>
                  <span>{lineStatus}</span>
                </div>
              )}
              {telegramStatus && (
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  telegramStatus.startsWith('✅') ? 'bg-blue-50 text-blue-800 border border-blue-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}>
                  <Send className="w-3.5 h-3.5 text-blue-600" />
                  <span>{telegramStatus}</span>
                </div>
              )}
            </div>
          </div>

          {/* Visitor Pass Summary Card */}
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 shadow-2xs mb-6 relative overflow-hidden">
            <div className="flex justify-between items-start border-b border-slate-200 pb-3 mb-4">
              <div>
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-widest block">
                  VISITOR PASS / บัตรผ่านเข้าปฏิบัติงาน
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                  {submittedRecord.name}
                </h3>
                <p className="text-xs text-slate-600 font-medium">
                  {submittedRecord.company} ({submittedRecord.contactRole})
                </p>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-500 block uppercase font-medium">เวลาบันทึก</span>
                <span className="text-xs font-mono font-bold text-slate-800">{submittedRecord.timestamp}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block font-medium">แผนกที่เข้าติดต่อ:</span>
                <span className="font-bold text-slate-900">{submittedRecord.department}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">ลักษณะงาน:</span>
                <span className="font-semibold text-slate-900 inline-block px-2 py-0.5 rounded bg-blue-100/80 text-blue-800 text-[11px] mt-0.5">
                  {submittedRecord.workType}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">ยานพาหนะ / ทะเบียน:</span>
                <span className="font-bold text-slate-900">
                  {submittedRecord.vehicleType} {submittedRecord.licensePlate ? `(${submittedRecord.licensePlate})` : ''}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">เบอร์โทรติดต่อ:</span>
                <span className="font-bold font-mono text-slate-900">{submittedRecord.phone}</span>
              </div>
              {submittedRecord.workDetails && (
                <div className="col-span-1 sm:col-span-2 pt-1">
                  <span className="text-slate-500 block font-medium">รายละเอียดงาน:</span>
                  <span className="font-semibold text-slate-800 text-[11px] block mt-0.5 bg-slate-100 p-2 rounded-lg border border-slate-200">
                    {submittedRecord.workDetails}
                  </span>
                </div>
              )}
              {submittedRecord.equipmentHandled && submittedRecord.equipmentHandled.length > 0 && (
                <div className="col-span-1 sm:col-span-2 pt-1">
                  <span className="text-slate-500 block mb-1 font-medium">เครื่องมือแพทย์ที่ดูแล:</span>
                  <div className="flex flex-wrap gap-1">
                    {submittedRecord.equipmentHandled.map((eq, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-slate-200/80 text-slate-800 text-[11px] font-medium">
                        {eq}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Retention Notice */}
            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1 font-medium">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>รูปภาพแนบจะถูกลบอัตโนมัติใน 5 วัน (PDPA)</span>
              </span>
              <span className="font-mono text-slate-400">ID: {submittedRecord.id}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              id="new-checkin-btn"
              onClick={handleResetForNew}
              className="flex-1 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>บันทึกผู้มาติดต่อคนถัดไป</span>
            </button>
            <button
              id="view-logs-after-checkin-btn"
              onClick={onViewLogs}
              className="py-2.5 px-5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>ดูประวัติทั้งหมด</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="checkin-form-container" className="max-w-3xl mx-auto py-5 px-3.5 sm:px-6">
      {/* Header Banner - Modern, Friendly & Balanced */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-600 rounded-2xl p-5 sm:p-6 text-white shadow-sm mb-5 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-xs text-white text-[11px] font-semibold mb-2 border border-white/20">
            <span>👋 ยินดีต้อนรับ</span>
            <span>•</span>
            <span>BME Visitor Hub</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>🏥</span>
            <span>ลงทะเบียนผู้มาติดต่อ & ช่างเครื่องมือแพทย์</span>
          </h1>
          <p className="text-blue-100/90 text-xs mt-1 leading-relaxed">
            บุคคลทั่วไปและตัวแทนบริษัทสามารถบันทึกข้อมูลเข้าพบได้ทันที พร้อมแจ้งเตือนเข้า Telegram กลุ่มงาน BME อัตโนมัติ
          </p>
        </div>
        {/* Subtle decorative circles */}
        <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
      </div>

      {/* Main Registration Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-7 shadow-xs border border-slate-200/80">
        {submitAttempted && Object.keys(formErrors).length > 0 && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-rose-900">กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน:</p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-700">
                {Object.values(formErrors).map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>

          {/* Section 1: Personal & Company Info */}
          <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-200/70">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3 pb-1 border-b border-slate-200/60">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>👤</span>
                <span>1. ข้อมูลผู้มาติดต่อ & บริษัท</span>
              </h3>
              <span className="text-[10px] font-semibold text-slate-400">Visitor & Company</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อ - นามสกุล <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="visitor-name-input"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
                    }}
                    placeholder="เช่น สมศักดิ์ ใจดี"
                    className={`w-full pl-8 pr-3 py-2 rounded-lg border text-xs text-slate-900 bg-white transition-all ${
                      formErrors.name
                        ? 'border-rose-500 ring-2 ring-rose-500/20'
                        : 'border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600'
                    }`}
                  />
                  <span className="absolute left-2.5 top-2 text-xs">👤</span>
                </div>
                {formErrors.name && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {formErrors.name}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เบอร์โทรศัพท์ติดต่อ <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="visitor-phone-input"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (formErrors.phone) setFormErrors({ ...formErrors, phone: '' });
                    }}
                    placeholder="เช่น 081-234-5678"
                    className={`w-full pl-8 pr-3 py-2 rounded-lg border text-xs text-slate-900 bg-white transition-all ${
                      formErrors.phone
                        ? 'border-rose-500 ring-2 ring-rose-500/20'
                        : 'border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600'
                    }`}
                  />
                  <span className="absolute left-2.5 top-2 text-xs">📞</span>
                </div>
                {formErrors.phone && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {formErrors.phone}
                  </p>
                )}
              </div>

              {/* Company */}
              <div className="relative" ref={companyDropdownRef}>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    บริษัท / สังกัด <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-blue-700 font-semibold bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200/60">
                    🏢 คู่สัญญา
                  </span>
                </div>

                <div className="relative">
                  <input
                    id="visitor-company-input"
                    type="text"
                    required
                    value={company}
                    onFocus={() => {
                      setIsCompanyDropdownOpen(true);
                      setCompanySearch(company);
                    }}
                    onChange={(e) => {
                      setCompany(e.target.value);
                      setCompanySearch(e.target.value);
                      setIsCompanyDropdownOpen(true);
                      if (formErrors.company) setFormErrors({ ...formErrors, company: '' });
                    }}
                    placeholder="พิมพ์ค้นหา หรือเลือกจากรายชื่อบริษัท..."
                    className={`w-full pl-8 pr-7 py-2 rounded-lg border text-xs text-slate-900 bg-white transition-all ${
                      formErrors.company
                        ? 'border-rose-500 ring-2 ring-rose-500/20'
                        : 'border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600'
                    }`}
                  />
                  <span className="absolute left-2.5 top-2 text-xs">🏢</span>
                  <button
                    type="button"
                    onClick={() => setIsCompanyDropdownOpen(!isCompanyDropdownOpen)}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                    title="เปิด/ปิด รายชื่อบริษัท"
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isCompanyDropdownOpen ? 'rotate-180 text-blue-600' : ''}`} />
                  </button>
                </div>
                {formErrors.company && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {formErrors.company}
                  </p>
                )}

                {/* Dropdown Menu */}
                {isCompanyDropdownOpen && (
                  <div
                    id="company-dropdown-menu"
                    className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto divide-y divide-slate-100 animate-in fade-in duration-100"
                  >
                    <div className="p-2 bg-slate-50 sticky top-0 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-600 font-semibold z-10">
                      <span>🏢 รายชื่อบริษัทคู่สัญญา ({filteredCompanies.length})</span>
                    </div>

                    {filteredCompanies.length > 0 ? (
                      filteredCompanies.map((comp, idx) => {
                        const isSelected = company.toLowerCase() === comp.toLowerCase();
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setCompany(comp);
                              setCompanySearch(comp);
                              setIsCompanyDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-blue-50 text-blue-700 font-semibold'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span className="truncate">{comp}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-2.5 text-center text-xs text-slate-500">
                        <p>ไม่พบ "{companySearch}"</p>
                        <button
                          type="button"
                          onClick={() => setIsCompanyDropdownOpen(false)}
                          className="mt-1 text-[11px] text-blue-600 font-semibold hover:underline"
                        >
                          ใช้ชื่อ "{companySearch}" นี้
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Quick company pills */}
                <div className="flex flex-wrap items-center gap-1 mt-1.5">
                  <span className="text-[10px] text-slate-400 font-medium">แนะนำ:</span>
                  {sheetCompanies.slice(0, 5).map((comp, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setCompany(comp);
                        setCompanySearch(comp);
                        setIsCompanyDropdownOpen(false);
                      }}
                      className="text-[10px] font-medium px-1.5 py-0.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 rounded transition-colors cursor-pointer border border-slate-200/50"
                    >
                      {comp}
                    </button>
                  ))}
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ตำแหน่ง / บทบาทของผู้ติดต่อ
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {ROLE_OPTIONS.map((opt) => {
                    const isSelected = role === opt.role;
                    return (
                      <button
                        key={opt.role}
                        type="button"
                        onClick={() => setRole(opt.role)}
                        className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs transition-all text-left cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 font-semibold shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-xs">{opt.emoji}</span>
                        <span className="truncate text-[11px]">{opt.role}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Department & Purpose */}
          <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-200/70">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3 pb-1 border-b border-slate-200/60">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>🏥</span>
                <span>2. แผนกที่เข้าติดต่อ & ลักษณะงาน</span>
              </h3>
              <span className="text-[10px] font-semibold text-slate-400">Department & Scope</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Department */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  แผนกที่เข้ามาติดต่อ <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="visitor-department-select"
                    required
                    value={department}
                    onChange={(e) => {
                      setDepartment(e.target.value);
                      if (formErrors.department) setFormErrors({ ...formErrors, department: '' });
                    }}
                    className={`w-full pl-8 pr-3 py-2 rounded-lg border text-xs text-slate-900 bg-white transition-all ${
                      formErrors.department
                        ? 'border-rose-500 ring-2 ring-rose-500/20'
                        : 'border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600'
                    }`}
                  >
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.name}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                  <span className="absolute left-2.5 top-2 text-xs">🏥</span>
                </div>
                {formErrors.department && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {formErrors.department}
                  </p>
                )}
              </div>

              {/* Visitor Count */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  จำนวนผู้มาติดต่อ (คน) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="visitor-count-input"
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={visitorCount}
                    onChange={(e) => {
                      setVisitorCount(Math.max(1, parseInt(e.target.value) || 1));
                      if (formErrors.visitorCount) setFormErrors({ ...formErrors, visitorCount: '' });
                    }}
                    className={`w-full pl-8 pr-3 py-2 rounded-lg border text-xs text-slate-900 bg-white transition-all ${
                      formErrors.visitorCount
                        ? 'border-rose-500 ring-2 ring-rose-500/20'
                        : 'border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600'
                    }`}
                  />
                  <span className="absolute left-2.5 top-2 text-xs">👥</span>
                </div>
                {formErrors.visitorCount && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {formErrors.visitorCount}
                  </p>
                )}
              </div>

              {/* Work Type Selection */}
              <div className="col-span-1 md:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    ลักษณะงานที่เข้ามาปฏิบัติงาน <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-500">เลือกด่วนจากปุ่ม หรือ Dropdown</span>
                </div>

                {/* Quick Work Type Pills */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {WORK_TYPES.map((wt) => {
                    const isSelected = workType === wt;
                    const emoji = WORK_TYPE_EMOJIS[wt] || '🛠️';
                    return (
                      <button
                        key={wt}
                        type="button"
                        onClick={() => {
                          setWorkType(wt);
                          if (formErrors.workType) setFormErrors({ ...formErrors, workType: '' });
                        }}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 font-semibold shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200/90 hover:bg-blue-50/50 hover:border-blue-200'
                        }`}
                      >
                        <span>{emoji}</span>
                        <span className="text-[11px]">{wt}</span>
                      </button>
                    );
                  })}
                </div>

                {workType === 'อื่นๆ (ระบุเอง)' && (
                  <input
                    type="text"
                    required
                    value={customWorkType}
                    onChange={(e) => {
                      setCustomWorkType(e.target.value);
                      if (formErrors.workType) setFormErrors({ ...formErrors, workType: '' });
                    }}
                    placeholder="ระบุลักษณะงานเพิ่มเติม..."
                    className="w-full mt-1.5 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-xs bg-white"
                  />
                )}
                {formErrors.workType && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {formErrors.workType}
                  </p>
                )}
              </div>

              {/* Work Details (รายละเอียดงาน) */}
              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <span>🛠️</span>
                  <span>รายละเอียดงาน (ระบุรายละเอียดที่เข้ามาดำเนินการ)</span>
                </label>
                <textarea
                  id="visitor-work-details"
                  rows={2}
                  value={workDetails}
                  onChange={(e) => setWorkDetails(e.target.value)}
                  placeholder="เช่น เปลี่ยนชุดบอร์ดไฟ, ทำ PM รอบ 6 เดือน, ทดสอบค่ารังสี Calibrate, สอนการใช้งาน..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-xs resize-none bg-white"
                />
              </div>

              {/* Equipment Multi-select with Search and Brand Support */}
              <div className="col-span-1 md:col-span-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <span>🧰</span>
                    <span>เครื่องมือแพทย์ที่ดูแล / ปฏิบัติงาน</span>
                    <span className="text-rose-500 font-bold">* (เลือกอย่างน้อย 1 รายการ)</span>
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">
                    (ดึงจากชีท Data_equpment รวม {equipmentList.length} รายการ)
                  </span>
                </div>

                {/* Real-time Search Box & Brand Filter */}
                <div className="space-y-2 mb-2.5">
                  <div className="relative">
                    <input
                      type="text"
                      value={equipmentSearch}
                      onChange={(e) => setEquipmentSearch(e.target.value)}
                      placeholder="🔍 พิมพ์เพื่อค้นหาเครื่องมือแพทย์ หรือ ยี่ห้อ (เช่น CT, X-Ray, GE, Philips, อัลตราซาวด์, กล้อง, Draeger...)"
                      className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-2xs"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    {equipmentSearch && (
                      <button
                        type="button"
                        onClick={() => setEquipmentSearch('')}
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                        title="ล้างคำค้นหา"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Quick Brand Filter Pills */}
                  {availableBrands.length > 0 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                      <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap flex items-center gap-0.5">
                        🏷️ ยี่ห้อ:
                      </span>
                      <button
                        type="button"
                        onClick={() => setEquipmentBrandFilter('all')}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all whitespace-nowrap cursor-pointer ${
                          equipmentBrandFilter === 'all'
                            ? 'bg-slate-800 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        ทั้งหมด ({equipmentList.length})
                      </button>
                      {availableBrands.slice(0, 10).map(brand => {
                        const isBrandActive = equipmentBrandFilter.toLowerCase() === brand.toLowerCase();
                        return (
                          <button
                            key={brand}
                            type="button"
                            onClick={() => setEquipmentBrandFilter(isBrandActive ? 'all' : brand)}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all whitespace-nowrap cursor-pointer ${
                              isBrandActive
                                ? 'bg-amber-600 text-white font-semibold shadow-2xs'
                                : 'bg-amber-50 text-amber-900 border border-amber-200/70 hover:bg-amber-100'
                            }`}
                          >
                            {brand}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Equipment List Grid / Box */}
                <div className={`p-2.5 rounded-xl border transition-all ${
                  formErrors.equipments
                    ? 'bg-rose-50/40 border-rose-400 ring-2 ring-rose-500/20'
                    : 'bg-slate-50/70 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2 px-1">
                    <span>
                      ผลการค้นหา: <strong className="text-slate-700">{filteredEquipmentList.length}</strong> รายการ
                      {equipmentSearch && <span> (ตรงกับ "{equipmentSearch}")</span>}
                    </span>
                    {selectedEquipments.length > 0 && (
                      <span className="text-blue-700 font-semibold">
                        เลือกแล้ว {selectedEquipments.length} รายการ
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-52 overflow-y-auto pr-1">
                    {filteredEquipmentList.length === 0 ? (
                      <div className="w-full text-center py-4 px-2">
                        <p className="text-xs text-slate-500 mb-2">
                          ไม่พบเครื่องมือแพทย์ที่ตรงกับ <strong>"{equipmentSearch}"</strong>
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomEquipment(equipmentSearch);
                            setEquipmentSearch('');
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors cursor-pointer"
                        >
                          <span>+ นำ "{equipmentSearch}" ไปเพิ่มเป็นเครื่องมือระบุเอง</span>
                        </button>
                      </div>
                    ) : (
                      filteredEquipmentList.map((eq) => {
                        const isSelected = isEquipmentSelected(eq);
                        const displayNameTh = eq.nameTh || translateMedicalEquipmentToThai(eq.name, eq.category);
                        return (
                          <button
                            key={eq.id || eq.name}
                            type="button"
                            onClick={() => {
                              handleToggleEquipment(eq);
                              if (formErrors.equipments) setFormErrors({ ...formErrors, equipments: '' });
                            }}
                            className={`group text-xs px-2.5 py-1.5 rounded-lg border transition-all text-left flex flex-col gap-0.5 cursor-pointer max-w-full ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600 font-medium shadow-2xs ring-2 ring-blue-400/30'
                                : 'bg-white text-slate-700 border-slate-200/90 hover:bg-blue-50/50 hover:border-blue-300'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${
                                isSelected ? 'bg-white text-blue-700 font-bold' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {isSelected ? '✓' : '+'}
                              </span>
                              <span className="text-[11px] font-bold tracking-tight">
                                {eq.name}
                              </span>
                              {eq.brand && (
                                <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold whitespace-nowrap ${
                                  isSelected
                                    ? 'bg-blue-800 text-amber-200 border border-blue-400/50'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                                }`}>
                                  🏷️ {eq.brand}
                                </span>
                              )}
                            </div>
                            {displayNameTh && (
                              <span className={`text-[10px] pl-5 ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                                🇹🇭 {displayNameTh}
                              </span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Selected Equipments Display Tag Cloud */}
                {selectedEquipments.length > 0 && (
                  <div className="mt-2.5 p-2 bg-blue-50/60 border border-blue-200/80 rounded-xl">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-blue-900 flex items-center gap-1">
                        <span>✅</span>
                        <span>รายการเครื่องมือแพทย์ที่เลือก ({selectedEquipments.length} รายการ):</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedEquipments([])}
                        className="text-[10px] text-rose-600 hover:text-rose-800 hover:underline font-semibold"
                      >
                        ล้างทั้งหมด
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {selectedEquipments.map((eq, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 bg-white text-blue-900 border border-blue-300 rounded-lg font-semibold shadow-2xs"
                        >
                          <span>{eq}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSelectedEquipment(eq)}
                            className="w-4 h-4 rounded-full bg-blue-100 hover:bg-rose-500 hover:text-white text-blue-700 flex items-center justify-center font-bold text-xs transition-colors cursor-pointer"
                            title="ลบรายการนี้"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add Custom Equipment & Brand Input Form */}
                <div className="mt-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                    <span>➕</span>
                    <span>เพิ่มเครื่องมือแพทย์ระบุเอง (กรณีไม่มีในรายการ)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-6">
                      <input
                        type="text"
                        value={customEquipment}
                        onChange={(e) => setCustomEquipment(e.target.value)}
                        placeholder="ชื่อเครื่องมือแพทย์ เช่น หัวตรวจอัลตราซาวด์, Defibrillator..."
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomEquipment();
                            if (formErrors.equipments) setFormErrors({ ...formErrors, equipments: '' });
                          }
                        }}
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <input
                        type="text"
                        value={customEquipmentBrand}
                        onChange={(e) => setCustomEquipmentBrand(e.target.value)}
                        placeholder="ยี่ห้อ (Brand) เช่น GE, Philips, Mindray..."
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomEquipment();
                            if (formErrors.equipments) setFormErrors({ ...formErrors, equipments: '' });
                          }
                        }}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <button
                        type="button"
                        onClick={() => {
                          handleAddCustomEquipment();
                          if (formErrors.equipments) setFormErrors({ ...formErrors, equipments: '' });
                        }}
                        className="w-full h-full py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>เพิ่ม</span>
                      </button>
                    </div>
                  </div>
                </div>

                {formErrors.equipments && (
                  <p className="text-[11px] text-rose-600 mt-1.5 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {formErrors.equipments}
                  </p>
                )}
              </div>

              {/* Additional Notes */}
              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  📝 หมายเหตุเพิ่มเติม (ถ้ามี)
                </label>
                <input
                  id="visitor-notes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="เช่น มาแทนช่างประจำ, โทรนัดหมายไว้ล่วงหน้า..."
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-xs bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Vehicle & License Plate */}
          <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-200/70">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3 pb-1 border-b border-slate-200/60">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>🚗</span>
                <span>3. ข้อมูลยานพาหนะ & ทะเบียน</span>
              </h3>
              <span className="text-[10px] font-semibold text-slate-400">Vehicle Info</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Vehicle Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ประเภทยานพาหนะ <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {VEHICLE_OPTIONS.map((opt) => {
                    const isSelected = vehicleType === opt.type;
                    return (
                      <button
                        key={opt.type}
                        type="button"
                        onClick={() => {
                          setVehicleType(opt.type);
                          if (formErrors.vehicleType) setFormErrors({ ...formErrors, vehicleType: '' });
                          if (opt.type === 'ไม่มีพาหนะ/เดินเท้า' && formErrors.licensePlate) {
                            setFormErrors({ ...formErrors, licensePlate: '' });
                          }
                        }}
                        className={`flex items-center gap-1.5 p-2 rounded-lg border text-xs font-medium transition-all text-left cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 font-semibold shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span>{opt.emoji}</span>
                        <span className="truncate text-[11px]">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
                {formErrors.vehicleType && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {formErrors.vehicleType}
                  </p>
                )}
              </div>

              {/* License Plate Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เลขทะเบียนยานพาหนะ {vehicleType !== 'ไม่มีพาหนะ/เดินเท้า' ? <span className="text-rose-500">*</span> : <span className="text-slate-400">(ถ้ามี)</span>}
                </label>
                <div className="relative">
                  <input
                    id="license-plate-input"
                    type="text"
                    required={vehicleType !== 'ไม่มีพาหนะ/เดินเท้า'}
                    value={licensePlate}
                    onChange={(e) => {
                      setLicensePlate(e.target.value);
                      if (formErrors.licensePlate) setFormErrors({ ...formErrors, licensePlate: '' });
                    }}
                    placeholder={vehicleType === 'ไม่มีพาหนะ/เดินเท้า' ? 'ไม่มีพาหนะ' : 'เช่น 2ขต 5189, 1กข 1234 กทม'}
                    className={`w-full pl-8 pr-3 py-2 rounded-lg border text-xs font-mono text-slate-900 bg-white transition-all ${
                      formErrors.licensePlate
                        ? 'border-rose-500 ring-2 ring-rose-500/20'
                        : 'border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600'
                    }`}
                  />
                  <span className="absolute left-2.5 top-2 text-xs">🚗</span>
                </div>
                {formErrors.licensePlate ? (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {formErrors.licensePlate}
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-400 mt-1">
                    สำหรับความปลอดภัยและการจัดระเบียบการจราจรใน รพ.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Card Image Attachment */}
          <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-200/70">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3 pb-1 border-b border-slate-200/60">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>🪪</span>
                <span>4. แนบรูปบัตรที่แลกแล้ว <span className="text-rose-500">*</span></span>
              </h3>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/70">
                <Clock className="w-3 h-3 text-amber-600" />
                <span>ลบอัตโนมัติ 5 วัน (PDPA)</span>
              </span>
            </div>

            <div className={`rounded-xl p-3.5 border border-dashed transition-all ${
              formErrors.cardImage
                ? 'bg-rose-50/60 border-rose-400 ring-2 ring-rose-500/20'
                : 'bg-white border-slate-300'
            }`}>
              {formErrors.cardImage && (
                <div className="mb-2.5 p-2 rounded-lg bg-rose-100 border border-rose-300 text-rose-800 text-xs font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>{formErrors.cardImage}</span>
                </div>
              )}
              {cardImage ? (
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <img
                    src={cardImage}
                    alt="Card Preview"
                    className="w-32 h-24 object-cover rounded-lg border-2 border-blue-600 shadow-2xs"
                  />
                  <div className="space-y-1.5 text-center sm:text-left">
                    <p className="text-xs font-bold text-slate-900 flex items-center gap-1 justify-center sm:justify-start">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>แนบรูปบัตรเรียบร้อยแล้ว</span>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      ระบบจะจัดเก็บชั่วคราวและลบอัตโนมัติใน 5 วันตามนโยบาย PDPA
                    </p>
                    <button
                      type="button"
                      onClick={() => setCardImage('')}
                      className="text-[11px] px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-md font-semibold transition-colors cursor-pointer"
                    >
                      ลบรูป / ถ่ายใหม่
                    </button>
                  </div>
                </div>
              ) : isCameraActive ? (
                <div className="space-y-2.5 text-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full max-w-xs mx-auto h-48 object-cover rounded-xl bg-black shadow-inner"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>ถ่ายรูปบัตร</span>
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-300 cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 py-3 text-center">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-3.5 py-2 bg-slate-50 border border-slate-300 hover:border-blue-500 hover:bg-blue-50/40 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>📷</span>
                    <span>ถ่ายรูปด้วยกล้อง</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 bg-slate-50 border border-slate-300 hover:border-blue-500 hover:bg-blue-50/40 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>📁</span>
                    <span>เลือกไฟล์รูปจากเครื่อง</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section 5: Instant Realtime Notifications */}
          <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>🔔</span>
                <span>ระบบแจ้งเตือนอัตโนมัติแบบทันที (Instant Alerts)</span>
              </span>
              <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-200">
                ⚡ Real-time Push
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {/* LINE Messaging API Flex Card */}
              <label
                htmlFor="line-toggle"
                className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                  sendLine
                    ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-500'
                }`}
              >
                <input
                  id="line-toggle"
                  type="checkbox"
                  checked={sendLine}
                  onChange={(e) => setSendLine(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300 cursor-pointer"
                />
                <div className="flex flex-col">
                  <span className="font-bold flex items-center gap-1">
                    <span>💬</span>
                    <span>LINE Flex Card Alert</span>
                  </span>
                  <span className="text-[10px] text-emerald-700/80">ส่งการ์ดข้อมูลติดต่อเข้า LINE OA ทันที</span>
                </div>
              </label>

              {/* Telegram Alert */}
              <label
                htmlFor="telegram-toggle"
                className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                  sendTelegram
                    ? 'bg-blue-50/80 border-blue-300 text-blue-950 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-500'
                }`}
              >
                <input
                  id="telegram-toggle"
                  type="checkbox"
                  checked={sendTelegram}
                  onChange={(e) => setSendTelegram(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-slate-300 cursor-pointer"
                />
                <div className="flex flex-col">
                  <span className="font-bold flex items-center gap-1">
                    <span>✈️</span>
                    <span>Telegram Bot Alert</span>
                  </span>
                  <span className="text-[10px] text-blue-700/80">ส่งรูปบัตรและรายละเอียดเข้ากลุ่ม BME</span>
                </div>
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-1">
            <button
              id="submit-visitor-checkin-btn"
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer active:scale-[0.99]"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>กำลังบันทึกข้อมูลและส่งการ์ดแจ้งเตือน...</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>บันทึกการเข้าติดต่อ & ส่งการ์ดแจ้งเตือน LINE / Telegram ทันที</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
