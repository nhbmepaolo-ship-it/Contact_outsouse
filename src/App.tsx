import React, { useState, useEffect } from 'react';
import { CPIFormData } from './types';
import { createEmptyCPIForm, PRESET_CPI_TEMPLATES } from './data/presetTemplates';
import { SUPERVISOR_APPROVER_OPTIONS } from './data/personnel';
import { Navbar } from './components/Navbar';
import { CPIFormEditor } from './components/CPIFormEditor';
import { PhyathaiCPIPaperForm } from './components/PhyathaiCPIPaperForm';
import { SignatureModal } from './components/SignatureModal';
import { AutoFillModal } from './components/AutoFillModal';
import { EmailModal } from './components/EmailModal';
import { PrintModal } from './components/PrintModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { exportToPDF, printDocument } from './utils/exporter';
import { Sparkles, FileDown, Mail, PenTool, CheckCircle2, Printer } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'phyathai_cpi_saved_forms_v1';

export default function App() {
  const [savedForms, setSavedForms] = useState<CPIFormData[]>([]);
  const [activeForm, setActiveForm] = useState<CPIFormData>(createEmptyCPIForm());
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor');

  // Modals state
  const [isAutoFillOpen, setIsAutoFillOpen] = useState(false);
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const handleExportPDF = () => {
    setIsPrintModalOpen(true);
  };

  const handlePrint = () => {
    setIsPrintModalOpen(true);
  };
  
  const [signatureModalConfig, setSignatureModalConfig] = useState<{
    isOpen: boolean;
    role: 'proposer' | 'deptHead' | 'approver' | 'proposerPage2';
    title: string;
    signerName: string;
    currentSig: string;
  }>({
    isOpen: false,
    role: 'proposer',
    title: 'เซ็นชื่อผู้เสนอโครงการ',
    signerName: '',
    currentSig: '',
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Load saved forms from localStorage on initial render
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sanitized = parsed.map((item: CPIFormData) => ({
            ...item,
            deptHeadName: 'ชาลี เมฆสุวรรณ',
            deptHeadPosition: 'ผู้จัดการแผนกวิศวกรรมการแพทย์',
            approverName: 'ชาลี เมฆสุวรรณ',
          }));
          setSavedForms(sanitized);
          setActiveForm(sanitized[0]);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sanitized));
          return;
        }
      }
    } catch (e) {
      console.error('Error loading saved CPI forms:', e);
    }

    // Default to preset 0 if no local storage
    const defaultForm = { ...createEmptyCPIForm(), ...PRESET_CPI_TEMPLATES[0].data };
    defaultForm.deptHeadName = 'ชาลี เมฆสุวรรณ';
    defaultForm.deptHeadPosition = 'ผู้จัดการแผนกวิศวกรรมการแพทย์';
    defaultForm.approverName = 'ชาลี เมฆสุวรรณ';
    setActiveForm(defaultForm as CPIFormData);
    setSavedForms([defaultForm as CPIFormData]);
  }, []);

  // Handle 1-Click Approval Link trigger from URL query parameters
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    const docNoParam = urlParams.get('docNo');

    if (action === 'approve' || action === 'deptHead') {
      const roleToOpen = action === 'deptHead' ? 'deptHead' : 'approver';
      setTimeout(() => {
        handleOpenSignatureModal(roleToOpen);
        showToast(`เปิดหน้าต่างลงนามอนุมัติออนไลน์สำหรับเอกสาร ${docNoParam || activeForm.docNo}`);
      }, 600);
    }
  }, []);


  // Save current activeForm to savedForms and localStorage
  const handleFormChange = (updatedForm: CPIFormData) => {
    // Ensure proposer name on page 2 always strictly matches proposer name on page 1
    if (updatedForm.proposerName) {
      updatedForm.projectOwnerNamePage2 = updatedForm.proposerName;
    }
    if (updatedForm.proposerSignature) {
      updatedForm.projectOwnerSignaturePage2 = updatedForm.proposerSignature;
    }

    setActiveForm(updatedForm);

    setSavedForms((prev) => {
      const index = prev.findIndex((item) => item.id === updatedForm.id);
      let updatedList: CPIFormData[];
      if (index >= 0) {
        updatedList = [...prev];
        updatedList[index] = updatedForm;
      } else {
        updatedList = [updatedForm, ...prev];
      }
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
      } catch (err) {
        console.error('LocalStorage save error:', err);
      }
      return updatedList;
    });
  };

  // Signature modal trigger
  const handleOpenSignatureModal = (role: 'proposer' | 'deptHead' | 'approver' | 'proposerPage2') => {
    let title = 'เซ็นชื่อออนไลน์';
    let signerName = '';
    let currentSig = '';

    if (role === 'proposer') {
      title = 'ลายเซ็นผู้เสนอโครงการ (ส่วนที่ 1 หน้า 1)';
      signerName = activeForm.proposerName;
      currentSig = activeForm.proposerSignature;
    } else if (role === 'deptHead') {
      title = 'ลายเซ็นหัวหน้างาน / ผู้จัดการแผนก (ส่วนที่ 1 หน้า 1)';
      signerName = activeForm.deptHeadName;
      currentSig = activeForm.deptHeadSignature;
    } else if (role === 'approver') {
      title = 'ลายเซ็นผู้อนุมัติปิดโครงการ (ส่วนที่ 3 หน้า 2)';
      signerName = activeForm.approverName;
      currentSig = activeForm.approverSignature;
    } else if (role === 'proposerPage2') {
      title = 'ลายเซ็นผู้เสนอโครงการ / หัวหน้าโครงการ (ส่วนที่ 3 หน้า 2)';
      signerName = activeForm.projectOwnerNamePage2 || activeForm.proposerName;
      currentSig = activeForm.projectOwnerSignaturePage2;
    }

    setSignatureModalConfig({
      isOpen: true,
      role,
      title,
      signerName,
      currentSig,
    });
  };

  // Save signature handler
  const handleSaveSignature = (
    role: 'proposer' | 'deptHead' | 'approver' | 'proposerPage2',
    signatureDataUrl: string,
    name: string
  ) => {
    let updated = { ...activeForm };

    if (role === 'proposer') {
      updated.proposerSignature = signatureDataUrl;
      updated.proposerName = name;
      updated.projectOwnerNamePage2 = name;
      if (signatureDataUrl && !updated.projectOwnerSignaturePage2) {
        updated.projectOwnerSignaturePage2 = signatureDataUrl;
      }
    } else if (role === 'deptHead') {
      updated.deptHeadSignature = signatureDataUrl;
      updated.deptHeadName = name;
      const supervisor = SUPERVISOR_APPROVER_OPTIONS.find((s) => s.name === name);
      if (supervisor && supervisor.position) {
        updated.deptHeadPosition = supervisor.position;
      }
    } else if (role === 'approver') {
      updated.approverSignature = signatureDataUrl;
      updated.approverName = name;
      if (signatureDataUrl) {
        updated.status = 'approved_closed';
      }
    } else if (role === 'proposerPage2') {
      updated.projectOwnerSignaturePage2 = signatureDataUrl;
      updated.projectOwnerNamePage2 = name;
      updated.proposerName = name;
      if (signatureDataUrl && !updated.proposerSignature) {
        updated.proposerSignature = signatureDataUrl;
      }
    }

    handleFormChange(updated);
    showToast('บันทึกลายเซ็นเรียบร้อยแล้ว');
  };

  // AI Auto-Fill result apply handler
  const handleApplyAutoFillData = (generatedData: Partial<CPIFormData>) => {
    const updated = {
      ...activeForm,
      ...generatedData,
      updatedAt: new Date().toISOString(),
    };
    handleFormChange(updated);
    showToast('ป้อนค่าอัตโนมัติด้วย AI เรียบร้อยแล้ว!');
  };

  // History handlers
  const handleCreateNew = () => {
    const newForm = createEmptyCPIForm();
    setActiveForm(newForm);
    setSavedForms((prev) => [newForm, ...prev]);
    showToast('สร้างเอกสาร CPI ฉบับใหม่เรียบร้อยแล้ว');
  };

  const handleLoadPreset = (index: number) => {
    const preset = PRESET_CPI_TEMPLATES[index];
    if (!preset) return;
    const newForm = {
      ...createEmptyCPIForm(),
      ...preset.data,
      id: 'cpi_' + Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setActiveForm(newForm as CPIFormData);
    setSavedForms((prev) => [newForm as CPIFormData, ...prev]);
    showToast(`โหลดตัวอย่างโครงการ: ${preset.name}`);
  };

  const handleDuplicate = (formToDuplicate: CPIFormData) => {
    const duplicated: CPIFormData = {
      ...formToDuplicate,
      id: 'cpi_' + Date.now(),
      docNo: `${formToDuplicate.docNo}-COPY`,
      projectTitle: `${formToDuplicate.projectTitle} (คัดลอก)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setActiveForm(duplicated);
    setSavedForms((prev) => [duplicated, ...prev]);
    showToast('คัดลอกเอกสารเรียบร้อยแล้ว');
  };

  const handleDelete = (formId: string) => {
    const updatedList = savedForms.filter((f) => f.id !== formId);
    setSavedForms(updatedList);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
    } catch (e) {
      console.error(e);
    }

    if (activeForm.id === formId) {
      if (updatedList.length > 0) {
        setActiveForm(updatedList[0]);
      } else {
        const newBlank = createEmptyCPIForm();
        setActiveForm(newBlank);
        setSavedForms([newBlank]);
      }
    }
    showToast('ลบเอกสารเรียบร้อยแล้ว');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans selection:bg-teal-100 selection:text-teal-900">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2 text-xs font-medium animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        form={activeForm}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onOpenAutoFillModal={() => setIsAutoFillOpen(true)}
        onOpenSignatureModal={handleOpenSignatureModal}
        onOpenEmailModal={() => setIsEmailOpen(true)}
        onOpenHistoryDrawer={() => setIsHistoryOpen(true)}
        onExportPDF={handleExportPDF}
        onPrint={handlePrint}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* Quick Info Bar */}
        <div className="mb-6 bg-white rounded-2xl p-4 shadow-xs border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-100 text-teal-800">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                {activeForm.projectTitle || '(ยังไม่ได้ระบุชื่อโครงการ)'}
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    activeForm.status === 'approved_closed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : activeForm.status === 'pending_approval'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {activeForm.status === 'approved_closed'
                    ? 'อนุมัติปิดโครงการแล้ว'
                    : activeForm.status === 'pending_approval'
                    ? 'รอเปิดโครงการ'
                    : 'ร่างเอกสาร'}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                {activeForm.department} | รหัสเอกสารควบคุม PTP-FM-QMS-001 Rev.06
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            <button
              type="button"
              onClick={() => setIsAutoFillOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              ป้อนค่า AI
            </button>

            <button
              type="button"
              onClick={() => handleOpenSignatureModal('proposer')}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <PenTool className="w-3.5 h-3.5 text-slate-600" />
              เซ็นชื่อ
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
              title="พิมพ์เอกสารหรือบันทึกเป็น PDF ผ่านระบบเบราว์เซอร์ (Vector 100% ตรงตามพรีวิว)"
            >
              <Printer className="w-3.5 h-3.5" />
              พิมพ์ / Save PDF (100%)
            </button>

            <button
              type="button"
              onClick={handleExportPDF}
              className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white border border-sky-600 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
              title="ดาวน์โหลดไฟล์ .pdf"
            >
              <FileDown className="w-3.5 h-3.5" />
              ดาวน์โหลด PDF
            </button>
          </div>
        </div>

        {/* View Switcher Content */}
        {viewMode === 'editor' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:block print:w-full">
            {/* Form Editor */}
            <div className="lg:col-span-8 space-y-6 print:hidden">
              <CPIFormEditor
                form={activeForm}
                onChange={handleFormChange}
                onOpenSignatureModal={handleOpenSignatureModal}
                onOpenAutoFillModal={() => setIsAutoFillOpen(true)}
              />
            </div>

            {/* Side Preview Card */}
            <div className="lg:col-span-4 space-y-6 print:w-full print:max-w-none print:m-0 print:p-0">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs sticky top-20 space-y-4 print:p-0 print:border-none print:shadow-none print:static print:bg-transparent">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 print:hidden">
                  <h3 className="font-bold text-slate-900 text-sm">พรีวิวแบบฟอร์ม CPI A4</h3>
                  <button
                    type="button"
                    onClick={() => setViewMode('preview')}
                    className="text-xs text-teal-700 hover:text-teal-800 font-semibold underline"
                  >
                    ขยายเต็มหน้าจอ →
                  </button>
                </div>

                <div className="bg-slate-100 p-2 rounded-xl border border-slate-200 overflow-hidden scale-[0.9] origin-top h-[500px] overflow-y-auto print:bg-white print:p-0 print:border-none print:scale-100 print:h-auto print:overflow-visible print:max-h-none print:w-full">
                  <PhyathaiCPIPaperForm
                    form={activeForm}
                    onOpenSignatureModal={handleOpenSignatureModal}
                  />
                </div>

                <div className="pt-2 flex flex-col gap-2 print:hidden">
                  <button
                    type="button"
                    onClick={() => setIsEmailOpen(true)}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Mail className="w-4 h-4 text-teal-400" />
                    ส่งอีเมลเอกสาร CPI (To Email)
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Full Screen Paper View Mode */
          <div className="flex flex-col items-center py-4">
            <PhyathaiCPIPaperForm
              form={activeForm}
              onOpenSignatureModal={handleOpenSignatureModal}
            />
          </div>
        )}
      </main>

      {/* Modals & Drawers */}
      <AutoFillModal
        isOpen={isAutoFillOpen}
        onClose={() => setIsAutoFillOpen(false)}
        currentDepartment={activeForm.department}
        onApplyData={handleApplyAutoFillData}
      />

      <SignatureModal
        isOpen={signatureModalConfig.isOpen}
        onClose={() => setSignatureModalConfig((prev) => ({ ...prev, isOpen: false }))}
        title={signatureModalConfig.title}
        role={signatureModalConfig.role}
        signerName={signatureModalConfig.signerName}
        currentSignature={signatureModalConfig.currentSig}
        onSave={handleSaveSignature}
      />

      <EmailModal
        isOpen={isEmailOpen}
        onClose={() => setIsEmailOpen(false)}
        form={activeForm}
      />

      <PrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        form={activeForm}
        onStatusChange={(msg) => {
          if (msg) showToast(msg);
        }}
      />

      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        savedForms={savedForms}
        activeFormId={activeForm.id}
        onSelectForm={(f) => setActiveForm(f)}
        onCreateNew={handleCreateNew}
        onLoadPreset={handleLoadPreset}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
      />
    </div>
  );
}
