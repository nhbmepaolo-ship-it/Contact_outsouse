import React, { useState } from 'react';
import { Sparkles, X, Loader2, Wand2, CheckCircle2 } from 'lucide-react';
import { CPIFormData } from '../types';

interface AutoFillModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDepartment: string;
  onApplyData: (generatedData: Partial<CPIFormData>) => void;
}

const SAMPLE_QUICK_TOPICS = [
  'ลดระยะเวลารอคอยรับยาผู้ป่วยนอก (OPD Pharmacy Lead Time)',
  'ลดอัตราการเกิดแผลกดทับในผู้ป่วยกลุ่มเสี่ยงวอร์ดผู้ป่วยใน',
  'เพิ่มความถูกต้องในการระบุตัวผู้ป่วยด้วยป้าย wristband',
  'การพัฒนาระบบคิวและนัดหมายออนไลน์เพื่อลดความแออัด',
  'ลดระยะเวลารายงานผลแล็บด่วน (STAT Lab TAT)',
  'ลดข้อผิดพลาดในการคีย์ประวัติแพ้ยาผู้ป่วยใหม่',
];

export const AutoFillModal: React.FC<AutoFillModalProps> = ({
  isOpen,
  onClose,
  currentDepartment,
  onApplyData,
}) => {
  const [topic, setTopic] = useState('');
  const [dept, setDept] = useState(currentDepartment || 'ฝ่ายการพยาบาล / แผนกผู้ป่วยนอก');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const handleGenerate = async (selectedTopic?: string) => {
    const targetTopic = selectedTopic || topic;
    if (!targetTopic.trim()) {
      setError('กรุณาระบุหัวข้อโครงการหรือเลือกแนวทางตัวอย่าง');
      return;
    }

    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/gemini/autofill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: targetTopic,
          department: dept,
        }),
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'ไม่สามารถสร้างข้อมูลด้วย AI ได้');
      }

      const generated = resData.data;

      // Map generated object to CPIFormData partial fields
      const mappedData: Partial<CPIFormData> = {
        department: dept,
        projectTitle: generated.projectTitle || targetTopic,
        projectType: Array.isArray(generated.projectType) ? generated.projectType : ['PIP'],
        developmentType: Array.isArray(generated.developmentType) ? generated.developmentType : ['service_process'],
        problemStatement: generated.problemStatement || '',
        goal: generated.goal || '',
        kpiAndTarget: generated.kpiAndTarget || '',
        improvementSteps: generated.improvementSteps || '',
        expectedBenefits: generated.expectedBenefits || '',
        budget: generated.budget || 'ไม่มี (0 บาท)',
        resultsKPI: generated.resultsKPI || '',
        resultsOther: generated.resultsOther || '',
        obstacles: {
          dataCollection: generated.obstaclesDataCollection || 'ไม่มี',
          kpiCollection: generated.obstaclesKPICollection || 'ไม่มี',
          findingSolutions: generated.obstaclesFindingSolutions || 'ไม่มี',
          other: 'ไม่มี',
        },
        recommendationsExpansion: generated.recommendationsExpansion || '',
      };

      onApplyData(mappedData);
      setSuccessMessage('ป้อนค่าอัตโนมัติด้วย AI เรียบร้อยแล้ว!');

      setTimeout(() => {
        setIsLoading(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('AI generation error:', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อกับ Gemini AI');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-teal-800 to-emerald-900 text-white">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            <div>
              <h3 className="font-semibold text-lg leading-snug">Auto-Fill ด้วย Gemini AI</h3>
              <p className="text-xs text-teal-200 font-light">
                ป้อนค่าและยกร่างโครงการ CPI ทั้งหมดโดยอัตโนมัติตามมาตรฐานพญาไท
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-teal-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {successMessage}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              ฝ่าย / แผนก / หน่วยงาน
            </label>
            <input
              type="text"
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              placeholder="เช่น ฝ่ายการพยาบาล / แผนกผู้ป่วยนอก (OPD)..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              หัวข้อหรือประเด็นการพัฒนาคุณภาพงาน (Topic / Concept)
            </label>
            <textarea
              rows={3}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="เช่น ปรับปรุงกระบวนการรับยา OPD ให้เร็วขึ้น หรือ พัฒนาการเฝ้าระวังผู้ป่วยล้ม..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 text-sm"
            />
          </div>

          {/* Quick preset topics */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2">
              หรือเลือกจากหัวข้อตัวอย่างยอดนิยม:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_QUICK_TOPICS.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setTopic(item);
                    handleGenerate(item);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-medium border border-teal-200/60 transition-colors text-left"
                >
                  + {item}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm font-medium transition-colors"
            >
              ยกเลิก
            </button>

            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleGenerate()}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-teal-600/20 disabled:opacity-60 transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  กำลังประมวลผลด้วย AI...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  สร้างและป้อนค่าอัตโนมัติ
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
