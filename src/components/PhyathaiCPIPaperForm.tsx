import React from 'react';
import { CPIFormData } from '../types';
import { PhyathaiLogo } from './PhyathaiLogo';

interface PhyathaiCPIPaperFormProps {
  form: CPIFormData;
  onOpenSignatureModal?: (role: 'proposer' | 'deptHead' | 'approver' | 'proposerPage2') => void;
}

// Helper function to format any date string to CE (ค.ศ.) for A4 Preview & Export PDF
const displayCE = (dateStr?: string | null): string => {
  if (!dateStr || !dateStr.trim()) return '';
  const str = dateStr.trim();
  // Match DD/MM/YYYY or DD/MM/YY
  const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    let year = parseInt(match[3], 10);
    if (year < 100) {
      year += 2500;
    }
    if (year > 2400) {
      year -= 543;
    }
    return `${day}/${month}/${year}`;
  }
  // Match YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    let year = parseInt(isoMatch[1], 10);
    if (year > 2400) {
      year -= 543;
    }
    const month = isoMatch[2];
    const day = isoMatch[3];
    return `${day}/${month}/${year}`;
  }
  return str;
};

const getVisualLength = (str: string): number => {
  return str.replace(/[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/g, '').length;
};

// Helper to wrap Thai / English text into explicit lines so EVERY line gets a dotted underline
const wrapTextToLines = (text: string, charsPerLine: number = 95): string[] => {
  if (!text || !text.trim()) return [];

  const rawParagraphs = text.split('\n');
  const resultLines: string[] = [];

  for (const para of rawParagraphs) {
    if (!para.trim()) {
      resultLines.push('');
      continue;
    }

    let remaining = para.trim();
    while (remaining.length > 0) {
      if (getVisualLength(remaining) <= charsPerLine) {
        resultLines.push(remaining);
        break;
      }

      // Find break index based on visual length
      let currentVisual = 0;
      let breakIdx = remaining.length;

      for (let i = 0; i < remaining.length; i++) {
        const char = remaining[i];
        if (!/[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/.test(char)) {
          currentVisual++;
        }
        if (currentVisual >= charsPerLine) {
          breakIdx = i + 1;
          break;
        }
      }

      // Look back for space or punctuation
      const windowStart = Math.max(0, breakIdx - 20);
      const searchSub = remaining.substring(windowStart, breakIdx);
      const lastSpace = searchSub.lastIndexOf(' ');
      if (lastSpace !== -1 && lastSpace > 0) {
        breakIdx = windowStart + lastSpace;
      } else {
        const match = searchSub.match(/[/,)\]}\-\s]/g);
        if (match && match.length > 0) {
          const lastSymbol = searchSub.lastIndexOf(match[match.length - 1]);
          if (lastSymbol !== -1 && lastSymbol > 0) {
            breakIdx = windowStart + lastSymbol + 1;
          }
        }
      }

      if (breakIdx <= 0 || breakIdx > remaining.length) {
        breakIdx = remaining.length;
      }

      const currentLine = remaining.substring(0, breakIdx).trim();
      if (currentLine) {
        resultLines.push(currentLine);
      }
      remaining = remaining.substring(breakIdx).trim();
    }
  }

  return resultLines;
};

