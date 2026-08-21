import React, { useState, useEffect } from 'react';
import { Mail, X, Send, Loader2, CheckCircle2, ExternalLink, Inbox, Users, Link2, FileCheck2, Copy } from 'lucide-react';
import { CPIFormData } from '../types';
import { APPROVER_PRESETS, ApproverPreset } from '../data/personnel';
import { PageExportOption, generatePDFBase64 } from '../utils/exporter';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: CPIFormData;
}

export const EmailModal: React.FC<EmailModalProps> = ({
  isOpen,
  onClose,
  form,
}) => {
  const [toEmail, setToEmail] = useState('');
  const [selectedApproverId, setSelectedApproverId] = useState<string>('');
  const [subject, setSubject] = useState(`[นำส่งเอกสาร CPI] ${form.docNo || 'โครงการพัฒนาคุณภาพ'} - ${form.projectTitle || 'โรงพยาบาลพญาไท'}`);
  const [attachPdf, setAttachPdf] = useState(true);
  const [pageOption, setPageOption] = useState<PageExportOption>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Build 1-click Approval Link
  const approvalUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?docNo=${encodeURIComponent(form.docNo || '')}&action=approve`
    : '';

  const buildDefaultMessage = (approverName?: string, position?: string) => {
    const greeting = approverName
      ? `เรียน ${approverName} (${position || 'ผู้มีสิทธิ์อนุมัติโครงการ'})`
      : 'เรียน คณะกรรมการคุณภาพ และผู้มีสิทธิ์อนุมัติโครงการ';

    return `${greeting}\n\nขอนำส่งแบบบันทึกกิจกรรมพัฒนาผลสัมฤทธิ์ของงาน (CPI)\n• เลขที่เอกสาร: ${form.docNo || '-'}\n• ชื่อโครงการ: ${form.projectTitle || '-'}\n• หน่วยงาน: ${form.department || '-'}\n• ผู้เสนอโครงการ: ${form.proposerName || '-'}\n\n✍️ ท่านสามารถตรวจสอบเอกสารและกดลงนามอนุมัติออนไลน์ได้ทันทีผ่านลิงก์นี้ (1-Click Approval):\n${approvalUrl}\n\nเพื่อโปรดพิจารณาอนุมัติ/ติดตามผลการดำเนินงานตามแบบฟอร์ม PTP-FM-QMS-001\n\nขอแสดงความนับถือ\n${form.proposerName || 'ผู้เสนอโครงการ'}`;
  };

  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMessage(buildDefaultMessage());
      setSubject(`[นำส่งเอกสาร CPI] ${form.docNo || 'โครงการพัฒนาคุณภาพ'} - ${form.projectTitle || 'โรงพยาบาลพญาไท'}`);
      setResultMessage(null);
    }
  }, [isOpen, form.docNo, form.projectTitle, form.department, form.proposerName]);

  if (!isOpen) return null;

  const handleSelectApprover = (preset: ApproverPreset) => {
    setSelectedApproverId(preset.id);
    setToEmail(preset.email);
    setMessage(buildDefaultMessage(preset.name, preset.position));
  };

  const handleCopyApprovalLink = () => {
    navigator.clipboard.writeText(approvalUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleOpenGmail = () => {
    if (!toEmail.trim()) {
      setResultMessage({ type: 'error', text: 'กรุณากรอกหรือเลือกอีเมลผู้รับ (To:)' });
      return;
    }
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=${encodeURIComponent(toEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    window.open(gmailUrl, '_blank');
    setResultMessage({
      type: 'success',
      text: `เปิดหน้าเขียนอีเมลใน Gmail เรียบร้อยแล้ว (ลิงก์อนุมัติ 1-Click ถูกรวมในเนื้อความแล้ว)`,
    });
  };

  const handleOpenMailApp = () => {
    if (!toEmail.trim()) {
      setResultMessage({ type: 'error', text: 'กรุณากรอกหรือเลือกอีเมลผู้รับ (To:)' });
      return;
    }
    const mailtoUrl = `mailto:${encodeURIComponent(toEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    window.location.href = mailtoUrl;
    setResultMessage({
      type: 'success',
      text: `เปิดโปรแกรมอีเมล (Outlook / Mail App) เรียบร้อยแล้ว`,
    });
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toEmail.trim()) {
      setResultMessage({ type: 'error', text: 'กรุณากรอกหรือเลือกอีเมลผู้รับ (To:)' });
      return;
    }

    setIsLoading(true);
    setResultMessage(null);

    try {
      let pdfBase64: string | null = null;

      if (attachPdf) {
        setResultMessage({ type: 'success', text: 'กำลังแปลงเอกสาร CPI เป็นไฟล์ PDF ตามหน้าที่เลือกสำหรับแนบส่ง...' });
        pdfBase64 = await generatePDFBase64(form, pageOption);
      }

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail,
          subject,
          message,
          docNo: form.docNo,
          projectTitle: form.projectTitle,
          department: form.department,
          proposerName: form.proposerName,
          pdfBase64,
          approvalUrl,
        }),
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'ไม่สามารถส่งอีเมลได้');
      }

      setResultMessage({
        type: 'success',
        text: resData.message || `ส่งอีเมลนำส่งเอกสาร CPI (${form.docNo}) ไปยัง ${toEmail} เรียบร้อยแล้ว`,
      });

      setIsLoading(false);
    } catch (err: any) {
      console.error('Send email error:', err);
      setResultMessage({ type: 'error', text: err.message || 'เกิดข้อผิดพลาดในการส่งอีเมล' });
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-500/20 text-teal-400 rounded-xl">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">นำส่งเอกสาร CPI และขออนุมัติออนไลน์</h3>
              <p className="text-xs text-slate-300">
                เลือกผู้อนุมัติแบบด่วน พร้อมแนบไฟล์ PDF และลิงก์เซ็นอนุมัติ 1-Click
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Container */}
        <form onSubmit={handleSendEmail} className="p-6 space-y-4 overflow-y-auto flex-1">
          {resultMessage && (
            <div
              className={`p-3.5 rounded-xl text-xs font-medium flex items-start gap-2.5 ${
                resultMessage.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {resultMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
              <div>{resultMessage.text}</div>
            </div>
          )}

          {/* Quick Approver Select Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-teal-600" />
                เลือกผู้อนุมัติแบบด่วน (Quick Approver Select):
              </span>
              <span className="text-[11px] text-slate-500 font-normal">คลิกเพื่อเลือกทันที</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {APPROVER_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectApprover(preset)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all text-left flex items-center gap-1.5 ${
                    selectedApproverId === preset.id || toEmail === preset.email
                      ? 'bg-teal-600 border-teal-600 text-white shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-teal-400 hover:bg-teal-50/50'
                  }`}
                >
                  <span className="font-semibold">{preset.badge}</span>
                  <span className="opacity-75 text-[11px]">({preset.name.split(' ')[0]})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Recipient Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              ผู้รับ (To Email) <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              value={toEmail}
              onChange={(e) => {
                setToEmail(e.target.value);
                setSelectedApproverId('');
              }}
              placeholder="กรอกอีเมลผู้รับ หรือคลิกเลือกผู้อนุมัติแบบด่วนด้านบน..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 text-sm font-medium"
            />
          </div>

          {/* Subject Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              หัวข้ออีเมล (Subject)
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 text-sm font-medium"
            />
          </div>

          {/* Message Area */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                ข้อความนำส่งและลิงก์อนุมัติ (Message)
              </label>
              <button
                type="button"
                onClick={handleCopyApprovalLink}
                className="text-xs text-teal-700 hover:text-teal-800 font-semibold flex items-center gap-1 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200"
              >
                {copiedLink ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                {copiedLink ? 'คัดลอกลิงก์แล้ว' : 'คัดลอก 1-Click Link'}
              </button>
            </div>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 text-xs font-sans leading-relaxed"
            />
          </div>

          {/* PDF Attachment Option */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-teal-600 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    แนบไฟล์เอกสาร CPI PDF (A4 100%)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    แปลงแบบฟอร์ม CPI เป็นไฟล์ PDF แนบส่งไปกับอีเมล
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={attachPdf}
                onChange={(e) => setAttachPdf(e.target.checked)}
                className="w-4 h-4 accent-teal-600 rounded cursor-pointer shrink-0"
              />
            </div>

            {attachPdf && (
              <div className="pt-2 border-t border-slate-200">
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                  เลือกหน้าเอกสารที่จะแนบส่งในไฟล์ PDF:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPageOption('all')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                      pageOption === 'all'
                        ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ทุกหน้า (1 & 2)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPageOption('page1')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                      pageOption === 'page1'
                        ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    เฉพาะหน้า 1
                  </button>
                  <button
                    type="button"
                    onClick={() => setPageOption('page2')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                      pageOption === 'page2'
                        ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    เฉพาะหน้า 2
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Mail App Launchers */}
          <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-teal-900">
              <span className="flex items-center gap-1.5">
                <Inbox className="w-4 h-4 text-teal-700" />
                ส่งจากกล่องข้อความส่วนตัว (Gmail / Outlook):
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleOpenGmail}
                className="px-3 py-1.5 rounded-lg bg-white border border-teal-300 hover:bg-teal-100 text-teal-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
              >
                <ExternalLink className="w-3.5 h-3.5 text-teal-600" />
                เปิดใน Gmail (พร้อม 1-Click Link)
              </button>
              <button
                type="button"
                onClick={handleOpenMailApp}
                className="px-3 py-1.5 rounded-lg bg-white border border-teal-300 hover:bg-teal-100 text-teal-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
              >
                <Mail className="w-3.5 h-3.5 text-teal-600" />
                Outlook / Mail App
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
            >
              ยกเลิก
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-teal-600/20 disabled:opacity-60 transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  กำลังแปลง PDF และส่งอีเมล...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  ส่งอีเมลพร้อมแนบ PDF & ลิงก์อนุมัติ
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


