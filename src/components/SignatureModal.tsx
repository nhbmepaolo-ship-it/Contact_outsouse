import React, { useRef, useState, useEffect } from 'react';
import { X, RotateCcw, Check, Upload, PenTool } from 'lucide-react';
import { PROPOSER_OPTIONS, SUPERVISOR_APPROVER_OPTIONS } from '../data/personnel';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  role: 'proposer' | 'deptHead' | 'approver' | 'proposerPage2';
  currentSignature?: string;
  signerName: string;
  onSave: (role: 'proposer' | 'deptHead' | 'approver' | 'proposerPage2', signatureDataUrl: string, name: string) => void;
}

export const SignatureModal: React.FC<SignatureModalProps> = ({
  isOpen,
  onClose,
  title,
  role,
  currentSignature = '',
  signerName,
  onSave,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [name, setName] = useState(signerName);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    setName(signerName);
  }, [signerName]);

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Background line
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(30, canvas.height - 30);
        ctx.lineTo(canvas.width - 30, canvas.height - 30);
        ctx.stroke();

        // If current signature exists, draw it
        if (currentSignature) {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            setHasDrawn(true);
          };
          img.src = currentSignature;
        } else {
          setHasDrawn(false);
        }
      }
    }
  }, [isOpen, currentSignature]);

  if (!isOpen) return null;

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#0f172a'; // Dark ink
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Redraw baseline
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(30, canvas.height - 30);
    ctx.lineTo(canvas.width - 30, canvas.height - 30);
    ctx.stroke();

    setHasDrawn(false);
  };

  const generateSampleSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    clearCanvas();
    ctx.strokeStyle = '#1e3a8a'; // Deep blue signature
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    ctx.beginPath();
    // Elegant cursive sample signature
    ctx.moveTo(50, 110);
    ctx.bezierCurveTo(80, 40, 90, 140, 120, 80);
    ctx.bezierCurveTo(140, 40, 160, 120, 180, 90);
    ctx.bezierCurveTo(200, 70, 230, 110, 260, 85);
    ctx.stroke();

    // Underline loop
    ctx.beginPath();
    ctx.moveTo(40, 130);
    ctx.quadraticCurveTo(180, 155, 320, 125);
    ctx.stroke();

    setHasDrawn(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 10, canvas.width - 40, canvas.height - 30);
        setHasDrawn(true);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    let signatureDataUrl = '';
    if (hasDrawn) {
      signatureDataUrl = canvas.toDataURL('image/png');
    }
    onSave(role, signatureDataUrl, name);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <PenTool className="w-5 h-5 text-teal-400" />
            <h3 className="font-semibold text-lg">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              ชื่อ-นามสกุล ผู้เซ็นเอกสาร
            </label>
            {(() => {
              const isProposerRole = role === 'proposer' || role === 'proposerPage2';
              const nameList = isProposerRole
                ? PROPOSER_OPTIONS
                : SUPERVISOR_APPROVER_OPTIONS.map((s) => s.name);

              return (
                <div className="space-y-1.5">
                  <select
                    value={nameList.includes(name) ? name : ''}
                    onChange={(e) => {
                      if (e.target.value) setName(e.target.value);
                    }}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 text-xs bg-white"
                  >
                    <option value="">-- เลือกจากรายชื่อที่กำหนด --</option>
                    {isProposerRole
                      ? PROPOSER_OPTIONS.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))
                      : SUPERVISOR_APPROVER_OPTIONS.map((item) => (
                          <option key={item.name} value={item.name}>
                            {item.name} {item.position ? `(${item.position})` : ''}
                          </option>
                        ))}
                  </select>

                  <div className="flex flex-wrap gap-1">
                    {nameList.map((n) => (
                      <button
                        type="button"
                        key={n}
                        onClick={() => setName(n)}
                        className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-all ${
                          name === n
                            ? 'bg-teal-700 text-white shadow-xs'
                            : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-teal-50'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="หรือกรอกชื่อ-นามสกุล..."
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 text-sm"
                  />
                </div>
              );
            })()}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                กระดานเซ็นชื่อดิจิทัล (ลากด้วยเมาส์หรือสัมผัสหน้าจอ)
              </label>
              <button
                type="button"
                onClick={generateSampleSignature}
                className="text-xs text-teal-600 hover:text-teal-700 font-medium underline"
              >
                + ตัวอย่างลายเซ็น
              </button>
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 relative overflow-hidden touch-none">
              <canvas
                ref={canvasRef}
                width={440}
                height={160}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-40 cursor-crosshair block"
              />
              {!hasDrawn && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-400 text-sm font-light">
                  วาดลายเซ็นของคุณที่นี่...
                </div>
              )}
            </div>
          </div>

          {/* Action buttons bar */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clearCanvas}
                className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-medium flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                ล้างหน้าจอ
              </button>

              <label className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5" />
                อัปโหลดไฟล์ภาพ
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm flex items-center gap-1.5 shadow-md shadow-teal-600/20 transition-all"
            >
              <Check className="w-4 h-4" />
              บันทึกลายเซ็น
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
