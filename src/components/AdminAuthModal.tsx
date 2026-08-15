import React, { useState } from 'react';
import { ShieldCheck, Lock, X, KeyRound, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pin.trim();
    if (cleanPin === 'BME@PTP') {
      setError('');
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 }
        });
      } catch {}
      onSuccess();
      onClose();
    } else {
      setError('รหัสผ่าน Admin ไม่ถูกต้อง');
    }
  };

  return (
    <div id="admin-auth-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
        <button
          id="close-admin-auth-btn"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              เข้าสู่ระบบสิทธิ์ Admin
            </h3>
            <p className="text-xs text-slate-500">
              สำหรับแผนกวิศวกรรมการแพทย์ (BME) ในการจัดการข้อมูล
            </p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 mb-5 text-xs text-slate-700 space-y-1">
          <div className="font-semibold flex items-center gap-1.5 text-blue-700">
            <KeyRound className="w-4 h-4 text-blue-600" />
            <span>พื้นที่ควบคุมเฉพาะเจ้าหน้าที่แผนกวิศวกรรมการแพทย์</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            บุคคลภายนอกสามารถบันทึกข้อมูลและดูแดชบอร์ดสรุปได้ตามปกติ การเข้าถึงสมุดติดต่อและตั้งค่าระบบจำเป็นต้องยืนยันตัวตนด้วยรหัสผ่านผู้ดูแลระบบ
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              กรอกรหัสผ่าน Admin
            </label>
            <div className="relative">
              <input
                id="admin-pin-input"
                type="password"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError('');
                }}
                placeholder="กรอกรหัสผ่านผู้ดูแลระบบ"
                autoFocus
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-slate-900 tracking-wider font-mono text-center text-base transition-all"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
            {error && (
              <p className="text-xs text-red-600 flex items-center gap-1 mt-1.5 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{error}</span>
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              id="submit-admin-pin-btn"
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>ปลดล็อก Admin</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
