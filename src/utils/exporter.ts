import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { CPIFormData } from '../types';
import { formatToCE } from './dateUtils';

export const exportToExcel = (form: CPIFormData) => {
  const wb = XLSX.utils.book_new();

  // Prepare Page 1 data
  const page1Data = [
    ['โรงพยาบาลพญาไท - แบบบันทึกกิจกรรมพัฒนาผลสัมฤทธิ์ของงาน (CPI)'],
    ['รหัสเอกสาร: PTP-FM-QMS-001 | Revision: 06 | Date: 16/04/2024'],
    [''],
    ['--- ส่วนที่ 1 รายละเอียดการขอดำเนินการ ---'],
    ['เลขที่โครงการ', form.docNo],
    ['วัน/เดือน/ปี ขอดำเนินการ', formatToCE(form.docDate)],
    ['ฝ่าย/แผนก/หน่วยงาน', form.department],
    ['ชื่อโครงการ', form.projectTitle],
    ['ประเภทโครงการ', form.projectType.join(', ')],
    ['ประเภทการพัฒนา', form.developmentType.join(', ')],
    [''],
    ['ที่มาโครงการ:'],
    ['1. วิสัยทัศน์ เป้าหมายและนโยบายองค์กร', form.sourceTypes.visionPolicy ? 'ใช่ [X]' : 'ไม่ใช่ [ ]'],
    ['2. ผลสำรวจความต้องการ/ความพึงพอใจ', form.sourceTypes.satisfactionSurvey ? 'ใช่ [X]' : 'ไม่ใช่ [ ]'],
    ['3. ทบทวนระบบงาน/ความเสี่ยง', form.sourceTypes.riskReview ? 'ใช่ [X]' : 'ไม่ใช่ [ ]'],
    ['4. ข้อเสนอแนะจากเจ้าหน้าที่', form.sourceTypes.staffSuggestion ? 'ใช่ [X]' : 'ไม่ใช่ [ ]'],
    ['5. การประเมินคุณภาพภายใน', form.sourceTypes.internalAudit ? `ใช่ [X] ครั้งที่ ${form.sourceTypes.internalAuditNo}` : 'ไม่ใช่ [ ]'],
    ['6. ข้อร้องเรียนของผู้รับบริการ', form.sourceTypes.complaint ? `ใช่ [X] เลขที่ ${form.sourceTypes.complaintNo}` : 'ไม่ใช่ [ ]'],
    ['7. KPI ตกเกณฑ์', form.sourceTypes.kpiUnmet ? 'ใช่ [X]' : 'ไม่ใช่ [ ]'],
    ['8. อื่นๆ', form.sourceTypes.other ? `ใช่ [X] ${form.sourceTypes.otherDetail}` : 'ไม่ใช่ [ ]'],
    [''],
    ['--- ส่วนที่ 2 รายละเอียดโครงการ ---'],
    ['1. สถานการณ์ปัญหา/โอกาสพัฒนา', form.problemStatement],
    ['2. เป้าหมาย', form.goal],
    ['3. ตัวชี้วัด (KPI) และ Target', form.kpiAndTarget],
    ['4. ขั้นตอนการปรับปรุงกระบวนการ', form.improvementSteps],
    ['5. ระยะเวลาดำเนินการ', `เริ่มต้น: ${formatToCE(form.startDate)} ถึง สิ้นสุด: ${formatToCE(form.endDate)}`],
    ['6. ประโยชน์ที่คาดว่าจะได้รับ', form.expectedBenefits],
    ['7. งบประมาณ', form.budget],
    [''],
    ['ผู้เสนอโครงการ', form.proposerName, 'วันที่:', formatToCE(form.proposerDate)],
    ['ความเห็นหัวหน้างาน', form.deptHeadOpinion === 'approve' ? 'เห็นสมควรเปิดโครงการ' : form.deptHeadOpinion === 'disapprove' ? 'ไม่เห็นด้วยกับการเปิดโครงการ' : '-'],
    ['หัวหน้างาน/ผู้จัดการแผนก', form.deptHeadName, 'ตำแหน่ง:', form.deptHeadPosition, 'วันที่:', formatToCE(form.deptHeadDate)],
  ];

  // Prepare Page 2 data
  const page2Data = [
    ['--- ส่วนที่ 3 รายงานผลการพัฒนาผลสัมฤทธิ์ของงาน (หน้า 2) ---'],
    ['เลขที่โครงการ', form.docNo],
    ['ชื่อโครงการ', form.projectTitle],
    ['1.1 ผลลัพธ์ KPI', form.resultsKPI],
    ['1.2 ผลลัพธ์อื่นๆ', form.resultsOther],
    [''],
    ['2. ประโยชน์ที่ได้รับ:'],
    ['เพิ่มความพึงพอใจของผู้รับบริการ', form.benefitsReceived.increaseSatisfaction ? '[X]' : '[ ]'],
    ['เพิ่มประสิทธิภาพการสื่อสารภายใน', form.benefitsReceived.internalCommEfficiency ? '[X]' : '[ ]'],
    ['ลดความผิดพลาดในการให้บริการ', form.benefitsReceived.reduceErrors ? '[X]' : '[ ]'],
    ['เพิ่มความรู้ ความชำนาญของเจ้าหน้าที่', form.benefitsReceived.staffSkill ? '[X]' : '[ ]'],
    ['มีการใช้ทรัพยากร อย่างคุ้มค่า', form.benefitsReceived.efficientResource ? '[X]' : '[ ]'],
    ['เพิ่มความพึงพอใจของเจ้าหน้าที่', form.benefitsReceived.staffSatisfaction ? '[X]' : '[ ]'],
    ['ลดภาวะแทรกซ้อนของผู้ป่วย', form.benefitsReceived.reduceComplications ? '[X]' : '[ ]'],
    ['ผลลัพธ์การรักษาดีขึ้น', form.benefitsReceived.treatmentOutcome ? '[X]' : '[ ]'],
    ['เพิ่มความรวดเร็วในการให้บริการ', form.benefitsReceived.increaseSpeed ? '[X]' : '[ ]'],
    ['เพิ่มความปลอดภัย', form.benefitsReceived.increaseSafety ? '[X]' : '[ ]'],
    ['เพิ่มคุณค่าการบริการ', form.benefitsReceived.increaseValue ? '[X]' : '[ ]'],
    ['ลดต้นทุน/ค่าใช้จ่าย', form.benefitsReceived.costReduction ? `[X] จำนวน ${form.benefitsReceived.costReductionAmount} บาท` : '[ ]'],
    ['เพิ่มรายได้', form.benefitsReceived.revenueIncrease ? `[X] จำนวน ${form.benefitsReceived.revenueIncreaseAmount} บาท` : '[ ]'],
    [''],
    ['3. ปัญหาอุปสรรคการดำเนินโครงการ:'],
    ['3.1 การเก็บรวบรวมข้อมูล', form.obstacles.dataCollection],
    ['3.2 การเก็บตัวชี้วัด', form.obstacles.kpiCollection],
    ['3.3 การหาแนวทางแก้ไข', form.obstacles.findingSolutions],
    ['3.4 อื่นๆ', form.obstacles.other],
    [''],
    ['4. ข้อเสนอแนะ / การขยายผลโครงการ', form.recommendationsExpansion],
    ['ผู้เสนอโครงการ (หน้า 2)', form.projectOwnerNamePage2, 'วันที่:', form.projectOwnerDatePage2],
    [''],
    ['5. ความเห็นการอนุมัติปิดโครงการ:'],
    ['ปิดโครงการได้ : ผลลัพธ์ (KPI) ได้ตามเป้าหมาย', form.closureOpinion.closeApproved ? '[X]' : '[ ]'],
    ['ข้อมูลเพียงพอและเชื่อถือได้', form.closureOpinion.reliableData ? '[X]' : '[ ]'],
    ['ศึกษาข้อมูลเพิ่มเติมในประเด็น', form.closureOpinion.studyMore ? `[X] ${form.closureOpinion.studyMoreDetail}` : '[ ]'],
    ['ขยายผลในกระบวนการอื่น', form.closureOpinion.expandProcess ? '[X]' : '[ ]'],
    ['ผู้อนุมัติปิดโครงการ', form.approverName, 'วันที่:', form.approverDate],
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(page1Data);
  const ws2 = XLSX.utils.aoa_to_sheet(page2Data);

  // Auto-fit column widths
  ws1['!cols'] = [{ wch: 35 }, { wch: 50 }, { wch: 15 }, { wch: 25 }];
  ws2['!cols'] = [{ wch: 35 }, { wch: 50 }, { wch: 15 }, { wch: 25 }];

  XLSX.utils.book_append_sheet(wb, ws1, 'CPI_ส่วนที่1และ2');
  XLSX.utils.book_append_sheet(wb, ws2, 'CPI_ส่วนที่3');

  const fileName = `CPI_Phyathai_${form.docNo || 'Draft'}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

export type PageExportOption = 'all' | 'page1' | 'page2';

// Helper canvas context for converting modern CSS color functions (e.g. oklch) to RGB hex
const createColorCanvas = () => {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 1;
  c.height = 1;
  return c.getContext('2d');
};
const colorCtx = createColorCanvas();

let tempConverterEl: HTMLDivElement | null = null;

const getTempConverterEl = () => {
  if (typeof document === 'undefined') return null;
  if (!tempConverterEl || !document.body.contains(tempConverterEl)) {
    tempConverterEl = document.createElement('div');
    tempConverterEl.style.display = 'none';
    document.body.appendChild(tempConverterEl);
  }
  return tempConverterEl;
};

export const convertOklchColor = (cssText: string, isBackground: boolean = false): string => {
  if (!cssText || !cssText.includes('oklch')) return cssText;
  return cssText.replace(/oklch\([^)]+\)/gi, (match) => {
    // 1. Try DOM element computed style
    const el = getTempConverterEl();
    if (el) {
      try {
        el.style.color = '';
        el.style.color = match;
        const computed = window.getComputedStyle(el).color;
        if (computed && computed !== '' && !computed.includes('oklch')) {
          return computed;
        }
      } catch {
        // ignore
      }
    }

    // 2. Try Canvas
    if (colorCtx) {
      try {
        colorCtx.fillStyle = isBackground ? '#ffffff' : '#000000';
        colorCtx.fillStyle = match;
        const computed = colorCtx.fillStyle;
        if (computed && computed !== '#ffffff' && computed !== '#000000' && !computed.includes('oklch')) {
          return computed;
        }
      } catch {
        // ignore
      }
    }

    // 3. Lightness fallback from oklch(L C H)
    const oklchMatch = match.match(/oklch\(\s*([\d.]+)/i);
    if (oklchMatch && oklchMatch[1]) {
      const lightness = parseFloat(oklchMatch[1]);
      if (lightness > 0.7) {
        return isBackground ? 'rgb(229, 231, 235)' : 'rgb(255, 255, 255)';
      }
    }

    return isBackground ? 'rgb(229, 231, 235)' : 'rgb(0, 0, 0)';
  });
};

const sanitizeDocumentColors = (clonedDoc: Document) => {
  // Inject Sarabun Google Font link & styles into cloned document head
  const head = clonedDoc.head;
  if (head) {
    const fontStyle = clonedDoc.createElement('style');
    fontStyle.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&display=swap');
      *, body, div, span, p, h1, h2, h3, label {
        font-family: 'Sarabun', 'TH_Sarabun_New', sans-serif !important;
        -webkit-font-smoothing: antialiased;
      }
    `;
    head.appendChild(fontStyle);
  }

  // 1. Sanitize all <style> tags in cloned document
  const styleTags = clonedDoc.querySelectorAll('style');
  styleTags.forEach((styleTag) => {
    if (styleTag.textContent && styleTag.textContent.includes('oklch')) {
      styleTag.textContent = convertOklchColor(styleTag.textContent);
    }
  });

  // 2. Sanitize inline style attributes if present
  const elementsWithStyle = clonedDoc.querySelectorAll('[style*="oklch"]');
  elementsWithStyle.forEach((el) => {
    const htmlEl = el as HTMLElement;
    const inlineStyle = htmlEl.getAttribute('style');
    if (inlineStyle) {
      htmlEl.setAttribute('style', convertOklchColor(inlineStyle));
    }
  });
};

