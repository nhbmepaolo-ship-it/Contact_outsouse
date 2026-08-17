/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { VisitorCheckInForm } from './components/VisitorCheckInForm';
import { DashboardView } from './components/DashboardView';
import { VisitorLogsTable } from './components/VisitorLogsTable';
import { CompanyDirectoryView } from './components/CompanyDirectoryView';
import { SettingsView } from './components/SettingsView';
import { AdminAuthModal } from './components/AdminAuthModal';
import { StorageService } from './services/storageService';
import { GoogleSheetsService } from './services/googleSheetsService';
import { VisitorRecord, DepartmentInfo, EquipmentInfo } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'checkin' | 'dashboard' | 'logs' | 'contacts' | 'settings'>('checkin');
  const [isAdmin, setIsAdmin] = useState<boolean>(() => StorageService.isAdminAuthenticated());
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);

  const [records, setRecords] = useState<VisitorRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentInfo[]>([]);
  const [equipmentList, setEquipmentList] = useState<EquipmentInfo[]>([]);
  const [isAutoSyncing, setIsAutoSyncing] = useState<boolean>(false);

  // Initial load
  const loadData = () => {
    setRecords(StorageService.getVisitorRecords());
    setDepartments(StorageService.getDepartments());
    setEquipmentList(StorageService.getEquipment());
    setIsAdmin(StorageService.isAdminAuthenticated());
  };

  useEffect(() => {
    loadData();

    // Auto-connect and sync with Google Sheets on every page load
    const autoSyncGoogleSheets = async () => {
      try {
        setIsAutoSyncing(true);
        await GoogleSheetsService.initSettings();
        const syncResult = await GoogleSheetsService.fetchMasterDataFromSheet();
        if (syncResult.success) {
          if (syncResult.departments && syncResult.departments.length > 0) {
            StorageService.saveDepartments(syncResult.departments);
            setDepartments(syncResult.departments);
          }
          if (syncResult.equipments && syncResult.equipments.length > 0) {
            StorageService.saveEquipment(syncResult.equipments);
            setEquipmentList(syncResult.equipments);
          }
        }
      } catch (err) {
        console.warn('Background auto-sync notice:', err);
      } finally {
        setIsAutoSyncing(false);
      }
    };

    autoSyncGoogleSheets();
  }, []);

  const handleRecordAdded = (newRecord: VisitorRecord) => {
    setRecords(StorageService.getVisitorRecords());
  };

  const handleDeleteRecord = (id: string) => {
    StorageService.deleteVisitorRecord(id);
    setRecords(StorageService.getVisitorRecords());
  };

  const handleAdminSuccess = () => {
    StorageService.setAdminAuthenticated(true);
    setIsAdmin(true);
    setActiveTab('contacts');
  };

  const handleLogoutAdmin = () => {
    StorageService.setAdminAuthenticated(false);
    setIsAdmin(false);
    if (activeTab === 'contacts') {
      setActiveTab('checkin');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/60 text-slate-900 flex flex-col font-sans antialiased">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isAdmin={isAdmin}
        onOpenAdminAuth={() => setIsAdminModalOpen(true)}
        onLogoutAdmin={handleLogoutAdmin}
        totalVisitorsCount={records.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {activeTab === 'checkin' && (
          <VisitorCheckInForm
            departments={departments}
            equipmentList={equipmentList}
            onRecordAdded={handleRecordAdded}
            onViewLogs={() => {
              if (isAdmin) {
                setActiveTab('logs');
              } else {
                setIsAdminModalOpen(true);
              }
            }}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardView records={records} />
        )}

        {activeTab === 'logs' && (
          <VisitorLogsTable
            records={records}
            onDeleteRecord={handleDeleteRecord}
            isAdmin={isAdmin}
            onOpenAdminAuth={() => setIsAdminModalOpen(true)}
          />
        )}

        {activeTab === 'contacts' && (
          <CompanyDirectoryView
            isAdmin={isAdmin}
            onOpenAdminAuth={() => setIsAdminModalOpen(true)}
            equipmentList={equipmentList}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            departments={departments}
            equipmentList={equipmentList}
            records={records}
            onRefreshData={loadData}
            isAdmin={isAdmin}
            onOpenAdminAuth={() => setIsAdminModalOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 text-center sm:text-left">
            <span className="font-semibold text-slate-800">
              © 2026 BME Visitor Hub
            </span>
            <span className="hidden sm:inline text-slate-300">•</span>
            <span>แผนกวิศวกรรมการแพทย์ (Biomedical Engineering)</span>
          </div>

          {/* Developer Credit - Designed Elegantly */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200/90 text-slate-700 shadow-2xs">
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 flex items-center justify-center text-white text-[10px] font-extrabold shadow-2xs">
              SK
            </div>
            <span className="text-[11px] text-slate-500 font-medium">Developed by</span>
            <span className="text-xs font-bold text-slate-900 tracking-tight">Supattra Kaewsuwan</span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Telegram Bot Ready
            </span>
            <span>•</span>
            <span>นโยบายลบรูปภาพ 5 วัน (PDPA)</span>
          </div>
        </div>
      </footer>

      {/* Admin Authentication Modal */}
      <AdminAuthModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onSuccess={handleAdminSuccess}
      />
    </div>
  );
}
