import React from 'react';
import { X, Plus, FileText, Trash2, Copy, Sparkles, FolderOpen } from 'lucide-react';
import { CPIFormData } from '../types';
import { PRESET_CPI_TEMPLATES } from '../data/presetTemplates';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  savedForms: CPIFormData[];
  activeFormId: string;
  onSelectForm: (form: CPIFormData) => void;
  onCreateNew: () => void;
  onLoadPreset: (presetIndex: number) => void;
  onDuplicate: (form: CPIFormData) => void;
  onDelete: (formId: string) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  savedForms,
  activeFormId,
  onSelectForm,
  onCreateNew,
  onLoadPreset,
  onDuplicate,
  onDelete,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col justify-between border-l border-slate-200">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-teal-400" />
            <div>
              <h3 className="font-semibold text-base">คลังเอกสาร CPI โรงพยาบาลพญาไท</h3>
              <p className="text-xs text-slate-400">บันทึกร่าง โครงการตัวอย่าง และประวัติเอกสาร</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-6">
          {/* New Form Button */}
          <button
            type="button"
            onClick={() => {
              onCreateNew();
              onClose();
            }}
            className="w-full py-3 px-4 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 shadow-md shadow-teal-700/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            สร้างเอกสาร CPI ฉบับใหม่
          </button>

          {/* Presets */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              ตัวอย่างโครงการ CPI มาตรฐาน
            </h4>
            <div className="space-y-2">
              {PRESET_CPI_TEMPLATES.map((preset, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    onLoadPreset(idx);
                    onClose();
                  }}
                  className="p-3 rounded-xl border border-teal-100 bg-teal-50/40 hover:bg-teal-100/60 hover:border-teal-300 cursor-pointer transition-all space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-teal-900 line-clamp-1">{preset.name}</span>
                    <span className="text-[10px] bg-teal-200 text-teal-800 px-1.5 py-0.5 rounded-full font-semibold">
                      ตัวอย่าง
                    </span>
                  </div>
                  <p className="text-[11px] text-teal-700">{preset.dept}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Saved Documents */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
              เอกสาร CPI ที่บันทึกไว้ ({savedForms.length})
            </h4>

            {savedForms.length === 0 ? (
              <div className="p-6 border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-400">
                ยังไม่มีเอกสารที่บันทึกไว้ในเครื่อง
              </div>
            ) : (
              <div className="space-y-2.5">
                {savedForms.map((item) => {
                  const isActive = item.id === activeFormId;
                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                        isActive
                          ? 'bg-teal-50 border-teal-500 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div
                        onClick={() => {
                          onSelectForm(item);
                          onClose();
                        }}
                        className="cursor-pointer space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 font-mono">
                            {item.docNo || 'Draft'}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              item.status === 'approved_closed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.status === 'pending_approval'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {item.status === 'approved_closed'
                              ? 'อนุมัติแล้ว'
                              : item.status === 'pending_approval'
                              ? 'รออนุมัติ'
                              : 'ร่างเอกสาร'}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-800 line-clamp-1">
                          {item.projectTitle || '(ยังไม่ได้ระบุชื่อโครงการ)'}
                        </p>
                        <p className="text-[10px] text-slate-500 line-clamp-1">{item.department}</p>
                      </div>

                      <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-100">
                        <span className="text-[10px] text-slate-400">
                          {new Date(item.updatedAt).toLocaleDateString('th-TH')}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDuplicate(item);
                            }}
                            className="p-1 text-slate-400 hover:text-teal-600 rounded-md hover:bg-slate-100"
                            title="คัดลอกเอกสาร"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('ต้องการลบเอกสารฉบับนี้หรือไม่?')) {
                                onDelete(item.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-slate-100"
                            title="ลบเอกสาร"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