export const printDocument = async (
  form?: CPIFormData,
  pageOption: PageExportOption = 'all',
  onStatusChange?: (msg: string | null) => void
) => {
  const isIframe = typeof window !== 'undefined' && window.self !== window.top;

  if (isIframe) {
    if (onStatusChange) {
      onStatusChange('พรีวิวอยู่ใน iFrame ระบบกำลังสร้างและดาวน์โหลดไฟล์ PDF ตามหน้าที่เลือก...');
    }
    if (form) {
      await exportToPDF(form, pageOption, onStatusChange);
    } else {
      alert('ไม่สามารถเรียกคำสั่งพิมพ์ใน iFrame ได้ กรุณาเปิดแอปในแท็บใหม่ หรือกดปุ่ม "ดาวน์โหลด PDF"');
    }
    return;
  }

  // Handle browser window.print with selected page hiding
  if (typeof document !== 'undefined') {
    const pages = document.querySelectorAll('.a4-page');
    pages.forEach((p, idx) => {
      const el = p as HTMLElement;
      if (pageOption === 'page1' && idx !== 0) {
        el.classList.add('print-hidden-page');
      } else if (pageOption === 'page2' && idx !== 1) {
        el.classList.add('print-hidden-page');
      }
    });

    try {
      window.print();
    } catch (err) {
      console.warn('window.print() failed:', err);
      if (form) {
        if (onStatusChange) onStatusChange('กำลังสร้างไฟล์ PDF ให้แทน...');
        await exportToPDF(form, pageOption, onStatusChange);
      }
    } finally {
      // Restore page visibility
      pages.forEach((p) => {
        (p as HTMLElement).classList.remove('print-hidden-page');
      });
    }
  }
};

