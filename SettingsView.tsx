import React, { useState } from 'react';
import {
  Settings,
  Send,
  FileSpreadsheet,
  Clock,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RotateCcw,
  Save,
  Layers,
  Wrench,
  KeyRound,
  Lock,
  Unlock,
  Edit3,
  ExternalLink,
  Copy,
  Check,
  Code2,
  Zap,
  HelpCircle,
  Sparkles,
  Building2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { TelegramConfig, DepartmentInfo, EquipmentInfo, VisitorRecord } from '../types';
import { StorageService } from '../services/storageService';
import { testTelegramConnection } from '../services/telegramService';
import { applyImageRetentionPolicy } from '../utils/imageRetention';
import { GoogleSheetsService, APPS_SCRIPT_TEMPLATE, DEFAULT_SHEET_WEBHOOK_URL, DEFAULT_SHEET_ID } from '../services/googleSheetsService';

interface SettingsViewProps {
  departments: DepartmentInfo[];
  equipmentList: EquipmentInfo[];
  records: VisitorRecord[];
  onRefreshData: () => void;
  isAdmin: boolean;
  onOpenAdminAuth: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  departments,
  equipmentList,
  records,
  onRefreshData,
  isAdmin,
  onOpenAdminAuth,
}) => {
  // Telegram Settings State
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>(() =>
    StorageService.getTelegramConfig()
  );
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Google Sheet State
  const [sheetId, setSheetId] = useState(() => GoogleSheetsService.getSheetId());
  const [webhookUrl, setWebhookUrl] = useState(() => GoogleSheetsService.getWebhookUrl());
  const [isEditingWebhook, setIsEditingWebhook] = useState(false);
  const [tempWebhookUrl, setTempWebhookUrl] = useState(() => GoogleSheetsService.getWebhookUrl());
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [sheetSyncResult, setSheetSyncResult] = useState<string | null>(null);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isBatchSyncing, setIsBatchSyncing] = useState(false);
  const [batchSyncResult, setBatchSyncResult] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [showScriptCode, setShowScriptCode] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{ success: boolean; message: string; count?: number } | null>(null);

  // Sync settings from server backend on mount
  React.useEffect(() => {
    GoogleSheetsService.initSettings().then(() => {
      const currentUrl = GoogleSheetsService.getWebhookUrl();
      setWebhookUrl(currentUrl);
      setTempWebhookUrl(currentUrl);
      setSheetId(GoogleSheetsService.getSheetId());
    });
  }, []);

  // Retention Status
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);

  // Active sub-tab
  const [activeSubTab, setActiveSubTab] = useState<'telegram' | 'sheets' | 'retention' | 'master'>('telegram');

  // New Department, Company & Equipment inline state
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptFloor, setNewDeptFloor] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [sheetCompanies, setSheetCompanies] = useState<string[]>(() => StorageService.getSheetCompanies());
  const [newEqName, setNewEqName] = useState('');
  const [newEqDept, setNewEqDept] = useState(departments[0]?.name || '');
  const [newEqVendor, setNewEqVendor] = useState('');

  // Reload sheet companies on mount/refresh
  React.useEffect(() => {
    setSheetCompanies(StorageService.getSheetCompanies());
  }, [departments]);

  // Handle Telegram Test
  const handleTestTelegram = async () => {
    setIsTestingTelegram(true);
    setTestResult(null);

    const result = await testTelegramConnection(telegramConfig);
    setTestResult(result);
    setIsTestingTelegram(false);

    if (result.success) {
      try {
        confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
      } catch {}
    }
  };

  // Save Telegram Settings
  const handleSaveTelegram = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.saveTelegramConfig(telegramConfig);
    alert('บันทึกการตั้งค่า Telegram เรียบร้อยแล้ว');
  };

  // Handle Sync from Google Sheets
  const handleSyncGoogleSheet = async () => {
    setIsSyncingSheet(true);
    setSheetSyncResult('กำลังเชื่อมต่อ Google Sheets...');

    try {
      const result = await GoogleSheetsService.fetchMasterDataFromSheet(sheetId, webhookUrl);

      if (result.success && (result.departments?.length || result.companies?.length)) {
        if (result.departments && result.departments.length > 0) {
          StorageService.saveDepartments(result.departments);
        }
        if (result.companies && result.companies.length > 0) {
          StorageService.saveSheetCompanies(result.companies);
        }
        if (result.equipments && result.equipments.length > 0) {
          StorageService.saveEquipment(result.equipments);
        }
        onRefreshData();
        setSheetSyncResult(`✅ ${result.message}`);
        try {
          confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
        } catch {}
      } else {
        setSheetSyncResult(result.message || '⚠️ ไม่สามารถดึงข้อมูลได้ กรุณาตรวจสอบสิทธิ์การแชร์ชีท');
      }
    } catch (e: any) {
      setSheetSyncResult(`❌ เกิดข้อผิดพลาด: ${e?.message || 'ไม่สามารถดึงข้อมูลได้'}`);
    } finally {
      setIsSyncingSheet(false);
    }
  };

  // Save Google Sheets configuration
  const handleSaveSheetConfig = (e: React.FormEvent) => {
    e.preventDefault();
    GoogleSheetsService.saveSheetId(sheetId);
    GoogleSheetsService.saveWebhookUrl(webhookUrl);
    alert('บันทึกการตั้งค่า Google Sheets เรียบร้อยแล้ว');
  };

  // Webhook URL Edit/Save/Reset Actions
  const handleStartEditWebhook = () => {
    setTempWebhookUrl(webhookUrl);
    setIsEditingWebhook(true);
  };

  const handleCancelEditWebhook = () => {
    setTempWebhookUrl(webhookUrl);
    setIsEditingWebhook(false);
  };

  const handleSaveEditedWebhook = () => {
    const cleanUrl = tempWebhookUrl.trim();
    if (!cleanUrl) {
      alert('กรุณาระบุ Webhook URL ที่ถูกต้อง');
      return;
    }
    setWebhookUrl(cleanUrl);
    GoogleSheetsService.saveWebhookUrl(cleanUrl);
    setIsEditingWebhook(false);
    alert('✅ บันทึก Webhook URL ใหม่เรียบร้อยแล้ว');
  };

  const handleResetToDefaultWebhook = () => {
    if (confirm('คุณต้องการคืนค่าเป็น Google Apps Script Webhook URL เริ่มต้นของระบบใช่หรือไม่?')) {
      setWebhookUrl(DEFAULT_SHEET_WEBHOOK_URL);
      setTempWebhookUrl(DEFAULT_SHEET_WEBHOOK_URL);
      GoogleSheetsService.saveWebhookUrl(DEFAULT_SHEET_WEBHOOK_URL);
      setIsEditingWebhook(false);
      alert('✅ คืนค่าเป็น Webhook URL เริ่มต้นเรียบร้อยแล้ว');
    }
  };

  const handleCopyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2500);
  };

  // Test Webhook Connection
  const handleTestSheetWebhook = async () => {
    setIsTestingWebhook(true);
    setWebhookTestResult(null);

    const res = await GoogleSheetsService.testWebhook(webhookUrl);
    setWebhookTestResult(res);
    setIsTestingWebhook(false);

    if (res.success) {
      try {
        confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
      } catch {}
    }
  };

  // Copy Apps Script Template
  const handleCopyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
  };

  // Run 5-Day Cleanup
  const handleRunCleanup = () => {
    const updated = applyImageRetentionPolicy(records);
    StorageService.saveVisitorRecords(updated);
    onRefreshData();

    const expiredCount = updated.filter(r => r.isImageExpired).length;
    setCleanupMessage(`✅ ตรวจสอบเรียบร้อย: พบรูปภาพที่หมดอายุตามนโยบาย 5 วันทั้งหมด ${expiredCount} รายการ (ระบบซ่อนและลบตามมาตรฐาน PDPA เรียบร้อย)`);
    setTimeout(() => setCleanupMessage(null), 5000);
  };

  // Batch Sync All Records to Visitor_Logs
  const handleBatchSyncToSheet = async () => {
    if (!webhookUrl) {
      alert('กรุณาระบุและบันทึก Google Apps Script Webhook URL ก่อนทำการซิงค์');
      return;
    }
    if (!records || records.length === 0) {
      alert('ไม่มีข้อมูลประวัติผู้มาติดต่อที่จะซิงค์');
      return;
    }

    setIsBatchSyncing(true);
    setBatchSyncResult(null);

    const result = await GoogleSheetsService.batchSyncAllRecords(records);
    if (result.success) {
      setBatchSyncResult(`✅ ${result.message}`);
      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      } catch {}
    } else {
      setBatchSyncResult(`❌ ${result.message}`);
    }
    setIsBatchSyncing(false);
  };

  // Migrate Old Form Responses to Visitor_Logs
  const handleMigrateOldFormData = async () => {
    setIsMigrating(true);
    setMigrationResult(null);

    try {
      const result = await GoogleSheetsService.migrateOldFormDataToVisitorLogs(sheetId, webhookUrl);
      setMigrationResult(result);
      if (result.success) {
        onRefreshData();
        try {
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        } catch {}
      }
    } catch (err: any) {
      setMigrationResult({
        success: false,
        message: `ย้ายข้อมูลไม่สำเร็จ: ${err?.message || 'ข้อผิดพลาดเครือข่าย'}`,
      });
    } finally {
      setIsMigrating(false);
    }
  };

  // Add Department
  const handleAddDept = () => {
    if (!newDeptName.trim()) return;
    const current = StorageService.getDepartments();
    const newDept: DepartmentInfo = {
      id: `dept-${Date.now()}`,
      name: newDeptName.trim(),
      buildingFloor: newDeptFloor.trim() || undefined,
    };
    StorageService.saveDepartments([...current, newDept]);
    setNewDeptName('');
    setNewDeptFloor('');
    onRefreshData();
  };

  // Add Company
  const handleAddCompany = () => {
    if (!newCompanyName.trim()) return;
    const current = StorageService.getSheetCompanies();
    if (!current.includes(newCompanyName.trim())) {
      const updated = [...current, newCompanyName.trim()];
      StorageService.saveSheetCompanies(updated);
      setSheetCompanies(updated);
      setNewCompanyName('');
      onRefreshData();
    }
  };

  // Add Equipment
  const handleAddEq = () => {
    if (!newEqName.trim()) return;
    const current = StorageService.getEquipment();
    const newEq: EquipmentInfo = {
      id: `eq-${Date.now()}`,
      code: `EQ-${Date.now().toString().slice(-4)}`,
      name: newEqName.trim(),
      category: 'Medical Device',
      department: newEqDept,
      vendorCompany: newEqVendor.trim() || 'บริษัทคู่ค้า',
    };
    StorageService.saveEquipment([...current, newEq]);
    setNewEqName('');
    setNewEqVendor('');
    onRefreshData();
  };

  // Reset to default dataset
  const handleResetData = () => {
    if (confirm('คุณต้องการรีเซ็ตข้อมูลทั้งหมดกลับเป็นข้อมูลตั้งต้นหรือไม่? (ข้อมูลที่เพิ่มเองจะถูกล้าง)')) {
      StorageService.resetToDefaultData();
      onRefreshData();
      alert('รีเซ็ตข้อมูลกลับสู่ค่าเริ่มต้นเรียบร้อยแล้ว');
    }
  };

  // If not admin, show dedicated locked screen to protect settings & integrations
  if (!isAdmin) {
    return (
      <div id="settings-locked-view" className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 text-center">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-200 shadow-2xs">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
            สงวนสิทธิ์เฉพาะผู้ดูแลระบบ (Admin Only)
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto mb-6">
            หน้าการตั้งค่าระบบ, การเชื่อมต่อ Google Sheets, Webhook และ Telegram Bot อนุญาตให้เฉพาะเจ้าหน้าที่แผนกวิศวกรรมการแพทย์ (BME) เข้าใช้งานเท่านั้น
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-md mx-auto mb-6 text-xs text-slate-700 text-left space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-blue-700">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>การรักษาความปลอดภัยข้อมูลระบบ</span>
            </div>
            <p className="text-slate-600">
              บุคคลภายนอกสามารถลงทะเบียนเข้าปฏิบัติงานและดูแดชบอร์ดสรุปได้ตามปกติ กรุณายืนยันตัวตนด้วยรหัสผ่านผู้ดูแลระบบเพื่อเข้าถึงหน้านี้
            </p>
          </div>

          <button
            onClick={onOpenAdminAuth}
            className="py-2.5 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <KeyRound className="w-4 h-4" />
            <span>เข้าสู่ระบบด้วยรหัสผ่าน Admin</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="settings-view" className="max-w-5xl mx-auto py-6 px-4 sm:px-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            ตั้งค่าระบบ & การเชื่อมต่อ (Settings)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            จัดการการแจ้งเตือน Telegram, ซิงค์ชีท Google Sheets, และนโยบายลบรูปภาพ 5 วัน
          </p>
        </div>

        {/* Reset button */}
        <button
          id="reset-default-data-btn"
          onClick={handleResetData}
          className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-red-50 hover:text-red-700 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>รีเซ็ตข้อมูลตั้งต้น</span>
        </button>
      </div>

      {/* Sub-tab switcher */}
      <div className="flex gap-1.5 p-1.5 bg-slate-200/60 rounded-xl overflow-x-auto border border-slate-200 text-xs font-semibold">
        <button
          onClick={() => setActiveSubTab('telegram')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
            activeSubTab === 'telegram' ? 'bg-white text-blue-700 shadow-xs border border-slate-200/60' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Send className="w-3.5 h-3.5 text-blue-600" />
          <span>การแจ้งเตือน Telegram</span>
        </button>

        <button
          onClick={() => setActiveSubTab('sheets')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
            activeSubTab === 'sheets' ? 'bg-white text-blue-700 shadow-xs border border-slate-200/60' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
          <span>Google Sheets</span>
        </button>

        <button
          onClick={() => setActiveSubTab('retention')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
            activeSubTab === 'retention' ? 'bg-white text-blue-700 shadow-xs border border-slate-200/60' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          <span>นโยบายลบรูป 5 วัน (PDPA)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('master')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
            activeSubTab === 'master' ? 'bg-white text-blue-700 shadow-xs border border-slate-200/60' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Database className="w-3.5 h-3.5 text-indigo-600" />
          <span>ฐานข้อมูลแผนก & เครื่องมือ</span>
        </button>
      </div>

      {/* Sub-tab 1: Telegram Settings */}
      {activeSubTab === 'telegram' && (
        <div className="bg-white rounded-xl p-6 sm:p-7 shadow-sm border border-slate-200 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base tracking-tight">
                  ตั้งค่าระบบแจ้งเตือน Telegram Bot
                </h3>
                <p className="text-xs text-slate-500">
                  ส่งข้อความอัตโนมัติเข้ากลุ่มงานเครื่องมือแพทย์เมื่อมีผู้มาติดต่อหรือช่างเข้าปฏิบัติงาน
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200">
              ⚡ Real-time Alert
            </span>
          </div>

          <form onSubmit={handleSaveTelegram} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Telegram BOT_TOKEN
                </label>
                <input
                  id="telegram-bot-token-input"
                  type="text"
                  value={telegramConfig.botToken}
                  onChange={(e) => setTelegramConfig({ ...telegramConfig, botToken: e.target.value })}
                  placeholder="8344422414:AAER_..."
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:outline-none text-slate-900 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Telegram CHAT_ID (ห้องแชท / กลุ่ม)
                </label>
                <input
                  id="telegram-chat-id-input"
                  type="text"
                  value={telegramConfig.chatId}
                  onChange={(e) => setTelegramConfig({ ...telegramConfig, chatId: e.target.value })}
                  placeholder="-5275868334"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:outline-none text-slate-900 transition-all"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  💡 ข้อความแจ้งเตือนจะถูกส่งเข้า <b>กลุ่ม Telegram</b> ที่ระบุ (เช่น กลุ่ม <code>Contract BME Security Guard</code>) ตรวจสอบให้แน่ใจว่าได้ดึงบอทเข้ากลุ่มแล้ว
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <input
                id="enable-telegram-checkbox"
                type="checkbox"
                checked={telegramConfig.enabled}
                onChange={(e) => setTelegramConfig({ ...telegramConfig, enabled: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-600 border-slate-300 cursor-pointer"
              />
              <label htmlFor="enable-telegram-checkbox" className="text-xs font-semibold text-slate-800 cursor-pointer">
                เปิดใช้งานการส่งแจ้งเตือน Telegram อัตโนมัติทุกครั้งที่มีการลงทะเบียน
              </label>
            </div>

            {testResult && (
              <div
                className={`p-3.5 rounded-lg text-xs flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>บันทึกการตั้งค่า</span>
              </button>

              <button
                id="test-telegram-btn"
                type="button"
                onClick={handleTestTelegram}
                disabled={isTestingTelegram}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-60 cursor-pointer"
              >
                {isTestingTelegram ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>กำลังทดสอบ...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>ทดสอบส่งข้อความแจ้งเตือน (Test Alert)</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sub-tab 2: Google Sheets */}
      {activeSubTab === 'sheets' && (
        <div className="space-y-6">
          {/* Main Webhook Setup Card */}
          <div className="bg-white rounded-xl p-6 sm:p-7 shadow-sm border border-slate-200 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base tracking-tight">
                      การเชื่อมต่อ Google Sheets (แบบฟรีไม่มีจำกัด)
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      100% FREE • UNLIMITED
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    บันทึกข้อมูลผู้มาติดต่อลงชีทแบบเรียลไทม์ผ่าน Google Apps Script Webhook โดยไม่ต้องใช้ API Key หรือผูกบัตรเครดิต
                  </p>
                </div>
              </div>
              <a
                href={`https://docs.google.com/spreadsheets/d/${sheetId}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold transition-colors shrink-0"
              >
                <span>เปิด Google Sheet</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Auto Connection Banner */}
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-950 text-sm">
                      ระบบเชื่อมต่อกับ Google Sheet อัตโนมัติ 100%
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                      AUTO SYNC ACTIVE
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                    ทุกครั้งที่เปิดหน้าเว็บ ระบบจะเชื่อมต่อและโหลดข้อมูลจาก Google Sheet โดยอัตโนมัติ และเมื่อมีการลงทะเบียน ข้อมูลจะถูกบันทึกลงชีท <b>Visitor_Logs</b> ทันทีโดยไม่ต้องกดเชื่อมต่อซ้ำ
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveSheetConfig} className="space-y-5">
              {/* Webhook URL Input with Locked / Edit Toggle */}
              <div className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-4 sm:p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {isEditingWebhook ? (
                      <Unlock className="w-4 h-4 text-amber-600" />
                    ) : (
                      <Lock className="w-4 h-4 text-emerald-600" />
                    )}
                    <label className="text-xs font-bold text-slate-800">
                      Google Apps Script Web App URL (Fixed Webhook)
                    </label>
                    {isEditingWebhook ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        โหมดแก้ไข URL
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Fix ค่าอัตโนมัติ (Locked)
                      </span>
                    )}
                  </div>

                  {!isEditingWebhook ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyWebhookUrl}
                        className="px-2.5 py-1 rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                      >
                        {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedWebhook ? 'คัดลอกแล้ว' : 'คัดลอก URL'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleStartEditWebhook}
                        className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>แก้ไข URL</span>
                      </button>

                      {webhookUrl !== DEFAULT_SHEET_WEBHOOK_URL && (
                        <button
                          type="button"
                          onClick={handleResetToDefaultWebhook}
                          className="px-2.5 py-1 rounded-md bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>คืนค่าเริ่มต้น</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSaveEditedWebhook}
                        className="px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>บันทึก URL ใหม่</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEditWebhook}
                        className="px-2.5 py-1 rounded-md bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-semibold transition-all cursor-pointer"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  )}
                </div>

                {!isEditingWebhook ? (
                  <div className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-2 overflow-hidden shadow-2xs">
                    <span className="font-mono text-xs text-slate-800 break-all select-all font-medium">
                      {webhookUrl || DEFAULT_SHEET_WEBHOOK_URL}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <input
                      id="sheets-webhook-input"
                      type="url"
                      value={tempWebhookUrl}
                      onChange={(e) => setTempWebhookUrl(e.target.value)}
                      placeholder="วาง URL เว็บแอปใหม่ที่นี่"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-blue-400 bg-white font-mono text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-none text-slate-900 transition-all shadow-xs"
                      autoFocus
                    />
                    <p className="text-[11px] text-slate-500">
                      เมื่อกรอก URL เสร็จแล้วให้กดปุ่ม <b>"บันทึก URL ใหม่"</b> เพื่อบันทึกลงระบบและล็อคค่าอัตโนมัติ
                    </p>
                  </div>
                )}

                <p className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>เมื่อมีการลงทะเบียน ข้อมูลจะถูกบันทึกส่งตรงเข้าชีท <b>Visitor_Logs</b> ตาม URL เว็บแอปนี้อัตโนมัติ</span>
                </p>
              </div>

              {/* Sheet ID Input */}
              <div className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-4 sm:p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    Google Sheet ID (เชื่อมโยงไฟล์สเปรดชีต)
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">1ry7U0ZSuMT5yYYkDpRHukuYLQQrPEfy4jP3GnpxyJM8</span>
                </div>
                <input
                  type="text"
                  value={sheetId}
                  onChange={(e) => setSheetId(e.target.value)}
                  placeholder="1ry7U0ZSuMT5yYYkDpRHukuYLQQrPEfy4jP3GnpxyJM8"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white font-mono text-xs focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:outline-none text-slate-900 transition-all shadow-2xs"
                />
              </div>

              {/* Status alerts */}
              {webhookTestResult && (
                <div
                  className={`p-3.5 rounded-lg text-xs font-medium border flex items-start gap-2.5 ${
                    webhookTestResult.success
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                      : 'bg-rose-50 text-rose-900 border-rose-200'
                  }`}
                >
                  {webhookTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{webhookTestResult.message}</span>
                </div>
              )}

              {batchSyncResult && (
                <div className="p-3.5 rounded-lg bg-emerald-50 text-emerald-900 text-xs font-semibold border border-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{batchSyncResult}</span>
                </div>
              )}

              {sheetSyncResult && (
                <div className="p-3.5 rounded-lg bg-blue-50 text-blue-900 text-xs font-medium border border-blue-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{sheetSyncResult}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2.5 pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>บันทึกการตั้งค่าชีท</span>
                </button>

                <button
                  type="button"
                  onClick={handleBatchSyncToSheet}
                  disabled={isBatchSyncing || !webhookUrl || records.length === 0}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isBatchSyncing ? 'animate-spin' : ''}`} />
                  <span>⚡ ซิงค์ข้อมูลทั้งหมด ({records.length} รายการ) เข้าชีท Visitor_Logs</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestSheetWebhook}
                  disabled={isTestingWebhook || !webhookUrl}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isTestingWebhook ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>กำลังทดสอบส่งข้อมูล...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>ทดสอบส่งข้อมูลเข้า Google Sheet (Test Webhook)</span>
                    </>
                  )}
                </button>

                <button
                  id="sync-sheets-btn"
                  type="button"
                  onClick={handleSyncGoogleSheet}
                  disabled={isSyncingSheet}
                  className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncingSheet ? 'animate-spin' : ''}`} />
                  <span>ซิงค์ข้อมูล Master Data จากชีท</span>
                </button>
              </div>
            </form>
          </div>

          {/* Legacy Data Migration to Visitor_Logs Section */}
          <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-blue-950 text-white rounded-xl p-5 sm:p-6 shadow-md border border-indigo-700/50 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <h4 className="font-bold text-white text-sm sm:text-base">
                    ย้ายข้อมูลจาก "การตอบแบบฟอร์ม 1" มารวมใน "Visitor_Logs" ชีทเดียว
                  </h4>
                </div>
                <p className="text-xs text-indigo-200">
                  แมชข้อมูลตรงช่องคอลัมน์ 100% (วันเวลา, ชื่อ-นามสกุล, บริษัท, บทบาท, แผนก, งาน, จำนวนคน, พาหนะ, ทะเบียน, เครื่องมือแพทย์)
                </p>
              </div>

              <button
                type="button"
                onClick={handleMigrateOldFormData}
                disabled={isMigrating}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 text-xs font-bold transition-all shadow-lg hover:shadow-amber-500/25 active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${isMigrating ? 'animate-spin' : ''}`} />
                <span>{isMigrating ? 'กำลังย้ายข้อมูล...' : '⚡ ย้ายข้อมูลเข้า Visitor_Logs ทันที'}</span>
              </button>
            </div>

            {/* Migration Result Message */}
            {migrationResult && (
              <div
                className={`p-3.5 rounded-lg text-xs font-semibold border flex items-start gap-2.5 ${
                  migrationResult.success
                    ? 'bg-emerald-950/80 text-emerald-200 border-emerald-500/50'
                    : 'bg-rose-950/80 text-rose-200 border-rose-500/50'
                }`}
              >
                {migrationResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5">
                  <p className="font-bold">{migrationResult.message}</p>
                  {migrationResult.success && (
                    <p className="text-[11px] text-emerald-300/80 font-normal">
                      ข้อมูลถูกผสานเข้ากับประวัติและชีท Visitor_Logs โดยตรวจสอบรายการซ้ำซ้อนเรียบร้อยแล้ว
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Notice about future data */}
            <div className="p-3 bg-white/10 rounded-lg border border-white/10 flex items-start gap-2 text-xs text-indigo-100">
              <Zap className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
              <p className="leading-relaxed text-[11px]">
                <b>การทำงานต่อไป:</b> เมื่อย้ายข้อมูลเสร็จแล้ว ทุกครั้งที่มีการลงทะเบียนหรือแก้ไขข้อมูลใหม่ ระบบจะบันทึกลงในชีท <b>Visitor_Logs</b> เพียงชีทเดียวเท่านั้นโดยตรง ไม่จำเป็นต้องกรอกใน "การตอบแบบฟอร์ม 1" อีกต่อไป
              </p>
            </div>
          </div>

          {/* Setup Guide & Ready Code */}
          <div className="bg-white rounded-xl p-6 sm:p-7 shadow-sm border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-blue-600" />
                <h4 className="font-bold text-slate-900 text-sm">
                  วิธีสร้าง Webhook บน Google Sheet ใน 3 นาที (ฟรี 100%)
                </h4>
              </div>
              <button
                type="button"
                onClick={handleCopyScript}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold transition-colors cursor-pointer"
              >
                {copiedScript ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>คัดลอกโค้ดแล้ว!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-blue-600" />
                    <span>คัดลอกโค้ด Apps Script</span>
                  </>
                )}
              </button>
            </div>

            {/* 4 Steps */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold inline-flex items-center justify-center text-[10px] mr-2">1</span>
                <b className="text-slate-800">เปิด Google Sheets:</b>
                <p className="text-slate-600 mt-1 pl-7 leading-relaxed">
                  เปิดชีทของคุณ แล้วคลิกเมนู <span className="font-semibold text-slate-900">"ส่วนขยาย" (Extensions) &gt; "Apps Script"</span>
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold inline-flex items-center justify-center text-[10px] mr-2">2</span>
                <b className="text-slate-800">วางโค้ดสคริปต์:</b>
                <p className="text-slate-600 mt-1 pl-7 leading-relaxed">
                  ลบโค้ดเดิมทั้งหมดในหน้าต่างออก แล้วกดปุ่ม <b>"คัดลอกโค้ด Apps Script"</b> ด้านบนมาวาง
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold inline-flex items-center justify-center text-[10px] mr-2">3</span>
                <b className="text-slate-800">กด Deploy (ทำให้ใช้งานได้):</b>
                <p className="text-slate-600 mt-1 pl-7 leading-relaxed">
                  คลิกปุ่มสีน้ำเงิน <b>ทำให้ใช้งานได้ &gt; การทำให้ใช้งานได้รายการใหม่</b> เลือกประเภท <b>"เว็บแอป" (Web app)</b>
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold inline-flex items-center justify-center text-[10px] mr-2">4</span>
                <b className="text-slate-800">ตั้งค่าสิทธิ์ & นำ URL มาใส่:</b>
                <p className="text-slate-600 mt-1 pl-7 leading-relaxed">
                  ตั้ง <b>ผู้มีสิทธิ์เข้าถึง = "ทุกคน" (Anyone)</b> แล้วกด Deploy นำ URL ที่ได้มาวางในช่อง Webhook ด้านบน
                </p>
              </div>
            </div>

            {/* Toggle View Script Code */}
            <div>
              <button
                type="button"
                onClick={() => setShowScriptCode(!showScriptCode)}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium underline flex items-center gap-1 cursor-pointer"
              >
                <span>{showScriptCode ? '▲ ซ่อนโค้ดตัวอย่าง Apps Script' : '▼ ดูโค้ดตัวอย่าง Apps Script (Google Apps Script Code)'}</span>
              </button>

              {showScriptCode && (
                <div className="mt-3 relative">
                  <pre className="p-4 rounded-lg bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-72 border border-slate-800">
                    <code>{APPS_SCRIPT_TEMPLATE}</code>
                  </pre>
                  <button
                    type="button"
                    onClick={handleCopyScript}
                    className="absolute top-3 right-3 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-medium border border-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {copiedScript ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedScript ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Master Sheets Info */}
          <div className="bg-white rounded-xl p-6 sm:p-7 shadow-sm border border-slate-200 space-y-4">
            <h4 className="font-bold text-slate-900 text-sm">
              โครงสร้างแผ่นงานใน Google Sheets
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="font-bold text-emerald-700 mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Visitor_Logs (อัตโนมัติ)</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  สคริปต์จะสร้างและบันทึกประวัติการเข้าพบ (วันเวลา, ชื่อ, บริษัท, เบอร์โทร, แผนก, งาน, ทะเบียน) ให้ทันทีแบบเรียลไทม์
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="font-bold text-blue-700 mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span>รายชื่อบริษัทและแผนก ({departments.length} แผนก)</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  ฐานข้อมูลรายชื่อบริษัทคู่สัญญา และแผนก/หน่วยงานภายในโรงพยาบาล
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="font-bold text-indigo-700 mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                  <span>ฐานข้อมูลเครื่องมือแพทย์ ({equipmentList.length} รายการ)</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  ประเภท รายชื่อเครื่องมือแพทย์ และยี่ห้อ พร้อมคำแปลภาษาไทย
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 3: 5-Day Retention Policy */}
      {activeSubTab === 'retention' && (
        <div className="bg-white rounded-xl p-6 sm:p-7 shadow-sm border border-slate-200 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base tracking-tight">
                  นโยบายการลบรูปภาพบัตรแลกอัตโนมัติ 5 วัน (PDPA Retention)
                </h3>
                <p className="text-xs text-slate-500">
                  ระบบจะลบรูปภาพบัตรที่แลกออกจากระบบอัตโนมัติเมื่อครบกำหนด 5 วัน เพื่อความเป็นส่วนตัวและความปลอดภัย
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>เปิดใช้งานอยู่ (Active)</span>
            </span>
          </div>

          <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-4 text-xs text-amber-900 space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-amber-800">
              <span>มาตรฐานความปลอดภัยของข้อมูลบัตรผู้มาติดต่อ</span>
            </div>
            <p className="leading-relaxed">
              1. รูปภาพบัตรประจำตัวประชาชนหรือบัตรพนักงานที่แลก จะถูกเก็บไว้ในระบบสูงสุด <b>5 วัน (120 ชั่วโมง)</b><br />
              2. เมื่อเกิน 5 วัน ระบบจะปิดกั้นการแสดงผลรูปภาพและทำเครื่องหมาย <b>"หมดอายุ / ลบแล้วตามนโยบาย PDPA"</b> โดยอัตโนมัติ<br />
              3. ข้อมูลตัวอักษร (ชื่อ, บริษัท, แผนก, ยานพาหนะ, เลขทะเบียน) ยังคงถูกเก็บไว้สำหรับสรุปรายงานแดชบอร์ดตามปกติ
            </p>
          </div>

          {cleanupMessage && (
            <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{cleanupMessage}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              id="run-cleanup-btn"
              onClick={handleRunCleanup}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>รันการตรวจสอบและล้างรูปภาพที่หมดอายุทันที</span>
            </button>
          </div>
        </div>
      )}

      {/* Sub-tab 4: Master Data */}
      {activeSubTab === 'master' && (
        <div className="space-y-6">
          {/* Companies */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 tracking-tight">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>รายชื่อบริษัทคู่สัญญา ({sheetCompanies.length} บริษัท)</span>
              </h3>
              <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                ดึงข้อมูลอัตโนมัติ
              </span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                placeholder="ชื่อบริษัท เช่น ดับเบิ้ลยู เทค, โซวิค, Thai GL..."
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 focus:outline-none transition-all"
              />
              <button
                onClick={handleAddCompany}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs"
              >
                + เพิ่มบริษัท
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-56 overflow-y-auto p-1">
              {sheetCompanies.map((comp, idx) => (
                <div key={idx} className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                  <span className="font-medium text-slate-800 truncate" title={comp}>{comp}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Departments */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 tracking-tight">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>รายชื่อแผนกในโรงพยาบาล ({departments.length} แผนก)</span>
              </h3>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                placeholder="ชื่อแผนก เช่น ศูนย์ส่องกล้อง, OR..."
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:outline-none transition-all"
              />
              <input
                type="text"
                value={newDeptFloor}
                onChange={(e) => setNewDeptFloor(e.target.value)}
                placeholder="อาคาร/ชั้น (ถ้ามี)"
                className="w-36 px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:outline-none transition-all"
              />
              <button
                onClick={handleAddDept}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer shadow-xs"
              >
                + เพิ่มแผนก
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto p-1">
              {departments.map((dept) => (
                <div key={dept.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <div className="font-semibold text-slate-800 truncate">{dept.name}</div>
                  {dept.buildingFloor && <div className="text-[10px] text-slate-500">{dept.buildingFloor}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Equipments */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 tracking-tight">
                <Wrench className="w-4 h-4 text-emerald-600" />
                <span>รายชื่อเครื่องมือแพทย์ (ชีท Data_equpment) - {equipmentList.length} รายการ</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={newEqName}
                onChange={(e) => setNewEqName(e.target.value)}
                placeholder="ชื่อเครื่องมือแพทย์ เช่น กล้อง GI, CathLab..."
                className="px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:outline-none transition-all"
              />
              <input
                type="text"
                value={newEqVendor}
                onChange={(e) => setNewEqVendor(e.target.value)}
                placeholder="บริษัทคู่ค้า เช่น Olympus, Philips..."
                className="px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:outline-none transition-all"
              />
              <button
                onClick={handleAddEq}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer shadow-xs"
              >
                + เพิ่มเครื่องมือ
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1">
              {equipmentList.map((eq) => (
                <div key={eq.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex justify-between items-center">
                  <div className="truncate pr-2">
                    <span className="font-semibold text-slate-800 block truncate">{eq.name}</span>
                    {eq.nameTh && (
                      <span className="text-[11px] text-emerald-700 block truncate font-medium">
                        🇹🇭 {eq.nameTh}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-500">{eq.vendorCompany || eq.brand || eq.category}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 shrink-0 font-medium">
                    {eq.category || eq.department?.split(' ')[0] || 'เครื่องมือแพทย์'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
