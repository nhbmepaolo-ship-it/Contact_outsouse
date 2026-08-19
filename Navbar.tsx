import React from 'react';
import {
  Activity,
  ShieldCheck,
  Lock,
  Unlock,
  Send,
  Clock,
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
    <header id="main-header" className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-15 gap-3">
          
          {/* Logo & Brand */}
          <div 
            className="flex items-center space-x-2.5 cursor-pointer select-none py-1 group" 
            onClick={() => setActiveTab('checkin')}
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold shadow-xs transition-transform group-hover:scale-105">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 text-sm sm:text-base tracking-tight">
                  BME Visitor Hub
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/70">
                  🏥 วิศวกรรมการแพทย์
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/70">
            <button
              id="nav-checkin-btn"
              onClick={() => setActiveTab('checkin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'checkin'
                  ? 'bg-white text-blue-700 font-semibold shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <span>📝</span>
              <span>ลงทะเบียน</span>
            </button>

            <button
              id="nav-dashboard-btn"
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-white text-blue-700 font-semibold shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <span>📊</span>
              <span>แดชบอร์ด</span>
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'logs'
                  ? 'bg-white text-blue-700 font-semibold shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <span>📋</span>
              <span>ประวัติ ({totalVisitorsCount})</span>
              {isAdmin ? (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              ) : (
                <span className="text-[10px] text-slate-400">🔒</span>
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'contacts'
                  ? 'bg-white text-blue-700 font-semibold shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <span>🏢</span>
              <span>สมุดติดต่อ</span>
              {isAdmin ? (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              ) : (
                <span className="text-[10px] text-slate-400">🔒</span>
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-white text-blue-700 font-semibold shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <span>⚙️</span>
              <span>ตั้งค่า & ชีท</span>
              {isAdmin ? (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              ) : (
                <span className="text-[10px] text-slate-400">🔒</span>
              )}
            </button>
          </nav>

          {/* Right Status Badges & Admin Switch */}
          <div className="flex items-center gap-2">
            {/* Telegram Active indicator */}
            <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-sky-50 text-sky-800 border border-sky-200/70 text-[11px] font-medium" title="เชื่อมต่อ Telegram Bot แจ้งเตือนเรียลไทม์">
              <Send className="w-3 h-3 text-sky-600" />
              <span>Telegram Alert</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>

            {/* 5-day retention active */}
            <div className="hidden xl:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/70 text-[11px] font-medium" title="นโยบายความปลอดภัย PDPA ลบรูปอัตโนมัติ 5 วัน">
              <Clock className="w-3 h-3 text-amber-600" />
              <span>PDPA 5 วัน</span>
            </div>

            {/* Admin Toggle / Badge */}
            {isAdmin ? (
              <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg text-emerald-800 text-xs font-medium shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Admin Mode</span>
                <button
                  id="admin-logout-btn"
                  onClick={onLogoutAdmin}
                  className="ml-1 text-slate-400 hover:text-rose-600 transition-colors p-0.5"
                  title="ออกจากโหมด Admin"
                >
                  <Unlock className="w-3 h-3 text-emerald-600" />
                </button>
              </div>
            ) : (
              <button
                id="admin-login-trigger-btn"
                onClick={onOpenAdminAuth}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-all shadow-2xs cursor-pointer"
                title="คลิกเพื่อเข้าสู่โหมด Admin"
              >
                <Lock className="w-3 h-3 text-slate-500" />
                <span>Admin Login</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden items-center justify-around py-1.5 border-t border-slate-100 text-xs gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('checkin')}
            className={`flex flex-col items-center py-1 px-2 rounded-lg text-[11px] font-medium transition-all ${
              activeTab === 'checkin' ? 'text-blue-600 font-bold bg-blue-50' : 'text-slate-600'
            }`}
          >
            <span className="text-sm">📝</span>
            <span>ลงทะเบียน</span>
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center py-1 px-2 rounded-lg text-[11px] font-medium transition-all ${
              activeTab === 'dashboard' ? 'text-blue-600 font-bold bg-blue-50' : 'text-slate-600'
            }`}
          >
            <span className="text-sm">📊</span>
            <span>แดชบอร์ด</span>
          </button>
          <button
            onClick={() => {
              if (isAdmin) setActiveTab('logs');
              else onOpenAdminAuth();
            }}
            className={`flex flex-col items-center py-1 px-2 rounded-lg text-[11px] font-medium transition-all ${
              activeTab === 'logs' ? 'text-blue-600 font-bold bg-blue-50' : 'text-slate-600'
            }`}
          >
            <span className="text-sm">📋</span>
            <span>ประวัติ {isAdmin ? '' : '🔒'}</span>
          </button>
          <button
            onClick={() => {
              if (isAdmin) setActiveTab('contacts');
              else onOpenAdminAuth();
            }}
            className={`flex flex-col items-center py-1 px-2 rounded-lg text-[11px] font-medium transition-all ${
              activeTab === 'contacts' ? 'text-blue-600 font-bold bg-blue-50' : 'text-slate-600'
            }`}
          >
            <span className="text-sm">🏢</span>
            <span>สมุดติดต่อ {isAdmin ? '' : '🔒'}</span>
          </button>
          <button
            onClick={() => {
              if (isAdmin) setActiveTab('settings');
              else onOpenAdminAuth();
            }}
            className={`flex flex-col items-center py-1 px-2 rounded-lg text-[11px] font-medium transition-all ${
              activeTab === 'settings' ? 'text-blue-600 font-bold bg-blue-50' : 'text-slate-600'
            }`}
          >
            <span className="text-sm">⚙️</span>
            <span>ตั้งค่า {isAdmin ? '' : '🔒'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