export const exportToPDF = async (
  form: CPIFormData,
  pageOption: PageExportOption = 'all',
  onStatusChange?: (msg: string | null) => void
) => {
  if (onStatusChange) onStatusChange('กำลังเตรียมสร้างเอกสาร PDF...');

  // Ensure Google Fonts / Sarabun font is fully ready before rendering canvas
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // ignore font ready wait error
    }
  }

  const pageElements = document.querySelectorAll('.a4-page');

  if (!pageElements || pageElements.length === 0) {
    if (onStatusChange) onStatusChange(null);
    alert('ไม่พบหน้าพรีวิวเอกสาร A4 กรุณาสลับเป็นหน้าพรีวิวหรือรอให้หน้าพรีวิวแสดงผล');
    return;
  }

  // Determine target page indices
  let targetIndices: number[] = [];
  if (pageOption === 'page1') {
    targetIndices = [0];
  } else if (pageOption === 'page2') {
    targetIndices = pageElements.length > 1 ? [1] : [0];
  } else {
    targetIndices = Array.from({ length: pageElements.length }, (_, i) => i);
  }

  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pdfWidth = 210; // A4 width in mm
    const pdfHeight = 297; // A4 height in mm

    for (let i = 0; i < targetIndices.length; i++) {
      const pageIndex = targetIndices[i];
      const pageEl = pageElements[pageIndex] as HTMLElement;

      if (!pageEl) continue;

      if (onStatusChange) {
        onStatusChange(`กำลังสร้าง PDF หน้า ${pageIndex + 1} (${i + 1}/${targetIndices.length})...`);
      }

      // Create an unscaled offscreen container at exact A4 1:1 scale (210mm x 297mm)
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.top = '-9999px';
      container.style.left = '-9999px';
      container.style.width = '210mm';
      container.style.height = '297mm';
      container.style.zIndex = '99999';
      container.style.opacity = '1';
      container.style.pointerEvents = 'none';
      container.style.backgroundColor = '#ffffff';
      container.style.overflow = 'hidden';

      const clone = pageEl.cloneNode(true) as HTMLElement;
      clone.style.transform = 'none';
      clone.style.margin = '0';
      clone.style.boxSizing = 'border-box';
      clone.style.width = '210mm';
      clone.style.height = '297mm';
      clone.style.minHeight = '297mm';
      clone.style.maxHeight = '297mm';
      clone.style.overflow = 'hidden';

      container.appendChild(clone);
      document.body.appendChild(container);

      try {
        const canvas = await html2canvas(clone, {
          scale: 3, // High DPI rendering
          useCORS: true,
          allowTaint: false,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 794,
          windowHeight: 1123,
          onclone: (clonedDoc) => {
            sanitizeDocumentColors(clonedDoc);
          },
        });

        const imgData = canvas.toDataURL('image/png', 1.0);

        if (i > 0) {
          pdf.addPage('a4', 'portrait');
        }

        // Full A4 page coverage 210mm x 297mm
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      } finally {
        if (document.body.contains(container)) {
          document.body.removeChild(container);
        }
      }
    }

    const pageSuffix = pageOption === 'page1' ? '_Page1' : pageOption === 'page2' ? '_Page2' : '';
    const filename = `CPI_Phyathai_${form.docNo || 'Document'}${pageSuffix}.pdf`;
    pdf.save(filename);

    if (onStatusChange) onStatusChange('ส่งออก PDF A4 แนวตั้งสำเร็จ');
  } catch (err) {
    console.error('Failed to export PDF:', err);
    alert('เกิดข้อผิดพลาดในการส่งออก PDF: ' + (err instanceof Error ? err.message : String(err)));
    if (onStatusChange) onStatusChange('การส่งออก PDF ล้มเหลว');
  }
};

