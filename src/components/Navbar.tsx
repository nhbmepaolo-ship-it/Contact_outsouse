import React from 'react';
import {
  Activity,
  ClipboardList,
  Building2,
  BarChart3,
  Settings,
  ShieldCheck,
  Lock,
  Unlock,
  Send,
  Clock,
  PlusCircle,
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'checkin' | 'dashboard' | 'logs' | 'contacts' | 'settings';
  setActiveTab: (tab: 'checkin' | 'dashboard' | 'logs' | 'contacts' | 'settings') => void;
  isAdmin: boolean;
  onOpenAdminAuth: () => void;
  onLogoutAdmin: () => void;
  totalVisitorsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isAdmin,
  onOpenAdminAuth,
  onLogoutAdmin,
  totalVisitorsCount,
}) => {
  return (
    <header id="main-header" className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer select-none" onClick={() => setActiveTab('checkin')}>
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-xs">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-base sm:text-lg leading-tight tracking-tight">
                  BME Visitor Hub
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wide">
                  ฝ่ายเครื่องมือแพทย์
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                ระบบลงทะเบียน & บันทึกประวัติช่างและคู่ค้าเครื่องมือแพทย์
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              id="nav-checkin-btn"
              onClick={() => setActiveTab('checkin')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'checkin'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>ลงทะเบียนเข้าพบ</span>
            </button>

            <button
              id="nav-dashboard-btn"
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>แดชบอร์ดสรุปรายงาน</span>
            </button>

            {/* Visitor Logs (Admin Protected) */}
            <button
              id="nav-logs-btn"
              onClick={() => {
                if (isAdmin) {
                  setActiveTab('logs');
                } else {
                  onOpenAdminAuth();
                }
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'logs'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>ประวัติ ({totalVisitorsCount})</span>
              {isAdmin ? (
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              ) : (
                <Lock className="w-3 h-3 text-slate-400" />
              )}
            </button>

            {/* Company Contacts (Admin Protected) */}
            <button
              id="nav-contacts-btn"
              onClick={() => {
                if (isAdmin) {
                  setActiveTab('contacts');
                } else {
                  onOpenAdminAuth();
                }
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'contacts'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>สมุดติดต่อบริษัท</span>
              {isAdmin ? (
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              ) : (
                <Lock className="w-3 h-3 text-slate-400" />
              )}
            </button>

            {/* Settings & Sheets (Admin Protected) */}
            <button
              id="nav-settings-btn"
              onClick={() => {
                if (isAdmin) {
                  setActiveTab('settings');
                } else {
                  onOpenAdminAuth();
                }
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'settings'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>ตั้งค่า & ชีท</span>
              {isAdmin ? (
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              ) : (
                <Lock className="w-3 h-3 text-slate-400" />
              )}
            </button>
          </nav>

          {/* Right Status Badges & Admin Switch */}
          <div className="flex items-center gap-2">
            {/* Telegram Active indicator */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium" title="เชื่อมต่อ Telegram Bot แจ้งเตือนเรียลไทม์">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <Send className="w-3 h-3 text-blue-600" />
              <span>Telegram Alert</span>
            </div>

            {/* 5-day retention active */}
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium" title="นโยบายความปลอดภัย PDPA ลบรูปอัตโนมัติ 5 วัน">
              <Clock className="w-3 h-3 text-amber-600" />
              <span>PDPA 5 วัน</span>
            </div>

            {/* Admin Toggle / Badge */}
            {isAdmin ? (
              <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-emerald-800 text-xs font-semibold shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Admin Mode</span>
                <button
                  id="admin-logout-btn"
                  onClick={onLogoutAdmin}
                  className="ml-1 text-slate-400 hover:text-rose-600 transition-colors"
                  title="ออกจากโหมด Admin"
                >
                  <Unlock className="w-3 h-3 text-emerald-600" />
                </button>
              </div>
            ) : (
              <button
                id="admin-login-trigger-btn"
                onClick={onOpenAdminAuth}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-all shadow-2xs cursor-pointer"
                title="คลิกเพื่อเข้าสู่โหมด Admin (สำหรับดูสมุดติดต่อบริษัท)"
              >
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>Admin Login</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-200 text-xs gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('checkin')}
            className={`flex flex-col items-center py-1 px-2.5 rounded-md text-[11px] font-medium ${
              activeTab === 'checkin' ? 'text-blue-600 font-bold bg-blue-50' : 'text-slate-600'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>ลงทะเบียน</span>
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center py-1 px-2.5 rounded-md text-[11px] font-medium ${
              activeTab === 'dashboard' ? 'text-blue-600 font-bold bg-blue-50' : 'text-slate-600'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>แดชบอร์ด</span>
          </button>
          <button
            onClick={() => {
              if (isAdmin) setActiveTab('logs');
              else onOpenAdminAuth();
            }}
            className={`flex flex-col items-center py-1 px-2.5 rounded-md text-[11px] font-medium ${
              activeTab === 'logs' ? 'text-blue-600 font-bold bg-blue-50' : 'text-slate-600'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>ประวัติ {isAdmin ? '' : '🔒'}</span>
          </button>
          <button
            onClick={() => {
              if (isAdmin) setActiveTab('contacts');
              else onOpenAdminAuth();
            }}
            className={`flex flex-col items-center py-1 px-2.5 rounded-md text-[11px] font-medium ${
              activeTab === 'contacts' ? 'text-blue-600 font-bold bg-blue-50' : 'text-slate-600'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>สมุดติดต่อ {isAdmin ? '' : '🔒'}</span>
          </button>
          <button
            onClick={() => {
              if (isAdmin) setActiveTab('settings');
              else onOpenAdminAuth();
            }}
            className={`flex flex-col items-center py-1 px-2.5 rounded-md text-[11px] font-medium ${
              activeTab === 'settings' ? 'text-blue-600 font-bold bg-blue-50' : 'text-slate-600'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>ตั้งค่า {isAdmin ? '' : '🔒'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
