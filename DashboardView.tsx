import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Wrench,
  Sparkles,
  Building2,
  Users,
  ShieldCheck,
  Calendar,
  Layers,
  Car,
  Clock,
  Download,
  RefreshCw,
  Cpu,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';
import { VisitorRecord } from '../types';

interface DashboardViewProps {
  records: VisitorRecord[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({ records }) => {
  const [timeFilter, setTimeFilter] = useState<'all' | '2026' | '2025' | 'recent30' | 'recent7'>('all');
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  // Filter records based on selected time filter
  const filteredRecords = useMemo(() => {
    if (timeFilter === 'all') return records;

    const now = new Date();
    return records.filter(r => {
      if (timeFilter === '2026') return r.timestamp.includes('/2026') || (r.createdDate && r.createdDate.startsWith('2026'));
      if (timeFilter === '2025') return r.timestamp.includes('/2025') || (r.createdDate && r.createdDate.startsWith('2025'));

      const rDate = new Date(r.createdDate || r.timestamp);
      if (isNaN(rDate.getTime())) return true;

      const diffDays = (now.getTime() - rDate.getTime()) / (1000 * 60 * 60 * 24);
      if (timeFilter === 'recent30') return diffDays <= 30;
      if (timeFilter === 'recent7') return diffDays <= 7;

      return true;
    });
  }, [records, timeFilter]);

  // Statistics Computations
  const stats = useMemo(() => {
    const total = filteredRecords.length;
    let repairs = 0;
    let pm = 0;
    let demo = 0;
    let training = 0;
    let install = 0;
    let others = 0;

    const deptMap: Record<string, number> = {};
    const compMap: Record<string, number> = {};
    const vehicleMap: Record<string, number> = {
      'รถยนต์ส่วนบุคคล': 0,
      'จักรยานยนต์': 0,
      'รถบรรทุก 4 ล้อ': 0,
      'รถบรรทุก 6 ล้อ': 0,
      'รถบรรทุก 10 ล้อ': 0,
      'ไม่มีพาหนะ/เดินเท้า': 0,
    };
    const monthMap: Record<string, number> = {};

    filteredRecords.forEach(r => {
      // Work type
      const wt = (r.workType || '').toLowerCase();
      if (wt.includes('ซ่อม') || wt.includes('repair')) repairs++;
      else if (wt.includes('pm')) pm++;
      else if (wt.includes('demo')) demo++;
      else if (wt.includes('training') || wt.includes('สอน')) training++;
      else if (wt.includes('ติดตั้ง') || wt.includes('install')) install++;
      else others++;

      // Department
      const dept = r.department || 'ไม่ระบุ';
      deptMap[dept] = (deptMap[dept] || 0) + (r.visitorCount || 1);

      // Company
      const comp = r.company || 'ไม่ระบุ';
      compMap[comp] = (compMap[comp] || 0) + 1;

      // Vehicle
      const vType = r.vehicleType || 'รถยนต์ส่วนบุคคล';
      vehicleMap[vType] = (vehicleMap[vType] || 0) + 1;

      // Month extraction for trend
      const match = r.timestamp.match(/\/(\d{1,2})\/(\d{4})/);
      if (match) {
        const key = `${match[1].padStart(2, '0')}/${match[2]}`;
        monthMap[key] = (monthMap[key] || 0) + 1;
      }
    });

    const topDepts = Object.entries(deptMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const topComps = Object.entries(compMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const workBreakdown = [
      { name: 'งานซ่อม (Repair)', count: repairs, color: 'bg-rose-500', text: 'text-rose-700', bg: 'bg-rose-50' },
      { name: 'งาน PM บำรุงรักษา', count: pm, color: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' },
      { name: 'สาธิต DEMO', count: demo, color: 'bg-purple-500', text: 'text-purple-700', bg: 'bg-purple-50' },
      { name: 'Training สอนใช้งาน', count: training, color: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
      { name: 'ติดตั้งเครื่องใหม่', count: install, color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
      { name: 'อื่นๆ / ส่งมอบ / ตรวจรับ', count: others, color: 'bg-slate-500', text: 'text-slate-700', bg: 'bg-slate-50' },
    ].filter(w => w.count > 0);

    return {
      total,
      repairs,
      pm,
      demo,
      training,
      install,
      others,
      uniqueCompanies: Object.keys(compMap).length,
      topDepts,
      topComps,
      workBreakdown,
      vehicleMap,
    };
  }, [filteredRecords]);

  // Handle AI Report Generation
  const handleGenerateAiReport = async () => {
    setIsLoadingAi(true);
    try {
      const summaryPayload = {
        totalVisits: stats.total,
        repairs: stats.repairs,
        pm: stats.pm,
        demo: stats.demo,
        training: stats.training,
        topDepartment: stats.topDepts.map(d => `${d.name} (${d.count})`).join(', '),
        topCompany: stats.topComps.map(c => `${c.name} (${c.count})`).join(', '),
      };

      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordsSummary: summaryPayload,
          analysisType: 'executive_overview',
          prompt: 'ช่วยวิเคราะห์และสรุปแนวโน้มการเข้าปฏิบัติงานของช่างและบริษัทเครื่องมือแพทย์ พร้อมข้อเสนอแนะเชิงบริหารสำหรับทีม BME',
        }),
      });

      const data = await res.json();
      if (data.analysis) {
        setAiReport(data.analysis);
      }
    } catch (e) {
      console.error(e);
      setAiReport('ไม่สามารถเชื่อมต่อ AI ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoadingAi(false);
    }
  };

  return (
    <div id="dashboard-view" className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">

      {/* Header & Date Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            แดชบอร์ดสรุปรายงาน & วิเคราะห์ข้อมูล
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            ภาพรวมสถิติการเข้าปฏิบัติงานของช่าง ผู้แทน และคู่ค้าเครื่องมือแพทย์
          </p>
        </div>

        {/* Time Filter Pill Buttons */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto overflow-x-auto max-w-full">
          <button
            onClick={() => setTimeFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              timeFilter === 'all' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ทั้งหมด ({records.length})
          </button>
          <button
            onClick={() => setTimeFilter('2026')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              timeFilter === '2026' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ปี 2026
          </button>
          <button
            onClick={() => setTimeFilter('2025')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              timeFilter === '2025' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ปี 2025
          </button>
          <button
            onClick={() => setTimeFilter('recent30')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              timeFilter === 'recent30' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            30 วันล่าสุด
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Visits */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              ผู้มาติดต่อทั้งหมด
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{stats.total}</span>
            <span className="text-xs text-slate-500 ml-1.5 font-medium">รายการ</span>
          </div>
          <div className="mt-2 text-[11px] text-blue-700 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>จากคู่ค้า {stats.uniqueCompanies} บริษัท</span>
          </div>
        </div>

        {/* Repair Jobs */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              งานซ่อมบำรุง (Repair)
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-rose-600 tracking-tight">{stats.repairs}</span>
            <span className="text-xs text-slate-500 ml-1.5 font-medium">ครั้ง</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 font-medium">
            คิดเป็น {stats.total > 0 ? Math.round((stats.repairs / stats.total) * 100) : 0}% ของงานทั้งหมด
          </div>
        </div>

        {/* PM Preventive Maintenance */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              งานบำรุงรักษา PM
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-emerald-600 tracking-tight">{stats.pm}</span>
            <span className="text-xs text-slate-500 ml-1.5 font-medium">รอบ</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 font-medium">
            บำรุงรักษาเชิงป้องกันตามรอบ
          </div>
        </div>

        {/* DEMO & Training */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              DEMO & Training
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-indigo-600 tracking-tight">{stats.demo + stats.training}</span>
            <span className="text-xs text-slate-500 ml-1.5 font-medium">ครั้ง</span>
          </div>
          <div className="mt-2 text-[11px] text-indigo-700 font-semibold">
            สาธิต {stats.demo} / สอนใช้งาน {stats.training}
          </div>
        </div>
      </div>

      {/* AI Smart Analysis Section */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm border border-slate-800 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span>วิเคราะห์ข้อมูลและสรุปรายงานอัจฉริยะ (AI BME Insight)</span>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase">
                  Gemini 2.5 Flash
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                วิเคราะห์ความถี่งานซ่อม ความสัมพันธ์ของเครื่องมือ และข้อเสนอแนะเชิงบริหาร
              </p>
            </div>
          </div>

          <button
            id="trigger-ai-analysis-btn"
            onClick={handleGenerateAiReport}
            disabled={isLoadingAi}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-all flex items-center gap-2 disabled:opacity-50 self-start sm:self-auto cursor-pointer"
          >
            {isLoadingAi ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>กำลังวิเคราะห์ข้อมูล...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>สร้างบทวิเคราะห์ AI สรุปรายงาน</span>
              </>
            )}
          </button>
        </div>

        {/* AI Report Content Box */}
        {aiReport ? (
          <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-5 text-xs text-slate-200 leading-relaxed space-y-3 whitespace-pre-line animate-in fade-in duration-200">
            {aiReport}
          </div>
        ) : (
          <div className="bg-slate-800/50 rounded-xl p-4 text-xs text-slate-300 border border-slate-700/80 flex items-center justify-between">
            <span>
              💡 คลิกปุ่ม <b>"สร้างบทวิเคราะห์ AI สรุปรายงาน"</b> เพื่อให้ระบบประมวลผลข้อมูล {stats.total} รายการ และสรุปข้อเสนอแนะเชิงลึก
            </span>
          </div>
        )}
      </div>

      {/* Visual Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Chart 1: Work Type Breakdown */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Wrench className="w-4 h-4 text-blue-600" />
              <span>สัดส่วนลักษณะงานที่เข้าปฏิบัติ (Work Types)</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">รวม {stats.total} งาน</span>
          </div>

          <div className="space-y-3 pt-1">
            {stats.workBreakdown.map((item, idx) => {
              const percentage = stats.total > 0 ? Math.round((item.count / stats.total) * 100) : 0;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-700">{item.name}</span>
                    <span className="text-slate-900 font-bold font-mono">{item.count} งาน ({percentage}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 2: Top Visited Departments */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>แผนกที่มีการเข้าปฏิบัติงานสูงสุด (Top Departments)</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">ตามจำนวนคน</span>
          </div>

          <div className="space-y-2.5 pt-1">
            {stats.topDepts.map((dept, idx) => {
              const maxCount = stats.topDepts[0]?.count || 1;
              const widthPct = Math.round((dept.count / maxCount) * 100);
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700 truncate max-w-[240px] sm:max-w-xs">{dept.name}</span>
                    <span className="font-bold text-slate-900 font-mono">{dept.count} ท่าน</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${widthPct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 3: Top Vendor Companies */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>บริษัทคู่ค้าที่มีการเข้าบริการสูงสุด (Top Contractors)</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">จำนวนครั้ง</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {stats.topComps.map((comp, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="w-5 h-5 rounded bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-semibold text-slate-800 truncate">{comp.name}</span>
                </div>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 shrink-0 font-mono">
                  {comp.count} ครั้ง
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 4: Vehicle & Transport Types */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Car className="w-4 h-4 text-blue-600" />
              <span>ประเภทยานพาหนะที่เข้าพื้นที่โรงพยาบาล (Vehicles)</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">ระเบียบ รปภ.</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
            {Object.entries(stats.vehicleMap).map(([vType, count], i) => (
              <div key={i} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
                <span className="text-[11px] font-medium text-slate-600 block truncate">{vType}</span>
                <span className="text-xl font-extrabold text-slate-900 mt-1 block font-mono">{count}</span>
                <span className="text-[10px] text-slate-400">คัน</span>
              </div>
            ))}
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center justify-between">
            <span className="font-medium">🔒 นโยบาย PDPA:</span>
            <span className="text-blue-700 font-semibold">ภาพบัตรแลกลบอัตโนมัติ 5 วัน</span>
          </div>
        </div>

      </div>

    </div>
  );
};
