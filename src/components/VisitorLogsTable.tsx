import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  Clock,
  Eye,
  Trash2,
  Send,
  Car,
  Tag,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Lock,
} from 'lucide-react';
import { VisitorRecord } from '../types';
import { getDaysRemaining } from '../utils/imageRetention';
import { sendTelegramNotification, formatVisitorTelegramMessage } from '../services/telegramService';
import { cleanPhoneNumber, formatPhoneNumber } from '../utils/phoneFormatter';

interface VisitorLogsTableProps {
  records: VisitorRecord[];
  onDeleteRecord: (id: string) => void;
  isAdmin: boolean;
  onOpenAdminAuth: () => void;
}

export const VisitorLogsTable: React.FC<VisitorLogsTableProps> = ({
  records,
  onDeleteRecord,
  isAdmin,
  onOpenAdminAuth,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [workTypeFilter, setWorkTypeFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [retentionFilter, setRetentionFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [selectedImage, setSelectedImage] = useState<{ url: string; name: string; isExpired: boolean; daysLeft: number } | null>(null);
  const [resendStatus, setResendStatus] = useState<{ id: string; message: string } | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Filter options
  const distinctDepartments = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => { if (r.department) set.add(r.department.trim()); });
    return Array.from(set).sort();
  }, [records]);

  const distinctWorkTypes = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => { if (r.workType) set.add(r.workType.trim()); });
    return Array.from(set).sort();
  }, [records]);

  // Filtered dataset
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const q = searchTerm.toLowerCase();
      const matchSearch =
        r.name.toLowerCase().includes(q) ||
        r.company.toLowerCase().includes(q) ||
        r.phone.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q) ||
        r.workType.toLowerCase().includes(q) ||
        (r.licensePlate && r.licensePlate.toLowerCase().includes(q)) ||
        r.equipmentHandled?.some(eq => eq.toLowerCase().includes(q));

      const matchWorkType = workTypeFilter === 'all' || r.workType === workTypeFilter;
      const matchDept = departmentFilter === 'all' || r.department === departmentFilter;

      let matchRetention = true;
      if (retentionFilter === 'active') matchRetention = !r.isImageExpired;
      if (retentionFilter === 'expired') matchRetention = !!r.isImageExpired;

      return matchSearch && matchWorkType && matchDept && matchRetention;
    });
  }, [records, searchTerm, workTypeFilter, departmentFilter, retentionFilter]);

  // Paginated records
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage]);

  const handleResendTelegram = async (record: VisitorRecord) => {
    setResendStatus({ id: record.id, message: 'กำลังส่ง...' });
    const msg = formatVisitorTelegramMessage(record);
    const result = await sendTelegramNotification(msg);
    if (result.success) {
      setResendStatus({ id: record.id, message: 'ส่งแล้ว ✅' });
    } else {
      setResendStatus({ id: record.id, message: 'ไม่สำเร็จ ❌' });
    }
    setTimeout(() => setResendStatus(null), 3000);
  };

  const handleExportCSV = () => {
    const headers = ['ประทับเวลา', 'ชื่อ-นามสกุล', 'บริษัท', 'เบอร์โทร', 'แผนกที่เข้าติดต่อ', 'ลักษณะงาน', 'รายละเอียดงาน', 'หมายเหตุ', 'จำนวนผู้ติดต่อ', 'ยานพาหนะ', 'เลขทะเบียน', 'เครื่องมือแพทย์', 'สถานะรูปภาพบัตร'];
    const rows = filteredRecords.map(r => [
      `"${r.timestamp}"`,
      `"${r.name}"`,
      `"${r.company}"`,
      `"${cleanPhoneNumber(r.phone)}"`,
      `"${r.department}"`,
      `"${r.workType}"`,
      `"${r.workDetails || '-'}"`,
      `"${r.notes || '-'}"`,
      r.visitorCount,
      `"${r.vehicleType || '-'}"`,
      `"${r.licensePlate || '-'}"`,
      `"${(r.equipmentHandled || []).join('; ')}"`,
      `"${r.isImageExpired ? 'รูปภาพลบแล้ว (เกิน 5 วัน)' : 'รูปภาพยังอยู่'}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BME_Visitor_Logs_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // If not admin, protect visitor logs with admin lock screen
  if (!isAdmin) {
    return (
      <div id="visitor-logs-locked-view" className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 text-center">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-200 shadow-2xs">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
            สงวนสิทธิ์เฉพาะผู้ดูแลระบบ (Admin Only)
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto mb-6">
            หน้าประวัติการเข้าปฏิบัติงาน, ทะเบียนรถ, รูปถ่ายบัตร และการส่งออกข้อมูล เป็นข้อมูลส่วนบุคคล (PDPA) ที่อนุญาตให้เฉพาะเจ้าหน้าที่แผนกวิศวกรรมการแพทย์เข้าดูเท่านั้น
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-md mx-auto mb-6 text-xs text-slate-700 text-left space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-blue-700">
              <ShieldAlert className="w-4 h-4 text-blue-600" />
              <span>การคุ้มครองข้อมูลส่วนบุคคล (PDPA)</span>
            </div>
            <p className="text-slate-600">
              บุคคลทั่วไปสามารถลงทะเบียนเข้าปฏิบัติงานและดูแดชบอร์ดสรุปภาพรวมได้ กรุณายืนยันตัวตนด้วยรหัสผ่านผู้ดูแลระบบเพื่อเข้าถึงประวัติโดยละเอียด
            </p>
          </div>

          <button
            onClick={onOpenAdminAuth}
            className="py-2.5 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span>เข้าสู่ระบบด้วยรหัสผ่าน Admin</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="visitor-logs-table-view" className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">

      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            ประวัติการเข้าปฏิบัติงาน ({records.length} รายการ)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            ค้นหา ตรวจสอบยานพาหนะ ตรวจสอบรูปบัตรแลก และสถานะการลบรูปภาพอัตโนมัติ 5 วัน (PDPA)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="export-logs-csv-btn"
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>ส่งออก CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <input
              id="search-logs-input"
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="ค้นหาชื่อ, บริษัท, ทะเบียนรถ, แผนก..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:outline-none text-slate-900 transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          {/* Department Filter */}
          <div>
            <select
              id="filter-log-dept-select"
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:outline-none bg-white text-slate-900 transition-all"
            >
              <option value="all">ทุกแผนกที่เข้าติดต่อ ({distinctDepartments.length})</option>
              {distinctDepartments.map((dept, idx) => (
                <option key={idx} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Work Type Filter */}
          <div>
            <select
              id="filter-log-worktype-select"
              value={workTypeFilter}
              onChange={(e) => {
                setWorkTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:outline-none bg-white text-slate-900 transition-all"
            >
              <option value="all">ทุกลักษณะงาน</option>
              {distinctWorkTypes.map((wt, idx) => (
                <option key={idx} value={wt}>{wt}</option>
              ))}
            </select>
          </div>

          {/* Retention 5-day filter */}
          <div>
            <select
              id="filter-retention-select"
              value={retentionFilter}
              onChange={(e) => {
                setRetentionFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:outline-none bg-white text-slate-900 transition-all"
            >
              <option value="all">ทุกสถานะรูปถ่าย (PDPA 5 วัน)</option>
              <option value="active">รูปถ่ายยังไม่หมดอายุ (&lt; 5 วัน)</option>
              <option value="expired">รูปถ่ายหมดอายุแล้ว (ลบอัตโนมัติ)</option>
            </select>
          </div>
        </div>

        {/* Counter summary */}
        <div className="flex justify-between items-center pt-2 text-xs text-slate-500 border-t border-slate-100">
          <span>
            พบข้อมูล <b>{filteredRecords.length}</b> รายการ (หน้า {currentPage} / {totalPages})
          </span>
          {(searchTerm || workTypeFilter !== 'all' || departmentFilter !== 'all' || retentionFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setWorkTypeFilter('all');
                setDepartmentFilter('all');
                setRetentionFilter('all');
                setCurrentPage(1);
              }}
              className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
            >
              ล้างตัวกรอง
            </button>
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">วันเวลา / ผู้ติดต่อ</th>
                <th className="py-3 px-4">บริษัท / เบอร์โทร</th>
                <th className="py-3 px-4">แผนกที่เข้าติดต่อ</th>
                <th className="py-3 px-4">ลักษณะงาน & เครื่องมือ</th>
                <th className="py-3 px-4">ยานพาหนะ & ทะเบียน</th>
                <th className="py-3 px-4 text-center">รูปบัตร (PDPA 5 วัน)</th>
                <th className="py-3 px-4 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((r) => {
                  const daysLeft = getDaysRemaining(r);
                  const isExpired = r.isImageExpired || daysLeft === 0;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      {/* Timestamp & Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-xs">{r.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">{r.timestamp}</div>
                        {r.visitorCount > 1 && (
                          <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium">
                            {r.visitorCount} ท่าน
                          </span>
                        )}
                      </td>

                      {/* Company & Phone */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{r.company}</div>
                        {r.phone && r.phone !== '-' && (
                          <a
                            href={`tel:${cleanPhoneNumber(r.phone)}`}
                            className="text-[11px] text-blue-600 hover:underline font-mono"
                          >
                            {formatPhoneNumber(r.phone)}
                          </a>
                        )}
                        {r.contactRole && (
                          <div className="text-[10px] text-indigo-700 font-medium mt-0.5">
                            {r.contactRole}
                          </div>
                        )}
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-medium text-[11px] block sm:inline-block border border-slate-200">
                          {r.department}
                        </span>
                      </td>

                      {/* Work Type & Equipment */}
                      <td className="py-3.5 px-4 space-y-1">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                            r.workType.includes('ซ่อม')
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : r.workType.includes('PM')
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : r.workType.includes('DEMO')
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {r.workType}
                        </span>

                        {r.workDetails && (
                          <div className="text-[11px] text-slate-700 bg-slate-100/80 p-1.5 rounded border border-slate-200/60 mt-1">
                            <span className="font-semibold text-slate-500 text-[10px] block">รายละเอียดงาน:</span>
                            <span>{r.workDetails}</span>
                          </div>
                        )}

                        {r.notes && (
                          <div className="text-[10px] text-slate-500 italic mt-0.5">
                            โน้ต: {r.notes}
                          </div>
                        )}

                        {r.equipmentHandled && r.equipmentHandled.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {r.equipmentHandled.slice(0, 2).map((eq, idx) => (
                              <span key={idx} className="text-[10px] text-slate-600 bg-slate-100 border border-slate-200/80 px-1.5 py-0.5 rounded truncate max-w-[140px]">
                                {eq}
                              </span>
                            ))}
                            {r.equipmentHandled.length > 2 && (
                              <span className="text-[10px] text-slate-400">+{r.equipmentHandled.length - 2}</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Vehicle & Plate */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 font-medium text-slate-800">
                          <Car className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{r.vehicleType || 'รถยนต์ส่วนบุคคล'}</span>
                        </div>
                        {r.licensePlate && r.licensePlate !== '-' && (
                          <div className="text-[11px] font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded mt-0.5 inline-block border border-slate-200">
                            {r.licensePlate}
                          </div>
                        )}
                      </td>

                      {/* Card Image & 5-Day Purge Status */}
                      <td className="py-3.5 px-4 text-center">
                        {r.cardImageUrl ? (
                          isExpired ? (
                            <div className="inline-flex flex-col items-center p-1.5 rounded-lg bg-slate-100 border border-slate-200 text-[10px] text-slate-400">
                              <ShieldAlert className="w-3.5 h-3.5 text-slate-400 mb-0.5" />
                              <span>ลบรูปแล้ว (เกิน 5 วัน)</span>
                            </div>
                          ) : (
                            <div className="inline-flex flex-col items-center">
                              <button
                                onClick={() =>
                                  setSelectedImage({
                                    url: r.cardImageUrl!,
                                    name: r.name,
                                    isExpired: false,
                                    daysLeft,
                                  })
                                }
                                className="group relative w-12 h-9 rounded overflow-hidden border border-slate-300 shadow-2xs hover:ring-2 hover:ring-blue-500 transition-all cursor-pointer"
                              >
                                <img
                                  src={r.cardImageUrl}
                                  alt="Card badge"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Eye className="w-3.5 h-3.5 text-white" />
                                </div>
                              </button>
                              <span className="text-[10px] text-blue-700 font-medium mt-0.5">
                                เหลือ {daysLeft} วัน
                              </span>
                            </div>
                          )
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">ไม่มีรูปแนบ</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Resend Telegram */}
                          <button
                            onClick={() => handleResendTelegram(r)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="ส่งแจ้งเตือน Telegram อีกครั้ง"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => {
                              if (confirm(`ต้องการลบบันทึกของ "${r.name}" หรือไม่?`)) {
                                onDeleteRecord(r.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="ลบรายการนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {resendStatus?.id === r.id && (
                          <span className="text-[10px] text-blue-600 font-semibold block mt-0.5">
                            {resendStatus.message}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 bg-slate-50 border-t border-slate-200 text-xs">
            <span className="text-slate-500">
              แสดงหน้า {currentPage} จาก {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 relative">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 mb-1">
              รูปภาพบัตรที่แลก: {selectedImage.name}
            </h3>
            <p className="text-xs text-slate-500 mb-4 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>
                นโยบาย PDPA: รูปจะถูกลบอัตโนมัติภายใน 5 วัน (เหลือเวลาอีก {selectedImage.daysLeft} วัน)
              </span>
            </p>

            <div className="rounded-lg overflow-hidden bg-slate-100 border border-slate-200 max-h-96 flex items-center justify-center">
              <img
                src={selectedImage.url}
                alt="Badge large preview"
                className="w-full h-auto object-contain max-h-96"
              />
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setSelectedImage(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
