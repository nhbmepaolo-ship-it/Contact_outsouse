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
import { VisitorRecord, DepartmentInfo, EquipmentInfo } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'checkin' | 'dashboard' | 'logs' | 'contacts' | 'settings'>('checkin');
  const [isAdmin, setIsAdmin] = useState<boolean>(() => StorageService.isAdminAuthenticated());
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);

  const [records, setRecords] = useState<VisitorRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentInfo[]>([]);
  const [equipmentList, setEquipmentList] = useState<EquipmentInfo[]>([]);

  // Initial load
  const loadData = () => {
    setRecords(StorageService.getVisitorRecords());
    setDepartments(StorageService.getDepartments());
    setEquipmentList(StorageService.getEquipment());
    setIsAdmin(StorageService.isAdminAuthenticated());
  };

  useEffect(() => {
    loadData();
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
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            © 2026 ฝ่ายเครื่องมือแพทย์ (Biomedical Engineering - BME) • โรงพยาบาล
          </span>
          <div className="flex items-center gap-3 text-slate-400">
            <span>Telegram Bot: @8344422414</span>
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
