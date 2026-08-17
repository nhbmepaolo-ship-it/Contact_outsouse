import React, { useState, useMemo } from 'react';
import {
  Building2,
  Phone,
  User,
  Wrench,
  Search,
  Plus,
  ShieldCheck,
  Lock,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Download,
  Copy,
  Check,
  Tag,
  Users,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { CompanyContact, ContactRole, EquipmentInfo } from '../types';
import { StorageService } from '../services/storageService';
import { cleanPhoneNumber, formatPhoneNumber } from '../utils/phoneFormatter';
import { groupContactsByCompany, GroupedCompany, getCanonicalCompanyName } from '../utils/companyNormalizer';

interface CompanyDirectoryViewProps {
  isAdmin: boolean;
  onOpenAdminAuth: () => void;
  equipmentList: EquipmentInfo[];
}

export const CompanyDirectoryView: React.FC<CompanyDirectoryViewProps> = ({
  isAdmin,
  onOpenAdminAuth,
  equipmentList,
}) => {
  const [contacts, setContacts] = useState<CompanyContact[]>(() =>
    StorageService.getCompanyContacts()
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<CompanyContact | null>(null);
  const [formCompany, setFormCompany] = useState('');
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState<ContactRole>('ช่าง');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formEquipments, setFormEquipments] = useState<string[]>([]);
  const [newEquipmentInput, setNewEquipmentInput] = useState('');
  const [formNotice, setFormNotice] = useState<{ type: 'success' | 'warning'; text: string } | null>(null);

  // Reload contacts from storage
  const reloadContacts = () => {
    setContacts(StorageService.getCompanyContacts());
  };

  // Group contacts by company
  const groupedCompanies = useMemo(() => {
    return groupContactsByCompany(contacts);
  }, [contacts]);

  // Distinct company list for filter dropdown
  const distinctCompanies = useMemo(() => {
    return groupedCompanies.map(g => g.companyName).sort((a, b) => a.localeCompare(b, 'th'));
  }, [groupedCompanies]);

  // Filtered Grouped Companies
  const filteredGroupedCompanies = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return groupedCompanies.filter(group => {
      // Check Company Match
      const matchCompanyFilter = companyFilter === 'all' || 
        group.companyName === companyFilter || 
        group.aliases.includes(companyFilter);

      // Check Role Match (any contact in this company has the role)
      const matchRole = roleFilter === 'all' || 
        group.contacts.some(c => c.role === roleFilter);

      // Check Search Term
      let matchSearch = true;
      if (term) {
        const matchCompName = group.companyName.toLowerCase().includes(term) ||
          group.aliases.some(a => a.toLowerCase().includes(term));

        const matchContacts = group.contacts.some(c =>
          c.contactName.toLowerCase().includes(term) ||
          c.phone.toLowerCase().includes(term) ||
          (c.equipmentList || []).some(eq => eq.toLowerCase().includes(term))
        );

        const matchEquipments = group.allEquipments.some(eq => eq.toLowerCase().includes(term));

        matchSearch = matchCompName || matchContacts || matchEquipments;
      }

      return matchCompanyFilter && matchRole && matchSearch;
    });
  }, [groupedCompanies, searchTerm, roleFilter, companyFilter]);

  // Total unique contacts count currently visible
  const totalVisibleStaff = useMemo(() => {
    return filteredGroupedCompanies.reduce((acc, g) => acc + g.contacts.length, 0);
  }, [filteredGroupedCompanies]);

  const handleCopyPhone = (phone: string) => {
    const cleaned = cleanPhoneNumber(phone);
    navigator.clipboard.writeText(cleaned);
    setCopiedPhone(cleaned);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  const handleOpenAdd = (presetCompany?: string) => {
    setEditingContact(null);
    setFormCompany(presetCompany || '');
    setFormName('');
    setFormRole('ช่าง');
    setFormPhone('');
    setFormEmail('');
    setFormEquipments([]);
    setFormNotice(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (contact: CompanyContact) => {
    setEditingContact(contact);
    setFormCompany(contact.companyName);
    setFormName(contact.contactName);
    setFormRole(contact.role);
    setFormPhone(contact.phone);
    setFormEmail(contact.email || '');
    setFormEquipments([...(contact.equipmentList || [])]);
    setFormNotice(null);
    setIsModalOpen(true);
  };

  const handleAddEquipmentTag = (eq: string) => {
    const clean = eq.trim();
    if (clean && !formEquipments.includes(clean)) {
      setFormEquipments(prev => [...prev, clean]);
      setNewEquipmentInput('');
    }
  };

  const handleRemoveEquipmentTag = (eq: string) => {
    setFormEquipments(prev => prev.filter(e => e !== eq));
  };

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCompany.trim() || !formName.trim()) {
      alert('กรุณากรอกชื่อบริษัทและชื่อผู้ติดต่อ');
      return;
    }

    const payload = {
      id: editingContact?.id,
      companyName: formCompany.trim(),
      contactName: formName.trim(),
      role: formRole,
      phone: cleanPhoneNumber(formPhone.trim()),
      email: formEmail.trim() || undefined,
      equipmentList: formEquipments,
      departmentsCovered: editingContact?.departmentsCovered || [],
      visitCount: editingContact?.visitCount || 1,
      lastVisit: editingContact?.lastVisit || new Date().toLocaleString('th-TH'),
    };

    const result = StorageService.upsertCompanyContact(payload);
    reloadContacts();

    if (result.isDuplicateEquipment) {
      setFormNotice({
        type: 'warning',
        text: 'ผู้ติดต่อรายนี้มีข้อมูลในระบบและดูแลเครื่องมือนี้อยู่แล้ว (อัปเดตข้อมูลทั่วไปเรียบร้อย ไม่สร้างรายการซ้ำ)',
      });
      setTimeout(() => {
        setIsModalOpen(false);
      }, 1500);
    } else {
      setFormNotice({
        type: 'success',
        text: result.message,
      });
      setTimeout(() => {
        setIsModalOpen(false);
      }, 1000);
    }
  };

  const handleDeleteContact = (id: string, name: string, company: string) => {
    if (confirm(`คุณต้องการลบผู้ติดต่อ "${name}" (${company}) ออกจากสมุดโทรศัพท์หรือไม่?`)) {
      StorageService.deleteCompanyContact(id);
      reloadContacts();
    }
  };

  const handleExportCSV = () => {
    const headers = ['บริษัท', 'ชื่อผู้ติดต่อ', 'ตำแหน่ง/บทบาท', 'เบอร์โทร', 'เครื่องมือแพทย์ที่ดูแล', 'แผนกที่ดูแล', 'จำนวนครั้งที่เข้าพบ', 'เข้าพบล่าสุด'];
    const rows: string[][] = [];

    filteredGroupedCompanies.forEach(g => {
      g.contacts.forEach(c => {
        rows.push([
          `"${g.companyName}"`,
          `"${c.contactName}"`,
          `"${c.role}"`,
          `"${c.phone}"`,
          `"${(c.equipmentList || []).join('; ')}"`,
          `"${(c.departmentsCovered || []).join('; ')}"`,
          String(c.visitCount || 1),
          `"${c.lastVisit || '-'}"`
        ]);
      });
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BME_Company_Contacts_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // If not Admin, show Locked Screen
  if (!isAdmin) {
    return (
      <div id="company-directory-locked" className="max-w-2xl mx-auto py-12 px-4 text-center">
        <div className="bg-white rounded-xl p-8 sm:p-10 shadow-sm border border-slate-200">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">
            พื้นที่เฉพาะสิทธิ์ Admin
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto mb-6 leading-relaxed">
            หน้า <b>"สมุดติดต่อบริษัทคู่ค้า & ช่างเครื่องมือแพทย์"</b> กำหนดให้ดูและแก้ไขได้เฉพาะเจ้าหน้าที่ที่มีสิทธิ์ Admin เพื่อความปลอดภัยของข้อมูล
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-md mx-auto mb-6 text-xs text-slate-700 text-left space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-blue-700">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>การรักษาความปลอดภัยข้อมูลผู้ติดต่อ</span>
            </div>
            <p className="text-slate-600">
              กรุณาเข้าสู่ระบบด้วยรหัสผ่านผู้ดูแลระบบ (Admin) เพื่อดูเบอร์โทรศัพท์และข้อมูลผู้ติดต่อบริษัทคู่ค้า
            </p>
          </div>

          <button
            id="unlock-admin-for-contacts-btn"
            onClick={onOpenAdminAuth}
            className="py-2.5 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>เข้าสู่ระบบด้วยรหัสผ่าน Admin</span>
          </button>
        </div>
      </div>
    );
  }

  // Role badge helper
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ผู้แทน':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'สเปเชียลลิสต์/ผู้เชี่ยวชาญ':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'เจ้าหน้าที่ส่งสินค้า':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'วิศวกรบริการ':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  return (
    <div id="company-directory-view" className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              สมุดติดต่อบริษัทคู่ค้า & ช่างเครื่องมือแพทย์
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin Access</span>
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            จัดกลุ่มตามบริษัทคู่ค้าอัตโนมัติ รวมผู้ติดต่อ ช่าง และสเปเชียลลิสต์ในแต่ละบริษัทไว้ในกรอบเดียวกันอย่างเป็นระเบียบ
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="export-contacts-csv-btn"
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>ส่งออก CSV</span>
          </button>
          <button
            id="add-company-contact-btn"
            onClick={() => handleOpenAdd()}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มผู้ติดต่อใหม่</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="sm:col-span-2 relative">
            <input
              id="search-contacts-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อ, บริษัท, เบอร์โทร หรือเครื่องมือแพทย์..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-xs text-slate-900 transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          {/* Role Filter */}
          <div>
            <select
              id="filter-contact-role-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-xs text-slate-900 bg-white transition-all"
            >
              <option value="all">ทุกตำแหน่ง / บทบาท</option>
              <option value="ช่าง">ช่าง / วิศวกรบริการ</option>
              <option value="ผู้แทน">ผู้แทน (Sales Rep)</option>
              <option value="สเปเชียลลิสต์/ผู้เชี่ยวชาญ">สเปเชียลลิสต์ (Specialist)</option>
              <option value="เจ้าหน้าที่ส่งสินค้า">เจ้าหน้าที่ส่งสินค้า</option>
              <option value="อื่นๆ">อื่นๆ</option>
            </select>
          </div>

          {/* Company Filter */}
          <div>
            <select
              id="filter-contact-company-select"
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-xs text-slate-900 bg-white transition-all"
            >
              <option value="all">ทุกบริษัทคู่ค้า ({distinctCompanies.length} บริษัท)</option>
              {distinctCompanies.map((c, i) => (
                <option key={i} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Count Summary */}
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
          <span>
            แสดงผล <b>{filteredGroupedCompanies.length}</b> บริษัท (รวม <b>{totalVisibleStaff}</b> ผู้ติดต่อ) จากทั้งหมด <b>{groupedCompanies.length}</b> บริษัท
          </span>
          {(searchTerm || roleFilter !== 'all' || companyFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setRoleFilter('all');
                setCompanyFilter('all');
              }}
              className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          )}
        </div>
      </div>

      {/* Company Cards Grid (Grouped by Company) */}
      {filteredGroupedCompanies.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200 shadow-sm">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">ไม่พบข้อมูลบริษัทหรือผู้ติดต่อที่ตรงกับเงื่อนไข</h3>
          <p className="text-xs text-slate-500 mt-1">ลองเปลี่ยนคำค้นหาหรือตัวกรองบริษัท</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGroupedCompanies.map((group, groupIdx) => {
            return (
              <div
                key={group.id || `grp-company-${groupIdx}`}
                className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
              >
                {/* 1. Company Card Header */}
                <div className="p-4 border-b border-slate-100 bg-slate-50/80">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 text-sm leading-snug truncate" title={group.companyName}>
                          {group.companyName}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                          <Users className="w-3.5 h-3.5 text-blue-600" />
                          <span className="font-semibold text-slate-700">
                            {group.contacts.length} ผู้ติดต่อ / เจ้าหน้าที่
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenAdd(group.companyName)}
                      className="shrink-0 text-[11px] text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded-md border border-blue-200 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      title="เพิ่มผู้ติดต่อในบริษัทนี้"
                    >
                      <Plus className="w-3 h-3" />
                      <span>เพิ่มคน</span>
                    </button>
                  </div>
                </div>

                {/* 2. Contacts List inside this Company Frame */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2.5">
                    {group.contacts.map((c, cIdx) => (
                      <div
                        key={c.id ? `${group.id}-${c.id}-${cIdx}` : `${group.id}-staff-${cIdx}`}
                        className="bg-slate-50/90 rounded-lg p-3 border border-slate-200/90 hover:border-blue-200 transition-colors"
                      >
                        {/* Person Name & Role & Actions */}
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="font-bold text-xs text-slate-900 truncate">
                              {c.contactName}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded border font-semibold shrink-0 ${getRoleBadge(c.role)}`}>
                              {c.role}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleOpenEdit(c)}
                              className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-white transition-colors cursor-pointer"
                              title="แก้ไขข้อมูลผู้ติดต่อนี้"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteContact(c.id, c.contactName, group.companyName)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-white transition-colors cursor-pointer"
                              title="ลบผู้ติดต่อนี้"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Phone Number with Click-to-Call & Copy */}
                        {c.phone && c.phone !== '-' ? (
                          <div className="flex items-center justify-between text-xs bg-white px-2.5 py-1.5 rounded border border-slate-200">
                            <a
                              href={`tel:${cleanPhoneNumber(c.phone)}`}
                              className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-bold font-mono hover:underline"
                            >
                              <Phone className="w-3 h-3" />
                              <span>{formatPhoneNumber(c.phone)}</span>
                            </a>
                            <button
                              onClick={() => handleCopyPhone(c.phone)}
                              className="text-slate-400 hover:text-slate-700 text-[10px] flex items-center gap-1 cursor-pointer"
                              title="คัดลอกเบอร์โทร"
                            >
                              {copiedPhone === cleanPhoneNumber(c.phone) ? (
                                <span className="text-blue-600 font-semibold flex items-center gap-0.5">
                                  <Check className="w-3 h-3" /> คัดลอกแล้ว
                                </span>
                              ) : (
                                <span className="flex items-center gap-0.5">
                                  <Copy className="w-3 h-3" /> คัดลอก
                                </span>
                              )}
                            </button>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 italic">
                            ไม่ได้ระบุเบอร์โทรศัพท์
                          </div>
                        )}

                        {/* Individual Equipment handled (if contact has specific items) */}
                        {c.equipmentList && c.equipmentList.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {c.equipmentList.map((eq, i) => (
                              <span
                                key={`${c.id || cIdx}-eq-${i}-${eq}`}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 font-medium"
                              >
                                {eq}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Company Overall Equipment Handled */}
                  {group.allEquipments.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                        เครื่องมือแพทย์ที่ดูแลรวม ({group.allEquipments.length} รายการ):
                      </span>
                      <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                        {group.allEquipments.map((eq, idx) => (
                          <span
                            key={`${group.id}-all-eq-${idx}-${eq}`}
                            className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-medium"
                          >
                            <Tag className="w-2.5 h-2.5 text-blue-600" />
                            <span>{eq}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Company Card Footer */}
                <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    เข้าพบรวม: <b className="font-mono text-slate-900">{group.totalVisits}</b> ครั้ง
                  </span>
                  <span className="truncate font-mono" title={group.lastVisit}>
                    ล่าสุด: {group.lastVisit?.split(',')[0] || '-'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Contact Modal */}
      {isModalOpen && (
        <div id="contact-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1 tracking-tight">
              {editingContact ? 'แก้ไขข้อมูลผู้ติดต่อบริษัท' : 'เพิ่มผู้ติดต่อบริษัทคู่ค้า & ช่าง'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              หากเป็นบริษัทเดียวกัน ผู้ติดต่อรายนี้จะถูกจัดกลุ่มเข้าไปอยู่ในกรอบของบริษัทนั้นโดยอัตโนมัติ
            </p>

            {formNotice && (
              <div
                className={`p-3 rounded-lg mb-4 text-xs flex items-center gap-2 ${
                  formNotice.type === 'success'
                    ? 'bg-blue-50 text-blue-800 border border-blue-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                {formNotice.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                )}
                <span>{formNotice.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveContact} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อบริษัท / ตัวแทนจำหน่าย <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  list="directory-sheet-companies"
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                  placeholder="พิมพ์หรือเลือก เช่น ดับเบิ้ลยู เทค, โซวิค, Thai GL, Philips..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:outline-none transition-all"
                />
                <datalist id="directory-sheet-companies">
                  {StorageService.getSheetCompanies().map((comp, idx) => (
                    <option key={idx} value={comp} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ชื่อ-นามสกุล ผู้ติดต่อ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="เช่น สมศักดิ์ ใจดี"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ตำแหน่ง / บทบาท
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as ContactRole)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:outline-none bg-white transition-all"
                  >
                    <option value="ช่าง">ช่าง / วิศวกรบริการ</option>
                    <option value="ผู้แทน">ผู้แทน (Sales Rep)</option>
                    <option value="สเปเชียลลิสต์/ผู้เชี่ยวชาญ">สเปเชียลลิสต์ (Specialist)</option>
                    <option value="เจ้าหน้าที่ส่งสินค้า">เจ้าหน้าที่ส่งมอบสินค้า</option>
                    <option value="อื่นๆ">อื่นๆ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เบอร์โทรศัพท์
                </label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="เช่น 081-234-5678"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:outline-none font-mono transition-all"
                />
              </div>

              {/* Equipment Multi-tag Management */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เครื่องมือแพทย์ที่ดูแล (ระบุได้หลายเครื่องมือ)
                </label>

                {/* Tag list */}
                {formEquipments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg mb-2">
                    {formEquipments.map((eq, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-800 text-xs font-medium border border-blue-200"
                      >
                        <span>{eq}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveEquipmentTag(eq)}
                          className="text-blue-800 hover:text-red-600 font-bold cursor-pointer ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Add Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newEquipmentInput}
                    onChange={(e) => setNewEquipmentInput(e.target.value)}
                    placeholder="พิมพ์ชื่อเครื่องมือ เช่น กล้องส่องตรวจ, X-Ray, CathLab..."
                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:outline-none transition-all"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddEquipmentTag(newEquipmentInput);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleAddEquipmentTag(newEquipmentInput)}
                    className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    + เพิ่ม
                  </button>
                </div>

                {/* Quick equipment suggestions */}
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="text-[10px] text-slate-400 py-0.5">แนะนำ:</span>
                  {equipmentList.slice(0, 8).map((eq) => (
                    <button
                      key={eq.id}
                      type="button"
                      onClick={() => handleAddEquipmentTag(eq.name)}
                      className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 border border-slate-200 cursor-pointer"
                    >
                      + {eq.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  {editingContact ? 'บันทึกการแก้ไข' : 'บันทึกผู้ติดต่อ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
