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
  Languages
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
  const [workType, setWorkType] = useState('งานซ่อม');
  const [customWorkType, setCustomWorkType] = useState('');
  const [visitorCount, setVisitorCount] = useState<number>(1);
  const [vehicleType, setVehicleType] = useState<VehicleType>('รถยนต์ส่วนบุคคล');
  const [licensePlate, setLicensePlate] = useState('');
  const [selectedEquipments, setSelectedEquipments] = useState<string[]>([]);
  const [customEquipment, setCustomEquipment] = useState('');
  const [cardImage, setCardImage] = useState<string>('');
  const [sendTelegram, setSendTelegram] = useState<boolean>(true);
  const [notes, setNotes] = useState('');
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

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

  // Common quick work types
  const WORK_TYPES = [
    'งานซ่อม',
    'งาน PM',
    'DEMO',
    'Training (สอนใช้งาน)',
    'ติดตั้ง',
    'ส่งมอบสินค้า / ส่งเครื่อง',
    'ตรวจกรมวิทย์ (สอบเทียบรังสี)',
    'สอบเทียบเครื่องมือ',
    'สำรวจหน้างาน / ดูพื้นที่',
    'ตรวจเช็คเครื่อง',
    'อื่นๆ (ระบุเอง)',
  ];

  // Common vehicle types
  const VEHICLE_OPTIONS: { type: VehicleType; icon: React.ReactNode; label: string }[] = [
    { type: 'รถยนต์ส่วนบุคคล', icon: <Car className="w-4 h-4" />, label: 'รถยนต์ส่วนบุคคล / รถเก๋ง / กระบะ' },
    { type: 'จักรยานยนต์', icon: <Bike className="w-4 h-4" />, label: 'จักรยานยนต์' },
    { type: 'รถบรรทุก 4 ล้อ', icon: <Truck className="w-4 h-4" />, label: 'รถบรรทุก 4 ล้อ' },
    { type: 'รถบรรทุก 6 ล้อ', icon: <Truck className="w-4 h-4" />, label: 'รถบรรทุก 6 ล้อ' },
    { type: 'รถบรรทุก 10 ล้อ', icon: <Truck className="w-4 h-4" />, label: 'รถบรรทุก 10 ล้อ' },
    { type: 'ไม่มีพาหนะ/เดินเท้า', icon: <User className="w-4 h-4" />, label: 'ไม่มีพาหนะ / เดินเท้า' },
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

  // Handle Equipment toggling
  const handleToggleEquipment = (eqName: string) => {
    setSelectedEquipments(prev =>
      prev.includes(eqName) ? prev.filter(e => e !== eqName) : [...prev, eqName]
    );
  };

  const handleAddCustomEquipment = () => {
    if (customEquipment.trim() && !selectedEquipments.includes(customEquipment.trim())) {
      setSelectedEquipments(prev => [...prev, customEquipment.trim()]);
      setCustomEquipment('');
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

    // 2. Parallel Background Sync (Telegram + Google Sheets)
    const backgroundTasks: Promise<any>[] = [];

    // Task A: Google Sheets Webhook (Visitor_Logs)
    backgroundTasks.push(
      GoogleSheetsService.sendRecordToGoogleSheet(savedRecord).catch(err => {
        console.warn('Google Sheets background sync notice:', err);
        return { success: false, message: err?.message };
      })
    );

    // Task B: Telegram Notification (with photo)
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
      setTelegramStatus('✅ บันทึกข้อมูลเรียบร้อยแล้ว');
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
    setCustomWorkType('');
    setSubmittedRecord(null);
    setTelegramStatus(null);
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
            {telegramStatus && (
              <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                <Send className="w-3.5 h-3.5 text-blue-600" />
                <span>{telegramStatus}</span>
              </div>
            )}
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
    <div id="checkin-form-container" className="max-w-4xl mx-auto py-6 px-4 sm:px-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-blue-950 rounded-2xl p-6 sm:p-7 text-white shadow-sm border border-slate-800 mb-6 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-200 text-[11px] font-bold mb-2.5 border border-blue-400/30 uppercase tracking-wide">
            <Sparkles className="w-3 h-3 text-blue-300" />
            <span>Visitor BME</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            ลงทะเบียนผู้มาติดต่อ & ช่างเครื่องมือแพทย์
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1.5 leading-relaxed">
            บุคคลทั่วไปและตัวแทนบริษัทสามารถบันทึกข้อมูลเข้าพบได้ทันที (ไม่ต้องใช้บัญชี Google)
            พร้อมระบบแจ้งเตือนไปยังกลุ่มงาน BME ผ่าน Telegram แบบเรียลไทม์
          </p>
        </div>
        {/* Subtle decorative grid/overlay */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-blue-600/10 transform skew-x-12 pointer-events-none"></div>
      </div>

      {/* Main Registration Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200">
        {submitAttempted && Object.keys(formErrors).length > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-rose-900">กรุณากรอกข้อมูลให้ครบทุกช่องก่อนกดบันทึก:</p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-700">
                {Object.values(formErrors).map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>

          {/* Section 1: Personal & Company Info */}
          <div>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4 pb-1 border-b border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                <span>1. ข้อมูลผู้มาติดต่อ & บริษัท</span>
              </h3>
              <span className="text-[11px] font-semibold text-slate-400">Visitor Info</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                    className={`w-full pl-9 pr-4 py-2.5 rounded-lg border text-xs text-slate-900 bg-white transition-all ${
                      formErrors.name
                        ? 'border-rose-500 ring-2 ring-rose-500/20'
                        : 'border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600'
                    }`}
                  />
                  <User className={`w-4 h-4 absolute left-3 top-2.5 ${formErrors.name ? 'text-rose-500' : 'text-slate-400'}`} />
                </div>
                {formErrors.name && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {formErrors.name}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                    className={`w-full pl-9 pr-4 py-2.5 rounded-lg border text-xs text-slate-900 bg-white transition-all ${
                      formErrors.phone
                        ? 'border-rose-500 ring-2 ring-rose-500/20'
                        : 'border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600'
                    }`}
                  />
                  <Phone className={`w-4 h-4 absolute left-3 top-2.5 ${formErrors.phone ? 'text-rose-500' : 'text-slate-400'}`} />
                </div>
                {formErrors.phone && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {formErrors.phone}
                  </p>
                )}
              </div>

              {/* Company */}
              <div className="relative" ref={companyDropdownRef}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    บริษัท / สังกัด <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    รายชื่อบริษัทคู่สัญญา
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
                    className={`w-full pl-9 pr-8 py-2.5 rounded-lg border text-xs text-slate-900 bg-white transition-all ${
                      formErrors.company
                        ? 'border-rose-500 ring-2 ring-rose-500/20'
                        : 'border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600'
                    }`}
                  />
                  <Building2 className={`w-4 h-4 absolute left-3 top-2.5 ${formErrors.company ? 'text-rose-500' : 'text-slate-400'}`} />
                  <button
                    type="button"
                    onClick={() => setIsCompanyDropdownOpen(!isCompanyDropdownOpen)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                    title="เปิด/ปิด รายชื่อบริษัท"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isCompanyDropdownOpen ? 'rotate-180 text-blue-600' : ''}`} />
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
                    className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto divide-y divide-slate-100 animate-in fade-in slide-in-from-top-1 duration-150"
                  >
                    {/* Header in dropdown */}
                    <div className="p-2.5 bg-slate-50 sticky top-0 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-600 font-semibold z-10">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>รายชื่อบริษัทคู่สัญญา ({filteredCompanies.length}/{sheetCompanies.length})</span>
                      </div>
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
                            className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
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
                      <div className="p-3 text-center text-xs text-slate-500">
                        <p>ไม่พบบริษัท "{companySearch}" ในระบบ</p>
                        <button
                          type="button"
                          onClick={() => setIsCompanyDropdownOpen(false)}
                          className="mt-1.5 text-[11px] text-blue-600 font-semibold hover:underline"
                        >
                          ใช้ชื่อ "{companySearch}" นี้
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Popular company tags */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-400 font-medium">เลือกด่วน:</span>
                  {sheetCompanies.slice(0, 6).map((comp, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setCompany(comp);
                        setCompanySearch(comp);
                        setIsCompanyDropdownOpen(false);
                      }}
                      className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 rounded transition-colors cursor-pointer border border-slate-200/60"
                    >
                      {comp}
                    </button>
                  ))}
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  ตำแหน่ง / บทบาทของผู้ติดต่อ
                </label>
                <select
                  id="visitor-role-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value as ContactRole)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-xs text-slate-900 bg-white"
                >
                  <option value="ช่าง">ช่าง / Service Engineer / วิศวกรบริการ</option>
                  <option value="ผู้แทน">ผู้แทน / Sales Representative</option>
                  <option value="สเปเชียลลิสต์/ผู้เชี่ยวชาญ">สเปเชียลลิสต์ / Product Specialist</option>
                  <option value="เจ้าหน้าที่ส่งสินค้า">เจ้าหน้าที่ส่งมอบสินค้า / Delivery</option>
                  <option value="อื่นๆ">อื่นๆ</option>
                </select>
              </div>
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Section 2: Department & Purpose */}
          <div>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4 pb-1 border-b border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                <span>2. แผนกที่เข้าติดต่อ & ลักษณะงาน</span>
              </h3>
              <span className="text-[11px] font-semibold text-slate-400">Department & Task</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Department */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                    className={`w-full pl-9 pr-4 py-2.5 rounded-lg border text-xs text-slate-900 bg-white transition-all ${
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
                  <Layers className={`w-4 h-4 absolute left-3 top-2.5 ${formErrors.department ? 'text-rose-500' : 'text-slate-400'}`} />
                </div>
                {formErrors.department && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {formErrors.department}
                  </p>
                )}
              </div>

              {/* Work Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  ลักษณะงานที่เข้ามาปฏิบัติงาน <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="visitor-worktype-select"
                    required
                    value={workType}
                    onChange={(e) => {
                      setWorkType(e.target.value);
                      if (formErrors.workType) setFormErrors({ ...formErrors, workType: '' });
                    }}
                    className={`w-full pl-9 pr-4 py-2.5 rounded-lg border text-xs text-slate-900 bg-white transition-all ${
                      formErrors.workType
                        ? 'border-rose-500 ring-2 ring-rose-500/20'
                        : 'border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600'
                    }`}
                  >
                    {WORK_TYPES.map((wt, i) => (
                      <option key={i} value={wt}>
                        {wt}
                      </option>
                    ))}
                  </select>
                  <Wrench className={`w-4 h-4 absolute left-3 top-2.5 ${formErrors.workType ? 'text-rose-500' : 'text-slate-400'}`} />
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
                    className="w-full mt-2 px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-xs"
                  />
                )}
                {formErrors.workType && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {formErrors.workType}
                  </p>
                )}
              </div>

              {/* Visitor Count */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  จำนวนผู้มาติดต่อ (คน) <span className="text-rose-500">*</span>
                </label>
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
                  className={`w-full px-3.5 py-2.5 rounded-lg border text-xs text-slate-900 transition-all ${
                    formErrors.visitorCount
                      ? 'border-rose-500 ring-2 ring-rose-500/20'
                      : 'border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600'
                  }`}
                />
                {formErrors.visitorCount && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {formErrors.visitorCount}
                  </p>
                )}
              </div>

              {/* Equipment Multi-select with Thai Name */}
              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  เครื่องมือแพทย์ที่ดูแล / ปฏิบัติงาน <span className="text-rose-500">* (เลือกอย่างน้อย 1 รายการ)</span>
                </label>
                <div className={`flex flex-wrap gap-1.5 mb-2 max-h-44 overflow-y-auto p-2.5 rounded-xl border transition-all ${
                  formErrors.equipments
                    ? 'bg-rose-50/50 border-rose-400 ring-2 ring-rose-500/20'
                    : 'bg-slate-50 border-slate-200'
                }`}>
                  {equipmentList.slice(0, 20).map((eq) => {
                    const isSelected = selectedEquipments.includes(eq.name);
                    const displayNameTh = eq.nameTh || translateMedicalEquipmentToThai(eq.name, eq.category);
                    return (
                      <button
                        key={eq.id}
                        type="button"
                        onClick={() => {
                          handleToggleEquipment(eq.name);
                          if (formErrors.equipments) setFormErrors({ ...formErrors, equipments: '' });
                        }}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all text-left flex flex-col cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 font-semibold shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-1 font-medium">
                          <span>{isSelected ? '✓ ' : '+ '}</span>
                          <span>{eq.name}</span>
                        </div>
                        {displayNameTh && (
                          <span className={`text-[10px] font-normal ${isSelected ? 'text-blue-100' : 'text-emerald-700 font-medium'}`}>
                            {displayNameTh}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Add Custom Equipment input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customEquipment}
                    onChange={(e) => setCustomEquipment(e.target.value)}
                    placeholder="พิมพ์ชื่อเครื่องมือเพิ่มเติม เช่น ชุดกล้อง GI, X-Ray, CathLab, OR Light..."
                    className="flex-1 px-3.5 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomEquipment();
                        if (formErrors.equipments) setFormErrors({ ...formErrors, equipments: '' });
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      handleAddCustomEquipment();
                      if (formErrors.equipments) setFormErrors({ ...formErrors, equipments: '' });
                    }}
                    className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    เพิ่มเครื่องมือ
                  </button>
                </div>

                {formErrors.equipments && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {formErrors.equipments}
                  </p>
                )}

                {selectedEquipments.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-600">เครื่องมือที่เลือก:</span>
                    {selectedEquipments.map((eq, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-md font-medium"
                      >
                        <span>{eq}</span>
                        <button
                          type="button"
                          onClick={() => handleToggleEquipment(eq)}
                          className="text-blue-700 hover:text-rose-600 font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Section 3: Vehicle & License Plate */}
          <div>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4 pb-1 border-b border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                <span>3. ข้อมูลยานพาหนะ & ทะเบียน</span>
              </h3>
              <span className="text-[11px] font-semibold text-slate-400">Vehicle Info</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Vehicle Type Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  ประเภทยานพาหนะ <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
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
                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all text-left cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 text-blue-900 border-blue-600 ring-2 ring-blue-500/20 font-bold'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span className={isSelected ? 'text-blue-600' : 'text-slate-400'}>
                          {opt.icon}
                        </span>
                        <span className="truncate">{opt.type}</span>
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
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  ระบุเลขทะเบียนยานพาหนะ {vehicleType !== 'ไม่มีพาหนะ/เดินเท้า' ? <span className="text-rose-500">*</span> : <span className="text-slate-400">(ถ้ามี)</span>}
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
                    className={`w-full pl-9 pr-4 py-2.5 rounded-lg border text-xs font-mono text-slate-900 bg-white transition-all ${
                      formErrors.licensePlate
                        ? 'border-rose-500 ring-2 ring-rose-500/20'
                        : 'border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600'
                    }`}
                  />
                  <Car className={`w-4 h-4 absolute left-3 top-2.5 ${formErrors.licensePlate ? 'text-rose-500' : 'text-slate-400'}`} />
                </div>
                {formErrors.licensePlate ? (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {formErrors.licensePlate}
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    บันทึกสำหรับฝ่ายรักษาความปลอดภัยและระเบียบการจราจรในพื้นที่โรงพยาบาล
                  </p>
                )}
              </div>
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Section 4: Card Image Attachment & 5-Day Purge Policy */}
          <div>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4 pb-1 border-b border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                <span>4. แนบรูปบัตรที่แลกแล้ว <span className="text-rose-500">*</span></span>
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>ลบอัตโนมัติ 5 วัน (PDPA)</span>
              </span>
            </div>

            <div className={`rounded-xl p-4 border border-dashed transition-all ${
              formErrors.cardImage
                ? 'bg-rose-50/60 border-rose-400 ring-2 ring-rose-500/20'
                : 'bg-slate-50 border-slate-300'
            }`}>
              {formErrors.cardImage && (
                <div className="mb-3 p-2.5 rounded-lg bg-rose-100 border border-rose-300 text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formErrors.cardImage}</span>
                </div>
              )}
              {cardImage ? (
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <img
                    src={cardImage}
                    alt="Card Preview"
                    className="w-36 h-28 object-cover rounded-lg border-2 border-blue-600 shadow-2xs"
                  />
                  <div className="space-y-2 text-center sm:text-left">
                    <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>แนบรูปบัตรแลกเรียบร้อยแล้ว</span>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      รูปนี้จะถูกจัดเก็บชั่วคราวและลบออกจากระบบอัตโนมัติภายใน 5 วันตามนโยบาย PDPA
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setCardImage('')}
                        className="text-xs px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-md font-semibold transition-colors cursor-pointer"
                      >
                        ลบรูป / ถ่ายใหม่
                      </button>
                    </div>
                  </div>
                </div>
              ) : isCameraActive ? (
                <div className="space-y-3 text-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full max-w-sm mx-auto h-56 object-cover rounded-xl bg-black shadow-inner"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>ถ่ายรูปบัตร</span>
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-300 cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 py-4 text-center">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-4 py-2.5 bg-white border border-slate-300 hover:border-blue-500 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-2 transition-all shadow-2xs cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-blue-600" />
                    <span>ถ่ายรูปด้วยกล้อง</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2.5 bg-white border border-slate-300 hover:border-blue-500 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-2 transition-all shadow-2xs cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-slate-600" />
                    <span>อัปโหลดรูปไฟล์จากอุปกรณ์</span>
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

          {/* Section 5: Notification & Submission */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <input
                id="telegram-toggle"
                type="checkbox"
                checked={sendTelegram}
                onChange={(e) => setSendTelegram(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-slate-300"
              />
              <label htmlFor="telegram-toggle" className="text-xs font-semibold text-slate-800 cursor-pointer">
                ส่งการแจ้งเตือนทันทีไปยัง Telegram Bot (Chat ID: -5275868334)
              </label>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              ⚡ แจ้งเตือนเข้ากลุ่ม BME อัตโนมัติ
            </span>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              id="submit-visitor-checkin-btn"
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>กำลังบันทึกข้อมูล...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>บันทึกการเข้าติดต่อ & แจ้งเตือน Telegram</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
