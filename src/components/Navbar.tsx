import React from 'react';
import {
  Sparkles,
  FileDown,
  Mail,
  PenTool,
  FolderOpen,
  Eye,
  Edit3,
  Printer,
} from 'lucide-react';
import { CPIFormData } from '../types';
import { PhyathaiLogo } from './PhyathaiLogo';

interface NavbarProps {
  form: CPIFormData;
  viewMode: 'editor' | 'preview';
  setViewMode: (mode: 'editor' | 'preview') => void;
  onOpenAutoFillModal: () => void;
  onOpenSignatureModal: (role: 'proposer' | 'deptHead' | 'approver' | 'proposerPage2') => void;
  onOpenEmailModal: () => void;
  onOpenHistoryDrawer: () => void;
  onExportPDF: () => void;
  onPrint?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  form,
  viewMode,
  setViewMode,
  onOpenAutoFillModal,
  onOpenSignatureModal,
  onOpenEmailModal,
  onOpenHistoryDrawer,
  onExportPDF,
  onPrint,
}) => {
  return (
    <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-xl border-b border-slate-800 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand Logo & Doc Info */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={onOpenHistoryDrawer}>
              <div className="bg-white px-2 py-0.5 rounded shadow-xs border border-slate-700 flex items-center">
                <PhyathaiLogo size="sm" />
              </div>
              <div className="hidden sm:block">
                <h1 className="font-bold text-sm tracking-tight flex items-center gap-2">
                  โรงพยาบาลพญาไท พหลโยธิน
                  <span className="text-[10px] bg-slate-800 text-blue-400 px-2 py-0.5 rounded-xs font-mono border border-slate-700">
                    PTP-FM-QMS-001
                  </span>
                </h1>
                <p className="text-[10px] text-slate-400">
                  แบบบันทึกกิจกรรมพัฒนาผลสัมฤทธิ์ของงาน (CPI Form 100%)
                </p>
              </div>
            </div>

            {/* Active Doc Badge */}
            <div className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-800 text-xs">
              <span className="text-slate-400">เลขที่:</span>
              <span className="font-bold font-mono text-blue-400">{form.docNo || 'Draft'}</span>
            </div>
          </div>

          {/* Center Mode Switcher */}
          <div className="flex bg-slate-950 p-1 rounded-md border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('editor')}
              className={`px-3 py-1.5 rounded-xs text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'editor'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">แก้ไขฟอร์ม</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1.5 rounded-xs text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'preview'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>พรีวิวฟอร์ม A4</span>
            </button>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-1.5">
            {/* Auto Fill AI */}
            <button
              type="button"
              onClick={onOpenAutoFillModal}
              className="px-3 py-1.5 rounded-md bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-all"
              title="ป้อนค่าอัตโนมัติด้วย AI"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-100" />
              <span className="hidden lg:inline">Auto-Fill AI</span>
            </button>

            {/* Signature Button */}
            <button
              type="button"
              onClick={() => onOpenSignatureModal('proposer')}
              className="px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-blue-300 font-medium text-xs flex items-center gap-1.5 border border-slate-700 transition-all"
              title="เซ็นชื่อออนไลน์"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">เซ็นออนไลน์</span>
            </button>

            {/* Print / Save Vector PDF */}
            {onPrint && (
              <button
                type="button"
                onClick={onPrint}
                className="px-2.5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1.5 border border-emerald-500 shadow-xs transition-all"
                title="พิมพ์เอกสารหรือบันทึกเป็น PDF ผ่านระบบเบราว์เซอร์ (Vector 100% ตรงตามพรีวิว)"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">พิมพ์ / Save PDF (100%)</span>
              </button>
            )}

            {/* Export PDF */}
            <button
              type="button"
              onClick={onExportPDF}
              className="px-2.5 py-1.5 rounded-md bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs flex items-center gap-1.5 border border-sky-500 shadow-xs transition-all"
              title="ดาวน์โหลดเอกสารเป็นไฟล์ PDF (A4)"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ดาวน์โหลด PDF</span>
            </button>

            {/* Send Email */}
            <button
              type="button"
              onClick={onOpenEmailModal}
              className="px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-indigo-300 font-medium text-xs flex items-center gap-1.5 border border-slate-700 transition-all"
              title="ส่งอีเมลนำส่งเอกสาร CPI"
            >
              <Mail className="w-3.5 h-3.5" />
              <span className="hidden md:inline">ส่งอีเมล</span>
            </button>

            {/* History Folder */}
            <button
              type="button"
              onClick={onOpenHistoryDrawer}
              className="p-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
              title="เปิดคลังเอกสาร CPI"
            >
              <FolderOpen className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

