import React, { useState } from 'react';
import { Sparkles, PenTool, CheckSquare, FileText, UserCheck, HelpCircle, User, Calendar } from 'lucide-react';
import { CPIFormData } from '../types';
import { PROPOSER_OPTIONS, SUPERVISOR_APPROVER_OPTIONS } from '../data/personnel';
import { convertYearToCurrentBE, getTodayThaiBE } from '../utils/dateUtils';

interface CPIFormEditorProps {
  form: CPIFormData;
  onChange: (updatedForm: CPIFormData) => void;
  onOpenSignatureModal: (role: 'proposer' | 'deptHead' | 'approver' | 'proposerPage2') => void;
  onOpenAutoFillModal: () => void;
}

export const CPIFormEditor: React.FC<CPIFormEditorProps> = ({
  form,
  onChange,
  onOpenSignatureModal,
  onOpenAutoFillModal,
}) => {
  const [activeTab, setActiveTab] = useState<'section1' | 'section2' | 'section3' | 'signatures'>('section1');

  const updateField = <K extends keyof CPIFormData>(field: K, value: CPIFormData[K]) => {
    onChange({
      ...form,
      [field]: value,
      updatedAt: new Date().toISOString(),
    });
  };

  const updateNestedObj = <K extends keyof CPIFormData>(
    field: K,
    nestedKey: string,
    value: any
  ) => {
    const current = (form[field] as any) || {};
    onChange({
      ...form,
      [field]: {
        ...current,
        [nestedKey]: value,
      },
      updatedAt: new Date().toISOString(),
    });
  };

  const toggleArrayItem = <K extends keyof CPIFormData>(field: K, item: string) => {
    const currentArr = (form[field] as string[]) || [];
    const exists = currentArr.includes(item);
    const updated = exists
      ? currentArr.filter((i) => i !== item)
      : [...currentArr, item];
    updateField(field, updated as any);
  };

  const handleSyncDatesToCurrentBE = () => {
    const updateYear = (d?: string) => convertYearToCurrentBE(d, true);

    onChange({
      ...form,
      docDate: updateYear(form.docDate),
      startDate: updateYear(form.startDate),
      endDate: updateYear(form.endDate),
      proposerDate: updateYear(form.proposerDate),
      deptHeadDate: updateYear(form.deptHeadDate),
      projectOwnerDatePage2: updateYear(form.projectOwnerDatePage2),
      approverDate: updateYear(form.approverDate),
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden text-slate-800">
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 bg-slate-50/80 px-4 pt-3 gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('section1')}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-semibold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'section1'
              ? 'bg-white border-teal-600 text-teal-800 shadow-xs'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <FileText className="w-4 h-4 text-teal-600" />
          ส่วนที่ 1: รายละเอียดการขอดำเนินการ
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('section2')}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-semibold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'section2'
              ? 'bg-white border-teal-600 text-teal-800 shadow-xs'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          ส่วนที่ 2: รายละเอียดโครงการ (ปัญหา/KPI)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('section3')}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-semibold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'section3'
              ? 'bg-white border-teal-600 text-teal-800 shadow-xs'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <CheckSquare className="w-4 h-4 text-emerald-600" />
          ส่วนที่ 3: ผลการพัฒนา & ประโยชน์ (หน้า 2)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('signatures')}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-semibold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'signatures'
              ? 'bg-white border-teal-600 text-teal-800 shadow-xs'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <UserCheck className="w-4 h-4 text-indigo-600" />
          ลายเซ็น & อนุมัติออนไลน์
        </button>
      </div>

      {/* Main Form Fields Content */}
      <div className="p-6 space-y-6">
        {/* ================= TAB 1: SECTION 1 ================= */}
        {activeTab === 'section1' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="flex items-center justify-between bg-teal-50/60 border border-teal-200/80 p-3.5 rounded-xl">
              <div>
                <h4 className="font-semibold text-teal-900 text-sm">ข้อมูลทั่วไปของโครงการ CPI</h4>
                <p className="text-xs text-teal-700">กรอกข้อมูลตั้งต้น เลขที่โครงการ ฝ่าย/แผนก และประเภทการพัฒนา</p>
              </div>
              <button
                type="button"
                onClick={onOpenAutoFillModal}
                className="px-3.5 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                ให้ AI ช่วยป้อนค่า
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เลขที่โครงการ
                </label>
                <input
                  type="text"
                  value={form.docNo}
                  onChange={(e) => updateField('docNo', e.target.value)}
                  placeholder="เช่น CPI-67-OPD-012"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  วัน/เดือน/ปี ขอดำเนินการ
                </label>
                <input
                  type="text"
                  value={form.docDate}
                  onChange={(e) => updateField('docDate', e.target.value)}
                  placeholder="เช่น 15/08/2567"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ฝ่าย/แผนก/หน่วยงาน
                </label>
                <input
                  type="text"
                  value={form.department}
                  onChange={(e) => updateField('department', e.target.value)}
                  placeholder="เช่น ฝ่ายการพยาบาล / แผนกผู้ป่วยนอก"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ชื่อโครงการ (Project Title) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={form.projectTitle}
                onChange={(e) => updateField('projectTitle', e.target.value)}
                placeholder="ระบุชื่อโครงการพัฒนาคุณภาพ..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            {/* Proposer selection field */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-teal-600" />
                  ผู้เสนอโครงการ ( Project Proposer )
                </label>
                <span className="text-[11px] text-slate-500">เลือกจากรายชื่อหรือพิมพ์ระบุเอง (ซิ้งค์อัตโนมัติทั้งหน้า 1 และหน้า 2)</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={PROPOSER_OPTIONS.includes(form.proposerName) ? form.proposerName : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      updateField('proposerName', e.target.value);
                      updateField('projectOwnerNamePage2', e.target.value);
                    }
                  }}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none min-w-[200px]"
                >
                  <option value="">-- เลือกรายชื่อผู้เสนอโครงการ --</option>
                  {PROPOSER_OPTIONS.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={form.proposerName}
                  onChange={(e) => {
                    updateField('proposerName', e.target.value);
                    updateField('projectOwnerNamePage2', e.target.value);
                  }}
                  placeholder="หรือพิมพ์ชื่อ-นามสกุล..."
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {/* Quick Select Chips */}
              <div className="pt-1">
                <span className="text-[11px] text-slate-500 block mb-1">เลือกด่วน :</span>
                <div className="flex flex-wrap gap-1.5">
                  {PROPOSER_OPTIONS.map((name) => (
                    <button
                      type="button"
                      key={name}
                      onClick={() => {
                        updateField('proposerName', name);
                        updateField('projectOwnerNamePage2', name);
                      }}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                        form.proposerName === name
                          ? 'bg-teal-700 text-white shadow-xs scale-105'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-teal-50 hover:border-teal-300'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="block text-xs font-bold text-slate-800">ประเภทโครงการ :</span>
                <div className="space-y-1.5 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.projectType.includes('IA')}
                      onChange={() => toggleArrayItem('projectType', 'IA')}
                      className="rounded-xs text-teal-600 focus:ring-teal-500"
                    />
                    <span><strong>IA</strong> (Improvement Action)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.projectType.includes('PIP')}
                      onChange={() => toggleArrayItem('projectType', 'PIP')}
                      className="rounded-xs text-teal-600 focus:ring-teal-500"
                    />
                    <span><strong>PIP</strong> (Productivity / Performance Improvement)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.projectType.includes('BIP')}
                      onChange={() => toggleArrayItem('projectType', 'BIP')}
                      className="rounded-xs text-teal-600 focus:ring-teal-500"
                    />
                    <span><strong>BIP</strong> (Business Improvement Project)</span>
                  </label>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="block text-xs font-bold text-slate-800">ประเภทการพัฒนา :</span>
                <div className="space-y-1.5 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.developmentType.includes('clinical')}
                      onChange={() => toggleArrayItem('developmentType', 'clinical')}
                      className="rounded-xs text-teal-600 focus:ring-teal-500"
                    />
                    <span>พัฒนาคุณภาพทางคลินิก</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.developmentType.includes('service_process')}
                      onChange={() => toggleArrayItem('developmentType', 'service_process')}
                      className="rounded-xs text-teal-600 focus:ring-teal-500"
                    />
                    <span>พัฒนาคุณภาพการบริการ / กระบวนการทำงาน</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.developmentType.includes('mini_research')}
                      onChange={() => toggleArrayItem('developmentType', 'mini_research')}
                      className="rounded-xs text-teal-600 focus:ring-teal-500"
                    />
                    <span>Mini Research</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Source Types */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <span className="block text-xs font-bold text-slate-800">ที่มาของโครงการ (เลือกได้หลายข้อ) :</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.sourceTypes.visionPolicy}
                    onChange={(e) => updateNestedObj('sourceTypes', 'visionPolicy', e.target.checked)}
                  />
                  <span>วิสัยทัศน์ เป้าหมายและนโยบายองค์กร</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.sourceTypes.satisfactionSurvey}
                    onChange={(e) => updateNestedObj('sourceTypes', 'satisfactionSurvey', e.target.checked)}
                  />
                  <span>ผลสำรวจความต้องการ/ความพึงพอใจของผู้รับบริการ</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.sourceTypes.riskReview}
                    onChange={(e) => updateNestedObj('sourceTypes', 'riskReview', e.target.checked)}
                  />
                  <span>ทบทวนระบบงาน/ความเสี่ยงในกระบวนการทำงาน</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.sourceTypes.staffSuggestion}
                    onChange={(e) => updateNestedObj('sourceTypes', 'staffSuggestion', e.target.checked)}
                  />
                  <span>ข้อเสนอแนะจากเจ้าหน้าที่</span>
                </label>

                <div className="flex items-center gap-2 col-span-1 md:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={form.sourceTypes.internalAudit}
                      onChange={(e) => updateNestedObj('sourceTypes', 'internalAudit', e.target.checked)}
                    />
                    <span>การประเมินคุณภาพภายในครั้งที่ :</span>
                  </label>
                  <input
                    type="text"
                    value={form.sourceTypes.internalAuditNo}
                    onChange={(e) => updateNestedObj('sourceTypes', 'internalAuditNo', e.target.value)}
                    placeholder="ระบุ..."
                    className="px-2 py-1 border border-slate-300 rounded-md text-xs w-32"
                  />
                </div>

                <div className="flex items-center gap-2 col-span-1 md:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={form.sourceTypes.complaint}
                      onChange={(e) => updateNestedObj('sourceTypes', 'complaint', e.target.checked)}
                    />
                    <span>ข้อร้องเรียนของผู้รับบริการ เลขที่ :</span>
                  </label>
                  <input
                    type="text"
                    value={form.sourceTypes.complaintNo}
                    onChange={(e) => updateNestedObj('sourceTypes', 'complaintNo', e.target.value)}
                    placeholder="ระบุเลขที่ร้องเรียน..."
                    className="px-2 py-1 border border-slate-300 rounded-md text-xs w-40"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.sourceTypes.kpiUnmet}
                    onChange={(e) => updateNestedObj('sourceTypes', 'kpiUnmet', e.target.checked)}
                  />
                  <span>เครื่องชี้วัดผลสัมฤทธิ์ของงาน (KPI) ตกเกณฑ์</span>
                </label>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={form.sourceTypes.other}
                      onChange={(e) => updateNestedObj('sourceTypes', 'other', e.target.checked)}
                    />
                    <span>อื่นๆ :</span>
                  </label>
                  <input
                    type="text"
                    value={form.sourceTypes.otherDetail}
                    onChange={(e) => updateNestedObj('sourceTypes', 'otherDetail', e.target.value)}
                    placeholder="ระบุที่มาอื่นๆ..."
                    className="px-2 py-1 border border-slate-300 rounded-md text-xs flex-1"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: SECTION 2 ================= */}
        {activeTab === 'section2' && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                1. สถานการณ์ปัญหา/โอกาสพัฒนา (Problem Statement & Root Cause)
              </label>
              <textarea
                rows={4}
                value={form.problemStatement}
                onChange={(e) => updateField('problemStatement', e.target.value)}
                placeholder="ระบุปัญหา/โอกาสพัฒนา ผลกระทบต่อการดูแลผู้ป่วย/งาน และสาเหตุสำคัญ..."
                className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                2. เป้าหมาย (Goal)
              </label>
              <textarea
                rows={2}
                value={form.goal}
                onChange={(e) => updateField('goal', e.target.value)}
                placeholder="ระบุเป้าหมายที่ต้องการบรรลุ..."
                className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                3. ตัวชี้วัด (KPI) และ Target
              </label>
              <textarea
                rows={3}
                value={form.kpiAndTarget}
                onChange={(e) => updateField('kpiAndTarget', e.target.value)}
                placeholder="1. ตัวชี้วัดที่ 1 (Target: ...)\n2. ตัวชี้วัดที่ 2 (Target: ...)"
                className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                4. ขั้นตอนการปรับปรุง/เปลี่ยนแปลงกระบวนการ (Action Plan Bullet)
              </label>
              <textarea
                rows={5}
                value={form.improvementSteps}
                onChange={(e) => updateField('improvementSteps', e.target.value)}
                placeholder="• ขั้นตอนที่ 1...\n• ขั้นตอนที่ 2...\n• ขั้นตอนที่ 3..."
                className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  5. วันที่เริ่มต้นโครงการ
                </label>
                <input
                  type="text"
                  value={form.startDate}
                  onChange={(e) => updateField('startDate', e.target.value)}
                  placeholder="เช่น 01/05/2567"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  5. วันที่สิ้นสุดโครงการ
                </label>
                <input
                  type="text"
                  value={form.endDate}
                  onChange={(e) => updateField('endDate', e.target.value)}
                  placeholder="เช่น 31/07/2567"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                6. ประโยชน์ที่คาดว่าจะได้รับ
              </label>
              <textarea
                rows={3}
                value={form.expectedBenefits}
                onChange={(e) => updateField('expectedBenefits', e.target.value)}
                placeholder="1. ...\n2. ..."
                className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                7. งบประมาณ (ถ้ามี)
              </label>
              <input
                type="text"
                value={form.budget}
                onChange={(e) => updateField('budget', e.target.value)}
                placeholder="ไม่มี (0 บาท) หรือระบุจำนวนเงิน..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>
        )}

        {/* ================= TAB 3: SECTION 3 ================= */}
        {activeTab === 'section3' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                1.1 ผลลัพธ์ KPI (การบรรลุตามเป้าหมาย)
              </label>
              <textarea
                rows={3}
                value={form.resultsKPI}
                onChange={(e) => updateField('resultsKPI', e.target.value)}
                placeholder="ระบุผลลัพธ์ตัวชี้วัด เช่น ระยะเวลารอคอยลดลงจาก 42 นาที เหลือ 18.5 นาที (เป้าหมาย <= 22 นาที)..."
                className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                1.2 ผลลัพธ์อื่นๆ (ถ้ามี)
              </label>
              <textarea
                rows={2}
                value={form.resultsOther}
                onChange={(e) => updateField('resultsOther', e.target.value)}
                placeholder="ระบุผลลัพธ์อื่นๆ เพิ่มเติม..."
                className="w-full p-3 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            {/* Benefits Checkboxes */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <span className="block text-xs font-bold text-slate-800">
                2. ประโยชน์ที่ได้รับ (เลือกได้มากกว่า 1 ข้อ) :
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.benefitsReceived.increaseSatisfaction}
                    onChange={(e) => updateNestedObj('benefitsReceived', 'increaseSatisfaction', e.target.checked)}
                  />
                  <span>เพิ่มความพึงพอใจของผู้รับบริการ</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.benefitsReceived.internalCommEfficiency}
                    onChange={(e) => updateNestedObj('benefitsReceived', 'internalCommEfficiency', e.target.checked)}
                  />
                  <span>เพิ่มประสิทธิภาพการสื่อสารภายใน</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.benefitsReceived.reduceErrors}
                    onChange={(e) => updateNestedObj('benefitsReceived', 'reduceErrors', e.target.checked)}
                  />
                  <span>ลดความผิดพลาดในการให้บริการ</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.benefitsReceived.staffSkill}
                    onChange={(e) => updateNestedObj('benefitsReceived', 'staffSkill', e.target.checked)}
                  />
                  <span>เพิ่มความรู้ ความชำนาญของเจ้าหน้าที่</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.benefitsReceived.efficientResource}
                    onChange={(e) => updateNestedObj('benefitsReceived', 'efficientResource', e.target.checked)}
                  />
                  <span>มีการใช้ทรัพยากร อย่างคุ้มค่า</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.benefitsReceived.staffSatisfaction}
                    onChange={(e) => updateNestedObj('benefitsReceived', 'staffSatisfaction', e.target.checked)}
                  />
                  <span>เพิ่มความพึงพอใจของเจ้าหน้าที่</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.benefitsReceived.reduceComplications}
                    onChange={(e) => updateNestedObj('benefitsReceived', 'reduceComplications', e.target.checked)}
                  />
                  <span>ลดภาวะแทรกซ้อนของผู้ป่วย</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.benefitsReceived.treatmentOutcome}
                    onChange={(e) => updateNestedObj('benefitsReceived', 'treatmentOutcome', e.target.checked)}
                  />
                  <span>ผลลัพธ์การรักษาดีขึ้น</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.benefitsReceived.increaseSpeed}
                    onChange={(e) => updateNestedObj('benefitsReceived', 'increaseSpeed', e.target.checked)}
                  />
                  <span>เพิ่มความรวดเร็วในการให้บริการ</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.benefitsReceived.increaseSafety}
                    onChange={(e) => updateNestedObj('benefitsReceived', 'increaseSafety', e.target.checked)}
                  />
                  <span>เพิ่มความปลอดภัย</span>
                </label>

                <div className="flex items-center gap-2 col-span-1 md:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={form.benefitsReceived.costReduction}
                      onChange={(e) => updateNestedObj('benefitsReceived', 'costReduction', e.target.checked)}
                    />
                    <span>ลดต้นทุน/ค่าใช้จ่าย จำนวน :</span>
                  </label>
                  <input
                    type="text"
                    value={form.benefitsReceived.costReductionAmount}
                    onChange={(e) => updateNestedObj('benefitsReceived', 'costReductionAmount', e.target.value)}
                    placeholder="จำนวนเงิน..."
                    className="px-2 py-1 border border-slate-300 rounded-md text-xs w-28"
                  />
                  <span>บาท</span>
                </div>

                <div className="flex items-center gap-2 col-span-1 md:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={form.benefitsReceived.revenueIncrease}
                      onChange={(e) => updateNestedObj('benefitsReceived', 'revenueIncrease', e.target.checked)}
                    />
                    <span>เพิ่มรายได้ จำนวน :</span>
                  </label>
                  <input
                    type="text"
                    value={form.benefitsReceived.revenueIncreaseAmount}
                    onChange={(e) => updateNestedObj('benefitsReceived', 'revenueIncreaseAmount', e.target.value)}
                    placeholder="จำนวนเงิน..."
                    className="px-2 py-1 border border-slate-300 rounded-md text-xs w-28"
                  />
                  <span>บาท</span>
                </div>
              </div>
            </div>

            {/* Obstacles */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <span className="block text-xs font-bold text-slate-800">
                3. ปัญหาอุปสรรคการดำเนินโครงการ และแนวทางการแก้ไข :
              </span>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="block text-slate-700 mb-1">3.1 ขั้นตอนในการเก็บรวบรวมข้อมูล :</label>
                  <input
                    type="text"
                    value={form.obstacles.dataCollection}
                    onChange={(e) => updateNestedObj('obstacles', 'dataCollection', e.target.value)}
                    placeholder="ระบุ..."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">3.2 ขั้นตอนในการเก็บตัวชี้วัด :</label>
                  <input
                    type="text"
                    value={form.obstacles.kpiCollection}
                    onChange={(e) => updateNestedObj('obstacles', 'kpiCollection', e.target.value)}
                    placeholder="ระบุ..."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">3.3 ขั้นตอนในการหาแนวทางแก้ไข :</label>
                  <input
                    type="text"
                    value={form.obstacles.findingSolutions}
                    onChange={(e) => updateNestedObj('obstacles', 'findingSolutions', e.target.value)}
                    placeholder="ระบุ..."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                4. ข้อเสนอแนะ / การขยายผลโครงการ
              </label>
              <textarea
                rows={3}
                value={form.recommendationsExpansion}
                onChange={(e) => updateField('recommendationsExpansion', e.target.value)}
                placeholder="ระบุแนวทางการขยายผลไปยังแผนกอื่น..."
                className="w-full p-3 border border-slate-300 rounded-xl text-sm"
              />
            </div>
          </div>
        )}

        {/* ================= TAB 4: SIGNATURES ================= */}
        {activeTab === 'signatures' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="p-4 bg-slate-900 text-white rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-semibold text-sm">การเซ็นออนไลน์ & จัดการวันที่ลงนาม (E-Signatures & Dates)</h4>
                <p className="text-xs text-slate-300">
                  เซ็นชื่อออนไลน์ และตรวจสอบวันที่ลงนามให้ตรงตาม ค.ศ. ปัจจุบัน
                </p>
              </div>
              <button
                type="button"
                onClick={handleSyncDatesToCurrentBE}
                className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs shrink-0"
              >
                <Calendar className="w-3.5 h-3.5 text-teal-200" />
                ปรับวันที่ทั้งหมดเป็น ค.ศ. ปัจจุบัน
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Proposer Signature Card */}
              <div className="p-4 border border-slate-200 rounded-xl space-y-3 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800">1. ผู้เสนอโครงการ (หน้า 1)</span>
                  <button
                    type="button"
                    onClick={() => onOpenSignatureModal('proposer')}
                    className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-medium flex items-center gap-1"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    เซ็นชื่อออนไลน์
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs text-slate-600">เลือก/ระบุชื่อผู้เสนอโครงการ :</label>
                  <select
                    value={PROPOSER_OPTIONS.includes(form.proposerName) ? form.proposerName : ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        updateField('proposerName', e.target.value);
                        updateField('projectOwnerNamePage2', e.target.value);
                      }
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="">-- เลือกรายชื่อผู้เสนอโครงการ --</option>
                    {PROPOSER_OPTIONS.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>

                  <div className="flex flex-wrap gap-1 py-1">
                    {PROPOSER_OPTIONS.map((name) => (
                      <button
                        type="button"
                        key={name}
                        onClick={() => {
                          updateField('proposerName', name);
                          updateField('projectOwnerNamePage2', name);
                        }}
                        className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-all ${
                          form.proposerName === name
                            ? 'bg-teal-700 text-white'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-teal-50'
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={form.proposerName}
                    onChange={(e) => {
                      updateField('proposerName', e.target.value);
                      updateField('projectOwnerNamePage2', e.target.value);
                    }}
                    placeholder="พิมพ์ชื่อ-นามสกุล..."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />

                  <div className="pt-1">
                    <label className="block text-[11px] text-slate-600 mb-0.5">วันที่ลงนาม (ผู้เสนอโครงการ) :</label>
                    <input
                      type="text"
                      value={form.proposerDate}
                      onChange={(e) => updateField('proposerDate', e.target.value)}
                      placeholder="เช่น 01/05/2569"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {form.proposerSignature ? (
                  <div className="p-2 border border-slate-200 bg-white rounded-lg flex items-center justify-center">
                    <img src={form.proposerSignature} alt="ลายเซ็น" className="h-12 object-contain" />
                  </div>
                ) : (
                  <div className="p-3 border border-dashed border-slate-300 bg-slate-100/50 rounded-lg text-center text-xs text-slate-400">
                    ยังไม่มีลายเซ็น
                  </div>
                )}
              </div>

              {/* Department Head Signature Card */}
              <div className="p-4 border border-slate-200 rounded-xl space-y-3 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800">2. หัวหน้างาน / ผู้จัดการแผนก</span>
                  <button
                    type="button"
                    onClick={() => onOpenSignatureModal('deptHead')}
                    className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-medium flex items-center gap-1"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    เซ็นชื่อออนไลน์
                  </button>
                </div>

                <div className="flex gap-4 text-xs font-medium">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="deptHeadOp"
                      checked={form.deptHeadOpinion === 'approve'}
                      onChange={() => updateField('deptHeadOpinion', 'approve')}
                    />
                    <span>เห็นสมควรเปิดโครงการ</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="deptHeadOp"
                      checked={form.deptHeadOpinion === 'disapprove'}
                      onChange={() => updateField('deptHeadOpinion', 'disapprove')}
                    />
                    <span>ไม่เห็นด้วย</span>
                  </label>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs text-slate-600">เลือกรายชื่อหัวหน้างาน :</label>
                  <select
                    value={SUPERVISOR_APPROVER_OPTIONS.some(s => s.name === form.deptHeadName) ? form.deptHeadName : ''}
                    onChange={(e) => {
                      const found = SUPERVISOR_APPROVER_OPTIONS.find(s => s.name === e.target.value);
                      if (found) {
                        updateField('deptHeadName', found.name);
                        if (found.position) {
                          updateField('deptHeadPosition', found.position);
                        }
                      }
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="">-- เลือกรายชื่อหัวหน้างาน --</option>
                    {SUPERVISOR_APPROVER_OPTIONS.map((item) => (
                      <option key={item.name} value={item.name}>
                        {item.name} {item.position ? `(${item.position})` : ''}
                      </option>
                    ))}
                  </select>

                  <div className="flex flex-wrap gap-1 py-1">
                    {SUPERVISOR_APPROVER_OPTIONS.map((item) => (
                      <button
                        type="button"
                        key={item.name}
                        onClick={() => {
                          updateField('deptHeadName', item.name);
                          if (item.position) {
                            updateField('deptHeadPosition', item.position);
                          }
                        }}
                        className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-all ${
                          form.deptHeadName === item.name
                            ? 'bg-teal-700 text-white'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-teal-50'
                        }`}
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">ชื่อ-นามสกุล :</label>
                      <input
                        type="text"
                        value={form.deptHeadName}
                        onChange={(e) => updateField('deptHeadName', e.target.value)}
                        placeholder="ชื่อ-นามสกุล..."
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">ตำแหน่ง :</label>
                      <input
                        type="text"
                        value={form.deptHeadPosition}
                        onChange={(e) => updateField('deptHeadPosition', e.target.value)}
                        placeholder="ตำแหน่ง..."
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div className="pt-1">
                    <label className="block text-[11px] text-slate-600 mb-0.5">วันที่ลงนาม (หัวหน้างาน) :</label>
                    <input
                      type="text"
                      value={form.deptHeadDate}
                      onChange={(e) => updateField('deptHeadDate', e.target.value)}
                      placeholder="เช่น 03/05/2569"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {form.deptHeadSignature ? (
                  <div className="p-2 border border-slate-200 bg-white rounded-lg flex items-center justify-center">
                    <img src={form.deptHeadSignature} alt="ลายเซ็น" className="h-12 object-contain" />
                  </div>
                ) : (
                  <div className="p-3 border border-dashed border-slate-300 bg-slate-100/50 rounded-lg text-center text-xs text-slate-400">
                    ยังไม่มีลายเซ็น
                  </div>
                )}
              </div>

              {/* Approver Signature Card */}
              <div className="p-4 border border-slate-200 rounded-xl space-y-3 bg-slate-50/50 col-span-1 md:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800">
                    3. ผู้อนุมัติปิดโครงการ (Closing Approver Page 2)
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenSignatureModal('approver')}
                    className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-medium flex items-center gap-1"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    เซ็นอนุมัติปิดโครงการ
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <label className="block text-slate-600">เลือกรายชื่อผู้อนุมัติปิดโครงการ :</label>
                  <select
                    value={SUPERVISOR_APPROVER_OPTIONS.some(s => s.name === form.approverName) ? form.approverName : ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        updateField('approverName', e.target.value);
                      }
                    }}
                    className="w-full md:w-1/2 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="">-- เลือกรายชื่อผู้อนุมัติปิดโครงการ --</option>
                    {SUPERVISOR_APPROVER_OPTIONS.map((item) => (
                      <option key={item.name} value={item.name}>
                        {item.name} {item.position ? `(${item.position})` : ''}
                      </option>
                    ))}
                  </select>

                  <div className="flex flex-wrap gap-1">
                    {SUPERVISOR_APPROVER_OPTIONS.map((item) => (
                      <button
                        type="button"
                        key={item.name}
                        onClick={() => updateField('approverName', item.name)}
                        className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-all ${
                          form.approverName === item.name
                            ? 'bg-teal-700 text-white'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-teal-50'
                        }`}
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block text-slate-600 mb-1">ชื่อผู้อนุมัติปิดโครงการ :</label>
                      <input
                        type="text"
                        value={form.approverName}
                        onChange={(e) => updateField('approverName', e.target.value)}
                        placeholder="พิมพ์ชื่อ-นามสกุล..."
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-2 md:pt-4">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.closureOpinion.closeApproved}
                          onChange={(e) => updateNestedObj('closureOpinion', 'closeApproved', e.target.checked)}
                        />
                        <span className="font-semibold text-emerald-800">อนุมัติปิดโครงการได้</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.closureOpinion.reliableData}
                          onChange={(e) => updateNestedObj('closureOpinion', 'reliableData', e.target.checked)}
                        />
                        <span>ข้อมูลเพียงพอและเชื่อถือได้</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200/80">
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">วันที่ผู้รับผิดชอบโครงการลงนาม (หน้า 2) :</label>
                      <input
                        type="text"
                        value={form.projectOwnerDatePage2}
                        onChange={(e) => updateField('projectOwnerDatePage2', e.target.value)}
                        placeholder="เช่น 01/08/2569"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">วันที่ผู้อนุมัติปิดโครงการลงนาม (หน้า 2) :</label>
                      <input
                        type="text"
                        value={form.approverDate}
                        onChange={(e) => updateField('approverDate', e.target.value)}
                        placeholder="เช่น 05/08/2569"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>

                {form.approverSignature ? (
                  <div className="p-2 border border-slate-200 bg-white rounded-lg flex items-center justify-center">
                    <img src={form.approverSignature} alt="ลายเซ็น" className="h-12 object-contain" />
                  </div>
                ) : (
                  <div className="p-3 border border-dashed border-slate-300 bg-slate-100/50 rounded-lg text-center text-xs text-slate-400">
                    ยังไม่มีลายเซ็นอนุมัติ
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