export const PhyathaiCPIPaperForm: React.FC<PhyathaiCPIPaperFormProps> = ({
  form,
  onOpenSignatureModal,
}) => {
  // Helper to render checkbox square cleanly aligned at top line
  const renderCheckbox = (isChecked: boolean) => (
    <span
      className="border border-black bg-white shrink-0 inline-flex items-center justify-center select-none mr-1.5 mt-0.5"
      style={{
        width: '13px',
        height: '13px',
        minWidth: '13px',
        minHeight: '13px',
        boxSizing: 'border-box',
      }}
    >
      {isChecked && (
        <svg
          viewBox="0 0 12 12"
          className="w-2.5 h-2.5 text-black fill-current"
          style={{ width: '9px', height: '9px' }}
        >
          <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      )}
    </span>
  );

  // Helper for rendering single line fillable fields cleanly above dotted line
  const renderLine = (value?: string, minWidthClass: string = 'min-w-[100px]', charsPerLine: number = 90) => {
    const hasValue = Boolean(value && value.trim());
    if (!hasValue) {
      return (
        <span
          className={`inline-block border-b border-dotted border-black px-1 pb-[1px] ${minWidthClass}`}
          style={{ verticalAlign: 'baseline' }}
        >
          <span className="font-semibold text-black text-xs whitespace-pre-wrap">{'\u00A0'}</span>
        </span>
      );
    }

    const wrapped = wrapTextToLines(value!, charsPerLine);
    if (wrapped.length <= 1) {
      return (
        <span
          className={`inline-block border-b border-dotted border-black px-1 pb-[1px] ${minWidthClass}`}
          style={{ verticalAlign: 'baseline' }}
        >
          <span className="font-semibold text-black text-xs whitespace-pre-wrap">{value}</span>
        </span>
      );
    }

    return (
      <div className="flex flex-col py-0 space-y-0 w-full">
        {wrapped.map((line, i) => (
          <div
            key={i}
            className="border-b border-dotted border-black text-black font-semibold text-xs py-[1px] px-0.5 whitespace-pre-wrap min-h-[16px] leading-tight w-full"
          >
            {line || '\u00A0'}
          </div>
        ))}
      </div>
    );
  };

  // Helper for rendering multi-line text areas cleanly above dotted lines
  const renderMultiLine = (value?: string, minLines: number = 2, charsPerLine: number = 95) => {
    const hasValue = Boolean(value && value.trim());
    const lines = hasValue ? wrapTextToLines(value!, charsPerLine) : [];
    const totalLinesToRender = Math.max(minLines, lines.length);

    return (
      <div className="flex flex-col py-0 space-y-0 w-full">
        {Array.from({ length: totalLinesToRender }).map((_, i) => {
          const lineText = lines[i] || '';
          return (
            <div
              key={i}
              className="border-b border-dotted border-black text-black font-semibold text-xs py-[1px] px-0.5 whitespace-pre-wrap min-h-[16px] leading-tight w-full"
            >
              {lineText || '\u00A0'}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="printable-paper flex flex-col items-center gap-8 print:gap-0 print:p-0 font-['Sarabun','TH_Sarabun_New',sans-serif] text-black leading-snug select-none">
      {/* ================= PAGE 1 ================= */}
      <div className="a4-page bg-white w-[210mm] h-[297mm] min-h-[297mm] p-[5mm] shadow-2xl rounded-none border border-black print:shadow-none print:border-none print:m-0 print:p-[5mm] relative flex flex-col justify-between box-border overflow-hidden">
        {/* Document Header Page 1 */}
        <div className="flex items-center gap-2 mb-1">
          {/* Logo Left Page 1 */}
          <div className="w-[170px] shrink-0 flex items-center justify-start p-1 h-[50px]">
            <PhyathaiLogo className="h-[50px] w-auto max-w-full object-contain" />
          </div>

          {/* Title Box Right */}
          <div className="flex-1 border border-black p-1.5 flex flex-col items-center justify-center text-center h-[50px]">
            <h1 className="text-sm font-bold text-black leading-tight">
              แบบบันทึกกิจกรรมพัฒนาผลสัมฤทธิ์ของงาน
            </h1>
            <h2 className="text-xs font-bold text-black mt-0.5">
              (Continuous Performance Improvement Project : CPI)
            </h2>
          </div>
        </div>

        {/* Page 1 Outer Form Frame */}
        <div className="border border-black flex flex-col justify-start flex-1">
          {/* SECTION 1 */}
          <div>
            {/* Section 1 Header Banner */}
            <div className="section-header-banner bg-[#e5e7eb] text-black font-bold text-xs px-2 py-1 border-b border-black" style={{ backgroundColor: '#e5e7eb', color: '#000000' }}>
              ส่วนที่ 1 รายละเอียดการขอดำเนินการ
            </div>

            {/* Section 1 Content Grid */}
            <div className="text-xs divide-y divide-black">
              {/* Row 1: Doc Meta 3 Columns */}
              <div className="py-1 px-2 flex items-start justify-between gap-x-3 gap-y-1 flex-wrap">
                <div className="flex items-start shrink-0 pt-0.5">
                  <span className="font-bold whitespace-nowrap mr-1">เลขที่โครงการ :</span>
                  {renderLine(form.docNo, 'min-w-[90px]')}
                  <span className="font-bold ml-1 mr-2">;</span>
                </div>
                <div className="flex items-start shrink-0 pt-0.5">
                  <span className="font-bold whitespace-nowrap mr-1">วัน/เดือน/ปี ขอดำเนินการ :</span>
                  {renderLine(displayCE(form.docDate), 'min-w-[100px]')}
                </div>
                <div className="flex items-start flex-1 min-w-[220px] pt-0.5">
                  <span className="font-bold whitespace-nowrap mr-1 shrink-0">ฝ่าย/แผนก/หน่วยงาน :</span>
                  <div className="flex-1 min-w-0">
                    {renderLine(form.department, 'w-full')}
                  </div>
                </div>
              </div>

              {/* Row 2: Project Title */}
              <div className="py-1 px-2 flex items-start min-w-0">
                <span className="font-bold whitespace-nowrap mr-2 shrink-0 pt-0.5">ชื่อโครงการ :</span>
                <div className="flex-1 min-w-0">
                  {renderLine(form.projectTitle, 'w-full')}
                </div>
              </div>

              {/* Row 3: Project Types */}
              <div className="py-1 px-2 flex items-start">
                <span className="font-bold whitespace-nowrap mr-2">ประเภทโครงการ :</span>
                <div className="flex-1 space-y-0.5">
                  <div className="flex flex-wrap gap-x-4">
                    <label className="inline-flex items-center cursor-pointer">
                      {renderCheckbox(form.projectType.includes('IA'))}
                      <span>IA (Improvement Action)</span>
                    </label>
                    <label className="inline-flex items-center cursor-pointer">
                      {renderCheckbox(form.projectType.includes('PIP'))}
                      <span>PIP ( Productivity /Performance Improvement Project )</span>
                    </label>
                  </div>
                  <div>
                    <label className="inline-flex items-center cursor-pointer">
                      {renderCheckbox(form.projectType.includes('BIP'))}
                      <span>BIP ( Business Improvement Project )</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Row 4: Development Types */}
              <div className="py-1 px-2 flex items-start">
                <span className="font-bold whitespace-nowrap mr-2">ประเภทการพัฒนา :</span>
                <div className="flex-1 flex flex-wrap gap-x-4 gap-y-0.5">
                  <label className="inline-flex items-center cursor-pointer">
                    {renderCheckbox(form.developmentType.includes('clinical'))}
                    <span>พัฒนาคุณภาพทางคลินิก</span>
                  </label>
                  <label className="inline-flex items-center cursor-pointer">
                    {renderCheckbox(form.developmentType.includes('service_process'))}
                    <span>พัฒนาคุณภาพการบริการ/ กระบวนการทำงาน</span>
                  </label>
                  <label className="inline-flex items-center cursor-pointer">
                    {renderCheckbox(form.developmentType.includes('mini_research'))}
                    <span>Mini Research</span>
                  </label>
                </div>
              </div>

              {/* Row 5: Source Types */}
              <div className="py-1 px-2">
                <span className="font-bold block mb-1">ที่มาโครงการ :</span>
                <div className="grid grid-cols-2 pl-2 gap-y-1">
                  <div className="pr-1">
                    <label className="inline-flex items-start cursor-pointer">
                      {renderCheckbox(form.sourceTypes.visionPolicy)}
                      <span>วิสัยทัศน์ เป้าหมายและนโยบายองค์กร</span>
                    </label>
                  </div>

                  <div className="pl-1">
                    <label className="inline-flex items-start cursor-pointer">
                      {renderCheckbox(form.sourceTypes.satisfactionSurvey)}
                      <span>ผลสำรวจความต้องการ/ความพึงพอใจของผู้รับบริการ</span>
                    </label>
                  </div>

                  <div className="pr-1">
                    <label className="inline-flex items-start cursor-pointer">
                      {renderCheckbox(form.sourceTypes.riskReview)}
                      <span>ทบทวนระบบงาน/ความเสี่ยงในกระบวนการทำงาน</span>
                    </label>
                  </div>

                  <div className="pl-1">
                    <label className="inline-flex items-start cursor-pointer">
                      {renderCheckbox(form.sourceTypes.staffSuggestion)}
                      <span>ข้อเสนอแนะจากเจ้าหน้าที่</span>
                    </label>
                  </div>

                  <div className="pr-1">
                    <label className="inline-flex items-start cursor-pointer">
                      {renderCheckbox(form.sourceTypes.internalAudit)}
                      <span>
                        การประเมินคุณภาพภายในครั้งที่ :{' '}
                        {renderLine(form.sourceTypes.internalAuditNo, 'min-w-[50px]')}
                      </span>
                    </label>
                  </div>

                  <div className="pl-1">
                    <label className="inline-flex items-start cursor-pointer">
                      {renderCheckbox(form.sourceTypes.complaint)}
                      <span>
                        ข้อร้องเรียนของผู้รับบริการ เลขที่ :{' '}
                        {renderLine(form.sourceTypes.complaintNo, 'min-w-[50px]')}
                      </span>
                    </label>
                  </div>

                  <div className="pr-1">
                    <label className="inline-flex items-start cursor-pointer">
                      {renderCheckbox(form.sourceTypes.kpiUnmet)}
                      <span>เครื่องชี้วัดผลสัมฤทธิ์ของงาน (KPI) ตกเกณฑ์</span>
                    </label>
                  </div>

                  <div className="pl-1">
                    <label className="inline-flex items-start cursor-pointer">
                      {renderCheckbox(form.sourceTypes.other)}
                      <span>
                        อื่นๆ :{' '}
                        {renderLine(form.sourceTypes.otherDetail, 'min-w-[80px]')}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2 */}
          <div className="border-t border-black flex-1 flex flex-col">
            <div>
              {/* Section 2 Header Banner */}
              <div className="section-header-banner bg-[#e5e7eb] text-black font-bold text-xs px-2 py-1 border-b border-black" style={{ backgroundColor: '#e5e7eb', color: '#000000' }}>
                ส่วนที่ 2 รายละเอียดของโครงการ
              </div>

              {/* Section 2 Grid Content */}
              <div className="text-xs divide-y divide-black">
                {/* Problem Statement */}
                <div className="py-0.5 px-2">
                  <p className="font-bold text-black">
                    1. สถานการณ์ปัญหา/โอกาสพัฒนา :{' '}
                    <span className="font-normal text-black text-[11px]">
                      (ระบุปัญหา/โอกาสพัฒนาที่ต้องการแก้ไข มีผลกระทบต่องานหรือการดูแลผู้ป่วยอย่างไร มีสาเหตุสำคัญมาจากอะไร)
                    </span>
                  </p>
                  <div className="mt-0.5">{renderMultiLine(form.problemStatement, 2, 95)}</div>
                </div>

                {/* Goal */}
                <div className="py-0.5 px-2 flex items-start">
                  <span className="font-bold text-black whitespace-nowrap mr-2 pt-0.5">2. เป้าหมาย</span>
                  <div className="flex-1 min-w-0">
                    {renderLine(form.goal, 'w-full', 95)}
                  </div>
                </div>

                {/* KPI & Target */}
                <div className="py-0.5 px-2">
                  <p className="font-bold text-black">3. ตัวชี้วัด (KPI) และ target :</p>
                  <div className="mt-0.5">{renderMultiLine(form.kpiAndTarget, 2, 95)}</div>
                </div>

                {/* Action Plan Bullet */}
                <div className="py-0.5 px-2">
                  <p className="font-bold text-black">
                    4. ขั้นตอนการปรับปรุง/เปลี่ยนแปลงกระบวนการ :{' '}
                    <span className="font-normal text-black text-[11px]">
                      (ระบุการปรับปรุงแก้ไขเป็นขั้นตอนในลักษณะของ bullet ให้ชัดเจนเพื่อให้ผู้อ่านเข้าใจว่าได้ทำอะไรไปบ้าง)
                    </span>
                  </p>
                  <div className="mt-0.5">{renderMultiLine(form.improvementSteps, 2, 95)}</div>
                </div>

                {/* Duration */}
                <div className="py-0.5 px-2 flex items-start gap-4">
                  <span className="font-bold whitespace-nowrap pt-0.5">5. ระยะเวลาดำเนินการ :</span>
                  <div className="flex items-start gap-4 flex-1 flex-wrap">
                    <span className="pt-0.5">
                      วันที่เริ่มต้น : {renderLine(displayCE(form.startDate), 'min-w-[90px]')}
                    </span>
                    <span className="pt-0.5">
                      วันที่สิ้นสุดโครงการ : {renderLine(displayCE(form.endDate), 'min-w-[90px]')}
                    </span>
                  </div>
                </div>

                {/* Expected Benefits */}
                <div className="py-0.5 px-2">
                  <p className="font-bold">6. ประโยชน์ที่คาดว่าจะได้รับ</p>
                  <div className="mt-0.5">{renderMultiLine(form.expectedBenefits, 1, 95)}</div>
                </div>

                {/* Budget */}
                <div className="py-0.5 px-2 flex items-start">
                  <span className="font-bold whitespace-nowrap mr-2 pt-0.5">7. งบประมาณ (ถ้ามี) :</span>
                  <div className="flex-1 min-w-0">
                    {renderLine(form.budget, 'w-full', 95)}
                  </div>
                </div>
              </div>
            </div>

            {/* SIGNATURES PAGE 1 GRID */}
            <div className="grid grid-cols-2 text-xs bg-white border-t border-black shrink-0">
              {/* Proposer Box Left */}
              <div className="p-1.5 flex flex-col justify-between h-22 text-center items-center">
                <span className="font-bold">ผู้เสนอโครงการ</span>

                <div
                  onClick={() => onOpenSignatureModal?.('proposer')}
                  className="my-auto flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors py-0.5"
                  title="คลิกเพื่อเซ็นชื่อออนไลน์"
                >
                  {form.proposerSignature ? (
                    <img src={form.proposerSignature} alt="ลายเซ็นผู้เสนอโครงการ" className="h-7 object-contain" />
                  ) : (
                    <div className="text-black text-xs">
                      ลงชื่อ..........................................................
                    </div>
                  )}
                </div>

                <div className="text-center w-full">
                  <p className="font-medium text-center text-black leading-tight">
                    ( <span className="inline-block text-center text-black">{form.proposerName || '..........................................................'}</span> )
                  </p>
                  <p className="text-[10px] mt-0.5 text-center text-black">
                    วันที่ <span className="inline-block min-w-[70px] text-center text-black">{displayCE(form.proposerDate) || '......./......./.......'}</span>
                  </p>
                </div>
              </div>

              {/* Department Head Approval Box Right */}
              <div className="p-1.5 flex flex-col justify-between h-22 text-center items-center border-l border-black">
                <div>
                  <span className="font-bold block text-center text-black text-[11px]">
                    ความเห็นของหัวหน้างาน ( กรณีไม่ได้เป็นผู้เสนอโครงการ )
                  </span>
                  <div className="flex items-center justify-center gap-3 mt-0.5">
                    <label className="flex items-center cursor-pointer">
                      {renderCheckbox(form.deptHeadOpinion === 'approve')}
                      <span className="text-black text-[11px]">เห็นสมควรเปิดโครงการ</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      {renderCheckbox(form.deptHeadOpinion === 'disapprove')}
                      <span className="text-black text-[11px]">ไม่เห็นด้วยกับการเปิดโครงการ</span>
                    </label>
                  </div>
                </div>

                <div
                  onClick={() => onOpenSignatureModal?.('deptHead')}
                  className="my-auto flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors py-0.5"
                  title="คลิกเพื่อเซ็นชื่อหัวหน้างาน"
                >
                  {form.deptHeadSignature ? (
                    <img src={form.deptHeadSignature} alt="ลายเซ็นหัวหน้างาน" className="h-7 object-contain" />
                  ) : (
                    <div className="text-black text-xs">
                      ลงชื่อ..........................................................
                    </div>
                  )}
                </div>

                <div className="text-center flex flex-col items-center w-full">
                  <p className="font-medium text-center text-black leading-tight text-[11px]">
                    ( <span className="inline-block text-center text-black">{form.deptHeadName || 'ชาลี เมฆสุวรรณ'}</span> )
                  </p>
                  <p className="text-[9.5px] font-bold text-black text-center leading-tight">
                    {form.deptHeadPosition || 'ผู้จัดการแผนกวิศวกรรมการแพทย์'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page 1 Bottom Footer */}
        <div className="pt-1.5 text-[9px] text-black flex flex-col gap-0.5">
          <p className="italic text-black">Please mark "N/A" under the item that is not applicable.</p>
          <div className="flex justify-between items-center text-[8.5px] font-mono text-black">
            <span className="text-black">PTP-FM-QMS-001 ; Revision : 06 ; Issued Date : 16/04/2024 ; Page : 1/2</span>
          </div>
          <p className="text-[8px] text-black">
            เอกสารฉบับนี้เป็นเอกสารภายในของโรงพยาบาลพญาไท พหลโยธินเท่านั้น ห้ามทำสำเนาหรือพิมพ์เผยแพร่ก่อนได้รับอนุมัติ และห้ามบันทึก / แก้ไขข้อความใดๆ บนเอกสารควบคุม
          </p>
        </div>
      </div>

      {/* ================= PAGE 2 ================= */}
      <div className="a4-page bg-white w-[210mm] h-[297mm] min-h-[297mm] p-[5mm] shadow-2xl rounded-none border border-black print:shadow-none print:border-none print:m-0 print:p-[5mm] relative flex flex-col justify-between box-border overflow-hidden">
        {/* Document Header Page 2 */}
        <div className="flex items-center gap-2 mb-1">
          {/* Logo Left Page 2 */}
          <div className="w-[170px] shrink-0 flex items-center justify-start p-1 h-[50px]">
            <PhyathaiLogo className="h-[50px] w-auto max-w-full object-contain" />
          </div>

          {/* Title Box Right */}
          <div className="flex-1 border border-black p-1.5 flex flex-col items-center justify-center text-center h-[50px]">
            <h1 className="text-sm font-bold text-black leading-tight">
              แบบบันทึกกิจกรรมพัฒนาผลสัมฤทธิ์ของงาน
            </h1>
            <h2 className="text-xs font-bold text-black mt-0.5">
              (Continuous Performance Improvement Project : CPI)
            </h2>
          </div>
        </div>

        {/* Page 2 Outer Form Frame */}
        <div className="border border-black flex flex-col justify-start flex-1">
          {/* SECTION 3 */}
          <div>
            {/* Section 3 Header Banner */}
            <div className="section-header-banner bg-[#e5e7eb] text-black font-bold text-xs px-2 py-1 border-b border-black" style={{ backgroundColor: '#e5e7eb', color: '#000000' }}>
              ส่วนที่ 3 รายงานผลการพัฒนาผลสัมฤทธิ์ของงาน
            </div>

            {/* Section 3 Grid Content */}
            <div className="text-xs divide-y divide-black">
              {/* Row 1: Meta fields */}
              <div className="py-1 px-2 flex items-start justify-between gap-x-3 gap-y-1 flex-wrap">
                <div className="flex items-start flex-1 min-w-[240px] pt-0.5">
                  <span className="font-bold whitespace-nowrap mr-1.5 shrink-0">ฝ่าย/แผนก/หน่วยงาน :</span>
                  <div className="flex-1 min-w-0">
                    {renderLine(form.department, 'w-full')}
                  </div>
                </div>
                <div className="flex items-start shrink-0 pt-0.5">
                  <span className="font-bold whitespace-nowrap mr-1.5">วัน/เดือน/ปี ขอดำเนินการ :</span>
                  {renderLine(displayCE(form.docDate), 'min-w-[90px]')}
                </div>
                <div className="flex items-start shrink-0 pt-0.5">
                  <span className="font-bold whitespace-nowrap mr-1.5">เลขที่โครงการ :</span>
                  {renderLine(form.docNo, 'min-w-[90px]')}
                </div>
              </div>

              {/* Row 2: Project Title */}
              <div className="py-1 px-2 flex items-start min-w-0">
                <span className="font-bold whitespace-nowrap mr-2 shrink-0 pt-0.5">ชื่อโครงการ :</span>
                <div className="flex-1 min-w-0">
                  {renderLine(form.projectTitle, 'w-full')}
                </div>
              </div>

              {/* Item 1: Results and Changes */}
              <div className="py-1 px-2 space-y-1.5">
                <p className="font-bold text-black">
                  1. การวัดผลและผลการเปลี่ยนแปลง{' '}
                  <span className="font-normal text-black text-[11px]">
                    ( ผลการเปลี่ยนแปลงเป็นอย่างไร อาจแสดงในรูปแบบ กราฟ รูปภาพก่อน-หลัง (ถ้ามี) อธิบายให้ชัดเจน)
                  </span>
                </p>
                <div className="pl-2 space-y-1">
                  <div>
                    <span className="font-bold block text-black">1.1 ผลลัพธ์ KPI (โปรดแนบเอกสารซึ่งแสดงผลการพัฒนา)</span>
                    <div className="mt-1">{renderMultiLine(form.resultsKPI, 1)}</div>
                  </div>
                  <div>
                    <span className="font-bold block text-black">1.2 ผลลัพธ์อื่นๆ (ถ้ามี)</span>
                    <div className="mt-1">{renderMultiLine(form.resultsOther, 1)}</div>
                  </div>
                </div>
              </div>

              {/* Item 2: Benefits Received Grid */}
              <div className="py-1 px-2">
                <p className="font-bold mb-1 text-black">
                  2. ประโยชน์ที่ได้รับ <span className="font-normal text-black text-[11px]">(เลือกได้มากกว่า 1 ข้อ)</span>
                </p>
                <div className="grid grid-cols-3 pl-2 text-xs text-black gap-y-1">
                  {/* Column 1 */}
                  <div className="flex flex-col space-y-1 pr-1">
                    <label className="inline-flex items-start cursor-pointer">
                      {renderCheckbox(form.benefitsReceived.increaseSatisfaction)}
                      <span>เพิ่มความพึงพอใจของผู้รับบริการ</span>
                    </label>
                    <label className="inline-flex items-start cursor-pointer">
                      {renderCheckbox(form.benefitsReceived.staffSkill)}
                      <span>เพิ่มความรู้ ความชำนาญของเจ้าหน้าที่</span>
                    </label>
                    <label className="inline-flex items-start cursor-pointer">
                      {renderCheckbox(form.benefitsReceived.reduceComplications)}
                      <span>ลดภาวะแทรกซ้อนของผู้ป่วย</span>
                    </label>
                    <label className="inline-flex items-start cursor-pointer">
                      {renderCheckbox(form.benefitsReceived.increaseSafety)}
                      <span>เพิ่มความปลอดภัย</span>
                    </label>
                    <label className="inline-flex items-start cursor-pointer">
                      {renderCheckbox(form.benefitsReceived.revenueIncrease)}
                      <span>
                        เพิ่มรายได้ จำนวน{' '}
                        {renderLine(form.benefitsReceived.revenueIncreaseAmount, 'min-w-[45px]')}
                        {' '}บาท
                      </span>
                    </label>
                  </div>

                  {/* Column 2 */}
                  <div className="flex flex-col space-y-1 px-1">
                    <label className="inline-flex items-start cursor-pointer">
                      {renderCheckbox(form.benefitsReceived.internalCommEfficiency)}
                      <span>เพิ่มประสิทธิภาพการสื่อสารภายใน</span>
                    </label>
                    <label className="inline-flex items-start cursor-pointer">
                      {renderCheckbox(form.benefitsReceived.efficientResource)}
                      <span>มีการใช้ทรัพยากร อย่างคุ้มค่า</span>
                    </label>
                    <label className="inline-flex items-start cursor-pointer">
                      {renderCheckbox(form.benefitsReceived.treatmentOutcome)}
                      <span>ผลลัพธ์การรักษาดีขึ้น</span>
                    </label>
                    <label className="inline-flex items-start cursor-pointer">
                      {renderCheckbox(form.benefitsReceived.increaseValue)}
                      <span>เพิ่มคุณค่าการบริการ</span>
                    </label>
                    <label className="inline-flex items-start cursor-pointer">
                      {renderCheckbox(form.benefitsReceived.otherBenefit)}
                      <span>
                        อื่น{' '}
                        {renderLine(form.benefitsReceived.otherBenefitDetail, 'min-w-[50px]')}
                      </span>
                    </label>
                  </div>

                  {/* Column 3 */}
                  <div className="flex flex-col space-y-1 pl-1">
                    <label className="inline-flex items-start cursor-pointer">
                      {renderCheckbox(form.benefitsReceived.reduceErrors)}
                      <span>ลดความผิดพลาดในการให้บริการ</span>
                    </label>
                    <label className="inline-flex items-start cursor-pointer">
                      {renderCheckbox(form.benefitsReceived.staffSatisfaction)}
                      <span>เพิ่มความพึงพอใจของเจ้าหน้าที่</span>
                    </label>
                    <label className="inline-flex items-start cursor-pointer">
                      {renderCheckbox(form.benefitsReceived.increaseSpeed)}
                      <span>เพิ่มความรวดเร็วในการให้บริการ</span>
                    </label>
                    <label className="inline-flex items-start cursor-pointer">
                      {renderCheckbox(form.benefitsReceived.costReduction)}
                      <span>
                        ลดต้นทุน/ค่าใช้จ่าย จำนวน{' '}
                        {renderLine(form.benefitsReceived.costReductionAmount, 'min-w-[45px]')}
                        {' '}บาท
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Item 3: Obstacles and Solutions */}
              <div className="py-1 px-2 space-y-1">
                <p className="font-bold text-black">
                  3. ปัญหาอุปสรรคการดำเนินโครงการ และแนวทางการแก้ไข{' '}
                  <span className="font-normal text-black text-[11px]">(สามารถส่งเป็นเอกสารแนบได้)</span>
                </p>
                <div className="pl-2 space-y-1 text-xs text-black">
                  <div className="flex items-start min-w-0">
                    <span className="font-semibold whitespace-nowrap mr-2 shrink-0 text-black pt-0.5">3.1 ขั้นตอนในการเก็บรวบรวมข้อมูล</span>
                    <div className="flex-1 min-w-0">
                      {renderLine(form.obstacles.dataCollection, 'w-full')}
                    </div>
                  </div>
                  <div className="flex items-start min-w-0">
                    <span className="font-semibold whitespace-nowrap mr-2 shrink-0 text-black pt-0.5">3.2 ขั้นตอนในการเก็บตัวชี้วัด</span>
                    <div className="flex-1 min-w-0">
                      {renderLine(form.obstacles.kpiCollection, 'w-full')}
                    </div>
                  </div>
                  <div className="flex items-start min-w-0">
                    <span className="font-semibold whitespace-nowrap mr-2 shrink-0 text-black pt-0.5">3.3 ขั้นตอนในการหาแนวทางแก้ไข</span>
                    <div className="flex-1 min-w-0">
                      {renderLine(form.obstacles.findingSolutions, 'w-full')}
                    </div>
                  </div>
                  <div className="flex items-start min-w-0">
                    <span className="font-semibold whitespace-nowrap mr-2 shrink-0 text-black pt-0.5">3.4 อื่น ๆ</span>
                    <div className="flex-1 min-w-0">
                      {renderLine(form.obstacles.other, 'w-full')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Item 4: Recommendations & Expansion */}
              <div className="py-1 px-2">
                <p className="font-bold text-black">4. ข้อเสนอแนะ / การขยายผลโครงการ</p>
                <div className="mt-1">{renderMultiLine(form.recommendationsExpansion, 1)}</div>
              </div>
            </div>

            {/* Proposer Signature Line Centered */}
            <div className="py-2.5 px-2 flex flex-col items-center justify-center border-t border-black text-xs text-black w-full">
              <div className="flex items-start justify-center gap-2 w-full">
                {/* Left Label: ลงชื่อ */}
                <span className="font-bold whitespace-nowrap text-black pt-0.5 shrink-0">
                  ลงชื่อ
                </span>

                {/* Center Column: Signature Line, Name, Date */}
                <div className="flex flex-col items-center w-[230px] shrink-0">
                  {/* Signature Dotted Line / Image */}
                  <div
                    onClick={() => onOpenSignatureModal?.('proposerPage2')}
                    className="w-full border-b border-dotted border-black min-h-[26px] flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors py-0.5"
                    title="คลิกเพื่อเซ็นชื่อผู้เสนอโครงการ"
                  >
                    {form.proposerSignature || form.projectOwnerSignaturePage2 ? (
                      <img src={form.proposerSignature || form.projectOwnerSignaturePage2} alt="ลายเซ็น" className="h-8 object-contain" />
                    ) : null}
                  </div>

                  {/* Name line centered directly under signature line */}
                  <div className="text-xs font-medium mt-1 text-center whitespace-nowrap text-black w-full">
                    ( <span className="inline-block text-center text-black">{form.proposerName || form.projectOwnerNamePage2 || '..........................................................'}</span> )
                  </div>

                  {/* Date line centered directly under signature line */}
                  <div className="text-[11px] text-black mt-0.5 text-center whitespace-nowrap w-full">
                    วันที่ <span className="inline-block min-w-[80px] text-center text-black">{displayCE(form.projectOwnerDatePage2 || form.proposerDate) || '......./......./.......'}</span>
                  </div>
                </div>

                {/* Right Label: ผู้เสนอโครงการ / หัวหน้าโครงการ */}
                <span className="font-bold whitespace-nowrap text-black pt-0.5 shrink-0">
                  ผู้เสนอโครงการ / หัวหน้าโครงการ
                </span>
              </div>
            </div>

            {/* Item 5: Department Manager Approval Box */}
            <div className="border-t border-black text-xs divide-y divide-black text-black">
              <div className="p-2">
                <p className="font-bold text-black mb-1">
                  5. ความเห็นของหัวหน้าหน่วยงาน / ผู้จัดการแผนก / ผู้จัดการส่วน / ผู้อำนวยการฝ่าย
                </p>
                <div className="pl-2 space-y-1.5 text-black">
                  <div className="flex items-center flex-wrap gap-x-4 gap-y-1">
                    <span className="font-bold text-black shrink-0">ปิดโครงการได้ :</span>
                    <label className="inline-flex items-center cursor-pointer">
                      {renderCheckbox(form.closureOpinion.closeApproved)}
                      <span className="text-black">ผลลัพธ์ (KPI) ได้ตามเป้าหมาย</span>
                    </label>
                    <label className="inline-flex items-center cursor-pointer">
                      {renderCheckbox(form.closureOpinion.reliableData)}
                      <span className="text-black">ข้อมูลเพียงพอและเชื่อถือได้</span>
                    </label>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <label className="inline-flex items-center whitespace-nowrap cursor-pointer shrink-0">
                      {renderCheckbox(form.closureOpinion.studyMore)}
                      <span className="text-black">ให้ศึกษาข้อมูลเพิ่มเติมในประเด็น</span>
                    </label>
                    {renderLine(form.closureOpinion.studyMoreDetail, 'flex-1 min-w-[180px]')}
                  </div>

                  <div>
                    <label className="inline-flex items-start cursor-pointer">
                      {renderCheckbox(form.closureOpinion.expandProcess)}
                      <span className="text-black">ให้ดำเนินโครงการขยายผลเพิ่มเติมในกระบวนการอื่นๆ ที่มีลักษณะหรือมีปัญหาคล้ายคลึงกัน</span>
                    </label>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <label className="inline-flex items-center whitespace-nowrap cursor-pointer shrink-0">
                      {renderCheckbox(form.closureOpinion.other)}
                      <span className="text-black">อื่นๆ</span>
                    </label>
                    {renderLine(form.closureOpinion.otherDetail, 'flex-1 min-w-[180px]')}
                  </div>
                </div>
              </div>

              {/* Approver Signature Line Centered */}
              <div className="py-2.5 px-2 flex flex-col items-center justify-center text-xs text-black w-full">
                <div className="flex items-start justify-center gap-2 w-full">
                  {/* Left Label: ลงชื่อ */}
                  <span className="font-bold whitespace-nowrap text-black pt-0.5 shrink-0">
                    ลงชื่อ
                  </span>

                  {/* Center Column: Signature Line, Name, Date */}
                  <div className="flex flex-col items-center w-[230px] shrink-0">
                    {/* Signature line / image */}
                    <div
                      onClick={() => onOpenSignatureModal?.('approver')}
                      className="w-full border-b border-dotted border-black min-h-[26px] flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors py-0.5"
                      title="คลิกเพื่อเซ็นชื่อผู้อนุมัติปิดโครงการ"
                    >
                      {form.approverSignature ? (
                        <img src={form.approverSignature} alt="ลายเซ็น" className="h-8 object-contain" />
                      ) : null}
                    </div>

                    {/* Name line centered directly under signature line */}
                    <div className="text-xs font-medium mt-1 text-center whitespace-nowrap text-black w-full">
                      ( <span className="inline-block text-center text-black">{form.approverName || 'ชาลี เมฆสุวรรณ'}</span> )
                    </div>

                    {/* Date line centered directly under signature line */}
                    <div className="text-[11px] text-black mt-0.5 text-center whitespace-nowrap w-full">
                      วันที่ <span className="inline-block min-w-[80px] text-center text-black">{displayCE(form.approverDate) || '......./......./.......'}</span>
                    </div>
                  </div>

                  {/* Right Label: ผู้อนุมัติปิดโครงการ */}
                  <span className="font-bold whitespace-nowrap text-black pt-0.5 shrink-0">
                    ผู้อนุมัติปิดโครงการ
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page 2 Bottom Footer */}
        <div className="pt-1.5 text-[9px] text-black flex flex-col gap-0.5">
          <p className="italic text-black">Please mark "N/A" under the item that is not applicable.</p>
          <div className="flex justify-between items-center text-[8.5px] font-mono text-black">
            <span className="text-black">PTP-FM-QMS-001 ; Revision : 06 ; Issued Date : 16/04/2024 ; Page : 2/2</span>
          </div>
          <p className="text-[8px] text-black">
            เอกสารฉบับนี้เป็นเอกสารภายในของโรงพยาบาลพญาไท พหลโยธินเท่านั้น ห้ามทำสำเนาหรือพิมพ์เผยแพร่ก่อนได้รับอนุมัติ และห้ามบันทึก / แก้ไขข้อความใดๆ บนเอกสารควบคุม
          </p>
        </div>
      </div>
    </div>
  );
};