export const generatePDFBase64 = async (
  form: CPIFormData,
  pageOption: PageExportOption = 'all'
): Promise<string | null> => {
  if (typeof document === 'undefined') return null;

  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // ignore font ready error
    }
  }

  const pageElements = document.querySelectorAll('.a4-page');
  if (!pageElements || pageElements.length === 0) {
    return null;
  }

  // Determine target page indices
  let targetIndices: number[] = [];
  if (pageOption === 'page1') {
    targetIndices = [0];
  } else if (pageOption === 'page2') {
    targetIndices = pageElements.length > 1 ? [1] : [0];
  } else {
    targetIndices = Array.from({ length: pageElements.length }, (_, i) => i);
  }

  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pdfWidth = 210;
    const pdfHeight = 297;

    for (let i = 0; i < targetIndices.length; i++) {
      const pageIndex = targetIndices[i];
      const pageEl = pageElements[pageIndex] as HTMLElement;
      if (!pageEl) continue;

      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.top = '-9999px';
      container.style.left = '-9999px';
      container.style.width = '210mm';
      container.style.height = '297mm';
      container.style.zIndex = '99999';
      container.style.opacity = '1';
      container.style.pointerEvents = 'none';
      container.style.backgroundColor = '#ffffff';
      container.style.overflow = 'hidden';

      const clone = pageEl.cloneNode(true) as HTMLElement;
      clone.style.transform = 'none';
      clone.style.margin = '0';
      clone.style.boxSizing = 'border-box';
      clone.style.width = '210mm';
      clone.style.height = '297mm';
      clone.style.minHeight = '297mm';
      clone.style.maxHeight = '297mm';
      clone.style.overflow = 'hidden';

      container.appendChild(clone);
      document.body.appendChild(container);

      try {
        const canvas = await html2canvas(clone, {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 794,
          windowHeight: 1123,
          onclone: (clonedDoc) => {
            sanitizeDocumentColors(clonedDoc);
          },
        });

        const imgData = canvas.toDataURL('image/png', 0.95);
        if (i > 0) {
          pdf.addPage('a4', 'portrait');
        }
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      } finally {
        if (document.body.contains(container)) {
          document.body.removeChild(container);
        }
      }
    }

    const dataUri = pdf.output('datauristring');
    const base64 = dataUri.split(',')[1] || null;
    return base64;
  } catch (err) {
    console.error('Failed to generate PDF Base64:', err);
    return null;
  }
};


