import React, { useState } from 'react';
import { Printer, FileDown, X, Layers, FileText, CheckCircle2 } from 'lucide-react';
import { CPIFormData } from '../types';
import { PageExportOption, exportToPDF, printDocument } from '../utils/exporter';

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: CPIFormData;
  onStatusChange?: (msg: string | null) => void;
}

export const PrintModal: React.FC<PrintModalProps> = ({
  isOpen,
  onClose,
  form,
  onStatusChange,
}) => {
  const [selectedPage, setSelectedPage] = useState<PageExportOption>('all');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handlePrint = async () => {
    setIsLoading(true);
    await printDocument(form, selectedPage, onStatusChange);
    setIsLoading(false);
    onClose();
  };

  const handleExportPDF = async () => {
    setIsLoading(true);
    await exportToPDF(form, selectedPage, onStatusChange);
    setIsLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">เลือกหน้าที่ต้องการพิมพ์ / ดาวน์โหลด PDF</h3>
              <p className="text-xs text-slate-300">
                เอกสาร CPI พญาไท ({form.docNo || 'PTP-FM-QMS-001'})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            ระบุหน้าที่ต้องการพิมพ์หรือส่งออก:
          </label>

          <div className="space-y-2.5">
            {/* Option: All Pages */}
            <div
              onClick={() => setSelectedPage('all')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3.5 ${
                selectedPage === 'all'
                  ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="mt-0.5">
                <input
                  type="radio"
                  name="pageOption"
                  checked={selectedPage === 'all'}
                  onChange={() => setSelectedPage('all')}
                  className="w-4 h-4 accent-emerald-600 cursor-pointer"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    พิมพ์ / ดาวน์โหลด ทุกหน้า (หน้า 1 และ หน้า 2)
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                    สมบูรณ์ (2 หน้า A4)
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  รวมเนื้อหาครบถ้วน: ส่วนที่ 1-2 (เสนอเปิดโครงการ) และส่วนที่ 3 (รายงานผลสัมฤทธิ์และอนุมัติปิดโครงการ)
                </p>
              </div>
            </div>

            {/* Option: Page 1 Only */}
            <div
              onClick={() => setSelectedPage('page1')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3.5 ${
                selectedPage === 'page1'
                  ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="mt-0.5">
                <input
                  type="radio"
                  name="pageOption"
                  checked={selectedPage === 'page1'}
                  onChange={() => setSelectedPage('page1')}
                  className="w-4 h-4 accent-emerald-600 cursor-pointer"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    เฉพาะหน้า 1 (ส่วนที่ 1 และ 2)
                  </span>
                  <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
                    หน้า 1 A4
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  แบบบันทึกขอดำเนินการกิจกรรม CPI สำหรับนำเสนอขอเปิดโครงการ และลงนามเสนอหัวหน้างาน
                </p>
              </div>
            </div>

            {/* Option: Page 2 Only */}
            <div
              onClick={() => setSelectedPage('page2')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3.5 ${
                selectedPage === 'page2'
                  ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="mt-0.5">
                <input
                  type="radio"
                  name="pageOption"
                  checked={selectedPage === 'page2'}
                  onChange={() => setSelectedPage('page2')}
                  className="w-4 h-4 accent-emerald-600 cursor-pointer"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    เฉพาะหน้า 2 (ส่วนที่ 3)
                  </span>
                  <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
                    หน้า 2 A4
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  แบบรายงานผลสัมฤทธิ์ของงาน (CPI) สำหรับสรุปผลลัพธ์ KPI และเสนอขออนุมัติปิดโครงการ
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
          >
            ยกเลิก
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isLoading}
              onClick={handleExportPDF}
              className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs disabled:opacity-50 transition-all"
            >
              <FileDown className="w-4 h-4" />
              ดาวน์โหลด PDF
            </button>

            <button
              type="button"
              disabled={isLoading}
              onClick={handlePrint}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all"
            >
              <Printer className="w-4 h-4" />
              สั่งพิมพ์ (Print)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
