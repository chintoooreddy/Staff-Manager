/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, SlidersHorizontal, Trash2, Edit3, ClipboardList, Calendar, Bookmark, 
  HeartHandshake, PhoneCall, CheckCircle2, RefreshCw, PhoneForwarded, 
  MessageSquare, Download, X, AlertCircle, FileSpreadsheet, Save, ChevronDown, Clock, UserCheck
} from 'lucide-react';
import Pagination from './Pagination';
import { CallRecord, CallStatus, StaffMember, ServiceItem } from '../types';

interface CallManagementProps {
  currentEmail: string;
  currentUserRole?: string;
  currentUserFullName?: string;
  callList: CallRecord[];
  staffList: StaffMember[];
  services: ServiceItem[];
  onAddCall: () => void;
  onEditCall: (record: CallRecord) => void;
  onDeleteCall: (id: string) => void;
  onSaveCall: (callData: Omit<CallRecord, 'id' | 'createdDate'> & { id?: string }) => void;
  onCloseLead: (leadData: { callRecordId: string; clientName: string; clientNumber: string; takenService: string; amountPaid: number; paidBy: string; panelNameUrl?: string; panelUsername?: string; panelPassword?: string }) => void;
}

export default function CallManagement({
  currentEmail,
  currentUserRole,
  currentUserFullName,
  callList,
  staffList,
  services,
  onAddCall,
  onEditCall,
  onDeleteCall,
  onSaveCall,
  onCloseLead,
}: CallManagementProps) {
  // Define visible calls based on role
  const visibleCalls = currentUserRole === 'User'
    ? callList.filter((c) => (c.loggedBy || '').toLowerCase() === (currentUserFullName || '').toLowerCase())
    : callList;

  // Sub-module tab state: 'daily' (Daily Calls) or 'followup' (Follow Up Calls)
  const [activeSubTab, setActiveSubTab] = useState<'daily' | 'followup'>('daily');

  // Daily Calls module states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [staffFilter, setStaffFilter] = useState<string>('All');
  const [dailyStartDate, setDailyStartDate] = useState<string>('');
  const [dailyEndDate, setDailyEndDate] = useState<string>('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Export module state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportRange, setExportRange] = useState<'Today' | 'Week' | 'Month' | 'Custom'>('Today');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [customFilename, setCustomFilename] = useState('');
  const [exportError, setExportError] = useState('');

  // Follow-up sub-module states
  const getLocalTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [followupFromDate, setFollowupFromDate] = useState<string>(getLocalTodayDateString());
  const [followupToDate, setFollowupToDate] = useState<string>(getLocalTodayDateString());
  const [followupViewMode, setFollowupViewMode] = useState<'custom_range' | 'all'>('custom_range');

  // Pagination states
  const [dailyPage, setDailyPage] = useState<number>(1);
  const [dailyPageSize, setDailyPageSize] = useState<number>(25);
  const [followupPage, setFollowupPage] = useState<number>(1);
  const [followupPageSize, setFollowupPageSize] = useState<number>(12);

  // Follow-up Quick-Update state
  const [updatingFollowupRecord, setUpdatingFollowupRecord] = useState<CallRecord | null>(null);
  const [updateStatus, setUpdateStatus] = useState<CallStatus>('Interested');
  const [updateFollowupDate, setUpdateFollowupDate] = useState<string>('');
  const [updateService, setUpdateService] = useState<string>('');
  const [updateNotes, setUpdateNotes] = useState<string>('');
  const [updateError, setUpdateError] = useState<string>('');

  // Close Lead states
  const [closingLeadRecord, setClosingLeadRecord] = useState<CallRecord | null>(null);
  const [closeLeadTab, setCloseLeadTab] = useState<'business' | 'panel'>('business');
  const [takenService, setTakenService] = useState<string>('');
  const [amountPaid, setAmountPaid] = useState<number | ''>('');
  const [paidBy, setPaidBy] = useState<string>('Cash');
  const [customPaidBy, setCustomPaidBy] = useState<string>('');
  const [panelNameUrl, setPanelNameUrl] = useState<string>('');
  const [panelUsername, setPanelUsername] = useState<string>('');
  const [panelPassword, setPanelPassword] = useState<string>('');
  const [closeLeadError, setCloseLeadError] = useState<string>('');

  // Helper to parse date string like "Jun 23, 2026" to local Date object
  const parseRecordDate = (dateStr: string): Date => {
    const cleaned = dateStr.replace(',', '').trim();
    const parts = cleaned.split(/\s+/);
    if (parts.length === 3) {
      const monthMap: { [key: string]: number } = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11,
        'January': 0, 'February': 1, 'March': 2, 'April': 3, 'June': 5,
        'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
      };
      const month = monthMap[parts[0]] !== undefined ? monthMap[parts[0]] : 0;
      const day = parseInt(parts[1], 10) || 1;
      const year = parseInt(parts[2], 10) || new Date().getFullYear();
      const d = new Date(year, month, day);
      d.setHours(12, 0, 0, 0); // safe center value
      return d;
    }
    const parsed = Date.parse(dateStr);
    if (!isNaN(parsed)) {
      const d = new Date(parsed);
      d.setHours(12, 0, 0, 0);
      return d;
    }
    const fallback = new Date();
    fallback.setHours(12, 0, 0, 0);
    return fallback;
  };

  // Helper to parse "YYYY-MM-DD" from date input to local Date object
  const parseInputDate = (inputStr: string, isEndOfDay: boolean): Date => {
    const parts = inputStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (isEndOfDay) {
        d.setHours(23, 59, 59, 999);
      } else {
        d.setHours(0, 0, 0, 0);
      }
      return d;
    }
    return new Date();
  };

  // Filter records specifically for export based on user selection
  const getExportRecords = (): CallRecord[] => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    return visibleCalls.filter((call) => {
      const recordDate = parseRecordDate(call.createdDate);
      
      if (exportRange === 'Today') {
        return recordDate >= startOfToday && recordDate <= endOfToday;
      }
      
      if (exportRange === 'Week') {
        const startOfSevenDaysAgo = new Date();
        startOfSevenDaysAgo.setHours(0, 0, 0, 0);
        startOfSevenDaysAgo.setDate(startOfSevenDaysAgo.getDate() - 7);
        return recordDate >= startOfSevenDaysAgo && recordDate <= endOfToday;
      }
      
      if (exportRange === 'Month') {
        const startOfThirtyDaysAgo = new Date();
        startOfThirtyDaysAgo.setHours(0, 0, 0, 0);
        startOfThirtyDaysAgo.setDate(startOfThirtyDaysAgo.getDate() - 30);
        return recordDate >= startOfThirtyDaysAgo && recordDate <= endOfToday;
      }
      
      if (exportRange === 'Custom') {
        if (!exportStartDate || !exportEndDate) return false;
        const start = parseInputDate(exportStartDate, false);
        const end = parseInputDate(exportEndDate, true);
        return recordDate >= start && recordDate <= end;
      }
      
      return true;
    });
  };

  // String desc of current selection calendar scope
  const getRangeDescription = (): string => {
    const formatMonthMap: { [key: number]: string } = {
      0: 'Jan', 1: 'Feb', 2: 'Mar', 3: 'Apr', 4: 'May', 5: 'Jun',
      6: 'Jul', 7: 'Aug', 8: 'Sep', 9: 'Oct', 10: 'Nov', 11: 'Dec'
    };
    const formatDate = (d: Date) => {
      const mStr = formatMonthMap[d.getMonth()];
      const dStr = String(d.getDate()).padStart(2, '0');
      return `${mStr} ${dStr}, ${d.getFullYear()}`;
    };

    const now = new Date();
    if (exportRange === 'Today') {
      return formatDate(now);
    }
    if (exportRange === 'Week') {
      const start = new Date();
      start.setDate(now.getDate() - 7);
      return `${formatDate(start)} to ${formatDate(now)}`;
    }
    if (exportRange === 'Month') {
      const start = new Date();
      start.setDate(now.getDate() - 30);
      return `${formatDate(start)} to ${formatDate(now)}`;
    }
    if (exportRange === 'Custom') {
      if (!exportStartDate || !exportEndDate) return 'Please specify custom date bounds.';
      const start = parseInputDate(exportStartDate, false);
      const end = parseInputDate(exportEndDate, false);
      return `${formatDate(start)} to ${formatDate(end)}`;
    }
    return '';
  };

  const escapeCSVCell = (val: string): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    const needsQuotes = str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r');
    const escaped = str.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
  };

  const handleExecuteExport = () => {
    setExportError('');
    if (exportRange === 'Custom') {
      if (!exportStartDate || !exportEndDate) {
        setExportError('Both Start and End Dates are required for custom export.');
        return;
      }
      const start = parseInputDate(exportStartDate, false);
      const end = parseInputDate(exportEndDate, true);
      if (start > end) {
        setExportError('Start Date cannot be after End Date.');
        return;
      }
    }

    const recordsToExport = getExportRecords();
    if (recordsToExport.length === 0) {
      setExportError('No call logs found in the selected date range to export.');
      return;
    }

    let filename = customFilename.trim();
    if (!filename) {
      filename = `call-logs-export-${new Date().toISOString().split('T')[0]}.csv`;
    }
    if (!filename.endsWith('.csv')) {
      filename += '.csv';
    }

    const headers = ['Client Name', 'Number', 'Call Status', 'Employee Name', 'Record Date'];
    const rows = recordsToExport.map(r => [
      escapeCSVCell(r.clientName),
      escapeCSVCell(r.clientNumber),
      escapeCSVCell(r.callStatus),
      escapeCSVCell(r.loggedBy),
      escapeCSVCell(r.createdDate)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setIsExportModalOpen(false);
  };

  const handleExportFollowups = () => {
    if (followUpCallsFiltered.length === 0) {
      alert('No follow-up records found to export.');
      return;
    }

    let filename = `follow-ups-export-${new Date().toISOString().split('T')[0]}.csv`;

    const headers = ['Client Name', 'Number', 'Call Status', 'Follow-up Date', 'Interested Service', 'Employee Name', 'Notes', 'Created Date'];
    const rows = followUpCallsFiltered.map(r => [
      escapeCSVCell(r.clientName),
      escapeCSVCell(r.clientNumber),
      escapeCSVCell(r.callStatus),
      escapeCSVCell(r.followupDate || 'N/A'),
      escapeCSVCell(r.interestedService || 'N/A'),
      escapeCSVCell(r.loggedBy),
      escapeCSVCell(r.notes || ''),
      escapeCSVCell(r.createdDate)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Stats calculation
  const totalCalls = visibleCalls.length;
  const interestedCalls = visibleCalls.filter((c) => c.callStatus === 'Interested').length;
  const callbackCalls = visibleCalls.filter((c) => c.callStatus === 'Call Back').length;
  
  const answeredCalls = visibleCalls.filter((c) => c.callStatus !== 'Not Answered' && c.callStatus !== 'Not Reachable').length;
  const answerRate = totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0;

  // Filter distinct loggers
  const uniqueLoggers = ['All', ...Array.from(new Set(visibleCalls.map((c) => c.loggedBy)))];

  // Filtering implementation for Daily Calls
  const filteredCalls = visibleCalls.filter((call) => {
    const matchesSearch =
      call.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.clientNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (call.interestedService && call.interestedService.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (call.notes && call.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'All' || call.callStatus === statusFilter;
    const matchesStaff = staffFilter === 'All' || call.loggedBy === staffFilter;

    let matchesDateRange = true;
    if (dailyStartDate || dailyEndDate) {
      const recordDate = parseRecordDate(call.createdDate);
      if (dailyStartDate) {
        const start = parseInputDate(dailyStartDate, false);
        if (recordDate < start) matchesDateRange = false;
      }
      if (dailyEndDate) {
        const end = parseInputDate(dailyEndDate, true);
        if (recordDate > end) matchesDateRange = false;
      }
    }

    return matchesSearch && matchesStatus && matchesStaff && matchesDateRange;
  });

  // Followup calls filtering
  const followUpCallsAll = visibleCalls.filter(
    (call) => call.callStatus === 'Interested' || call.callStatus === 'Call Back'
  );

  const followUpCallsFiltered = followUpCallsAll.filter((call) => {
    if (followupViewMode === 'all') return true;
    if (!call.followupDate) return false;
    if (followupFromDate && call.followupDate < followupFromDate) return false;
    if (followupToDate && call.followupDate > followupToDate) return false;
    return true;
  });

  const dailyTotalItems = filteredCalls.length;
  const dailyTotalPages = Math.ceil(dailyTotalItems / dailyPageSize) || 1;
  const safeDailyPage = Math.min(dailyPage, dailyTotalPages);
  const paginatedDailyCalls = filteredCalls.slice((safeDailyPage - 1) * dailyPageSize, safeDailyPage * dailyPageSize);

  const followupTotalItems = followUpCallsFiltered.length;
  const followupTotalPages = Math.ceil(followupTotalItems / followupPageSize) || 1;
  const safeFollowupPage = Math.min(followupPage, followupTotalPages);
  const paginatedFollowupCalls = followUpCallsFiltered.slice((safeFollowupPage - 1) * followupPageSize, safeFollowupPage * followupPageSize);

  const getStatusBadgeStyle = (status: CallStatus) => {
    switch (status) {
      case 'Interested':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Call Back':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Busy':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Not Reachable':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Closed':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Rejected':
      case 'Not Interested':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'Not Answered':
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  // Follow-up updater handler
  const handleOpenUpdateFollowup = (call: CallRecord) => {
    setUpdatingFollowupRecord(call);
    setUpdateStatus(call.callStatus);
    setUpdateFollowupDate(call.followupDate || getLocalTodayDateString());
    setUpdateService(call.interestedService || (services[0]?.name || ''));
    setUpdateNotes(call.notes || '');
    setUpdateError('');
  };

  const handleSaveFollowupUpdate = () => {
    if (!updatingFollowupRecord) return;

    const needsDate = updateStatus === 'Interested' || updateStatus === 'Call Back';
    if (needsDate && !updateFollowupDate) {
      setUpdateError('A followup date is required for this status.');
      return;
    }

    const needsService = updateStatus === 'Interested';
    if (needsService && !updateService) {
      setUpdateError('An Interested Service must be selected.');
      return;
    }

    onSaveCall({
      id: updatingFollowupRecord.id,
      clientName: updatingFollowupRecord.clientName,
      clientNumber: updatingFollowupRecord.clientNumber,
      callStatus: updateStatus,
      followupDate: needsDate ? updateFollowupDate : undefined,
      interestedService: needsService ? updateService : undefined,
      loggedBy: updatingFollowupRecord.loggedBy,
      notes: updateNotes.trim() || undefined,
    });

    setUpdatingFollowupRecord(null);
  };

  const handleOpenCloseLead = (call: CallRecord) => {
    setClosingLeadRecord(call);
    setCloseLeadTab('business');
    const activeServices = services.filter((s) => s.status === 'Active');
    setTakenService(call.interestedService || activeServices[0]?.name || '');
    setAmountPaid('');
    setPaidBy('Cash');
    setCustomPaidBy('');
    setPanelNameUrl('');
    setPanelUsername('');
    setPanelPassword('');
    setCloseLeadError('');
  };

  const handleExecuteCloseLead = () => {
    if (!closingLeadRecord) return;
    if (!takenService) {
      setCloseLeadError('Please select a Taken Service.');
      return;
    }
    if (amountPaid === '' || isNaN(Number(amountPaid)) || Number(amountPaid) < 0) {
      setCloseLeadError('Please enter a valid Amount Paid.');
      return;
    }
    const finalPaidBy = paidBy === 'Other' ? customPaidBy.trim() : paidBy;
    if (!finalPaidBy) {
      setCloseLeadError('Please specify how the payment was made (Paid By).');
      return;
    }

    onCloseLead({
      callRecordId: closingLeadRecord.id,
      clientName: closingLeadRecord.clientName,
      clientNumber: closingLeadRecord.clientNumber,
      takenService: takenService,
      amountPaid: Number(amountPaid),
      paidBy: finalPaidBy,
      panelNameUrl: panelNameUrl.trim(),
      panelUsername: panelUsername.trim(),
      panelPassword: panelPassword,
    });

    setClosingLeadRecord(null);
  };

  return (
    <div className="pb-12" id="call-management-panel">
      {/* Sub-module Toggle Bar */}
      <div className="flex border-b border-slate-200 mb-6 gap-6" id="call-sub-modules-nav">
        <button
          onClick={() => setActiveSubTab('daily')}
          className={`pb-3 text-sm font-semibold transition-all relative cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'daily'
              ? 'text-slate-900 border-b-2 border-slate-900'
              : 'text-slate-400 hover:text-slate-600'
          }`}
          id="btn-subtab-daily"
        >
          <ClipboardList className="w-4.5 h-4.5" />
          <span>Daily Calls</span>
        </button>

        <button
          onClick={() => {
            setActiveSubTab('followup');
            setFollowupFromDate(getLocalTodayDateString());
            setFollowupToDate(getLocalTodayDateString());
            setFollowupViewMode('custom_range');
          }}
          className={`pb-3 text-sm font-semibold transition-all relative cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'followup'
              ? 'text-slate-900 border-b-2 border-slate-900'
              : 'text-slate-400 hover:text-slate-600'
          }`}
          id="btn-subtab-followup"
        >
          <Calendar className="w-4.5 h-4.5" />
          <span>Follow Up Calls</span>
          {followUpCallsAll.filter(c => c.followupDate === getLocalTodayDateString()).length > 0 && (
            <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
              {followUpCallsAll.filter(c => c.followupDate === getLocalTodayDateString()).length}
            </span>
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeSubTab === 'daily' ? (
          <motion.div
            key="daily-calls-subtab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            {/* Dynamic Counter Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4" id="call-stats-grid">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between" id="call-stat-total">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Logs</p>
                  <p className="text-3xl font-semibold text-slate-900 tracking-tight" id="count-total">{totalCalls}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-slate-50 text-slate-700 flex items-center justify-center border border-slate-100">
                  <ClipboardList className="w-5.5 h-5.5" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between" id="call-stat-interested">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Interested</p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-3xl font-semibold text-slate-900 tracking-tight" id="count-interested">{interestedCalls}</p>
                    {totalCalls > 0 && (
                      <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                        {Math.round((interestedCalls / totalCalls) * 100)}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/50">
                  <CheckCircle2 className="w-5.5 h-5.5" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between" id="call-stat-callback">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Callbacks Scheduled</p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-3xl font-semibold text-slate-900 tracking-tight" id="count-callback">{callbackCalls}</p>
                    {totalCalls > 0 && (
                      <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md">
                        {Math.round((callbackCalls / totalCalls) * 100)}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100/50">
                  <PhoneForwarded className="w-5.5 h-5.5" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between" id="call-stat-rate">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Answer Rate</p>
                  <p className="text-3xl font-semibold text-slate-900 tracking-tight" id="count-rate">{answerRate}%</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100/50">
                  <PhoneCall className="w-5.5 h-5.5" />
                </div>
              </div>
            </div>

            {/* Daily Call Action Bench Panel */}
            <div className="bg-white border border-slate-200/85 rounded-2xl shadow-xs overflow-hidden" id="call-datagrid-box">
              
              {/* Controls Header */}
              <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/40 flex flex-col md:flex-row gap-3 items-center justify-between" id="call-filters-row">
                
                {/* Quick Search */}
                <div className="relative w-full md:max-w-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search clients, services, notes..."
                    className="block w-full pl-9 pr-3 py-2 bg-white border border-slate-205 text-slate-900 placeholder:text-slate-400 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm"
                    id="call-search-input"
                  />
                </div>

                {/* Filtering Dropdowns & Actions */}
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto" id="call-filters-bench">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-widest mr-1">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-450" />
                    <span>Filters:</span>
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="py-1.5 pl-3 pr-8 border border-slate-200 rounded-lg bg-white text-xs font-medium text-slate-650 focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-800 cursor-pointer"
                    id="call-status-select-filter"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Interested">Interested</option>
                    <option value="Call Back">Call Back</option>
                    <option value="Not Answered">Not Answered</option>
                    <option value="Busy">Busy</option>
                    <option value="Not Reachable">Not Reachable</option>
                    <option value="Not Interested">Not Interested</option>
                    <option value="Closed">Closed</option>
                    <option value="Rejected">Rejected</option>
                  </select>

                  <select
                    value={staffFilter}
                    onChange={(e) => setStaffFilter(e.target.value)}
                    className="py-1.5 pl-3 pr-8 border border-slate-200 rounded-lg bg-white text-xs font-medium text-slate-650 focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-800 cursor-pointer"
                    id="call-staff-select-filter"
                  >
                    <option value="All">All Loggers (Agents)</option>
                    {uniqueLoggers.filter(l => l !== 'All').map((logger) => (
                      <option key={logger} value={logger}>
                        {logger}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">From:</span>
                    <input
                      type="date"
                      value={dailyStartDate}
                      onChange={(e) => setDailyStartDate(e.target.value)}
                      className="text-xs font-semibold text-slate-700 bg-transparent border-0 focus:outline-hidden p-0 cursor-pointer"
                    />
                    <span className="text-[10px] font-semibold text-slate-400 uppercase ml-1">To:</span>
                    <input
                      type="date"
                      value={dailyEndDate}
                      onChange={(e) => setDailyEndDate(e.target.value)}
                      className="text-xs font-semibold text-slate-700 bg-transparent border-0 focus:outline-hidden p-0 cursor-pointer"
                    />
                  </div>

                  {(searchTerm || statusFilter !== 'All' || staffFilter !== 'All' || dailyStartDate || dailyEndDate) && (
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('All');
                        setStaffFilter('All');
                        setDailyStartDate('');
                        setDailyEndDate('');
                      }}
                      className="p-1 px-2.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-700 flex items-center gap-1 cursor-pointer"
                      id="btn-quick-reset"
                    >
                      <RefreshCw className="w-3 h-3 text-slate-400" />
                      <span>Reset</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      const todayISO = new Date().toISOString().split('T')[0];
                      if (dailyStartDate && dailyEndDate) {
                        setExportStartDate(dailyStartDate);
                        setExportEndDate(dailyEndDate);
                        setExportRange('Custom');
                      } else {
                        setExportStartDate(todayISO);
                        setExportEndDate(todayISO);
                        setExportRange('Today');
                      }
                      setCustomFilename(`calls_export_${todayISO}.csv`);
                      setExportError('');
                      setIsExportModalOpen(true);
                    }}
                    className="py-1.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    id="btn-call-export"
                    title="Export calls to CSV"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Export Logs</span>
                  </button>

                  <button
                    onClick={onAddCall}
                    className="py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    id="btn-log-call-inline"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Log Daily Call</span>
                  </button>
                </div>
              </div>

              {/* Call Database Table */}
              <div className="overflow-x-auto" id="calls-scroll-area">
                {filteredCalls.length === 0 ? (
                  <div className="text-center py-16 px-4" id="calls-fallback-box">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 text-slate-400 border border-slate-100 mb-3 animate-pulse">
                      <PhoneCall className="w-5 h-5 text-slate-400" />
                    </div>
                    <h3 className="font-semibold text-slate-900 text-sm">No call logs recorded</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      No matching entry found. Tap "Log Daily Call" at the top table control panel to record a business outreach dialog.
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse" id="calls-data-grid-table">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/60 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-5">Client Profile</th>
                        <th className="py-3 px-5">Call Status</th>
                        <th className="py-3 px-5">Conditional Follow-ups</th>
                        <th className="py-3 px-5">Agent Logger</th>
                        <th className="py-3 px-5">Record Date</th>
                        <th className="py-3 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {paginatedDailyCalls.map((call) => {
                        const isDeleting = deleteConfirmId === call.id;
                        const hasFollowup = call.callStatus === 'Interested' || call.callStatus === 'Call Back';
                        const statusBadgeStyle = getStatusBadgeStyle(call.callStatus);

                        return (
                          <tr key={call.id} className="hover:bg-slate-50/50 transition-colors" id={`call-row-${call.id}`}>
                            {/* Name & phone details */}
                            <td className="py-3.5 px-5">
                              <div>
                                <span className="font-semibold text-slate-900 text-sm block leading-snug">
                                  {call.clientName}
                                </span>
                                <span className="text-xs text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                                  <span className="text-indigo-400">•</span> {call.clientNumber}
                                </span>
                              </div>
                            </td>

                            {/* Call Status Tag */}
                            <td className="py-3.5 px-5">
                              <span className={`inline-flex items-center gap-1 border px-2 py-0.5 rounded-full text-[11px] font-medium ${statusBadgeStyle}`}>
                                <span>{call.callStatus}</span>
                              </span>
                            </td>

                            {/* Conditional followup date as well as service name */}
                            <td className="py-3.5 px-5 text-xs">
                              {hasFollowup ? (
                                <div className="space-y-1">
                                  {call.followupDate && (
                                    <div className="flex items-center gap-1.5 text-slate-700 font-medium font-mono bg-indigo-50/50 text-[11px] px-1.5 py-0.5 rounded border border-indigo-100/40 w-fit">
                                      <Calendar className="w-3 h-3 text-indigo-500" />
                                      <span>Followup: {call.followupDate}</span>
                                    </div>
                                  )}
                                  {call.callStatus === 'Interested' && call.interestedService && (
                                    <div className="flex items-center gap-1.5 text-emerald-800 font-medium bg-emerald-50/40 text-[11px] px-1.5 py-0.5 rounded border border-emerald-100/40 w-fit">
                                      <HeartHandshake className="w-3 h-3 text-emerald-500" />
                                      <span>Service: {call.interestedService}</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400 tracking-wide font-mono">—</span>
                              )}
                            </td>

                            {/* Logged by staff credentials */}
                            <td className="py-3.5 px-5 text-xs">
                              <div className="flex items-center gap-1.5 text-slate-600">
                                <Bookmark className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate max-w-[130px]" title={call.loggedBy}>
                                  {call.loggedBy}
                                </span>
                              </div>
                            </td>

                            {/* Outward Call log Date */}
                            <td className="py-3.5 px-5 text-xs text-slate-500">
                              <span className="font-mono">{call.createdDate}</span>
                            </td>

                            {/* Actions workflow */}
                            <td className="py-3.5 px-5 text-right">
                              {isDeleting ? (
                                <div className="flex items-center justify-end gap-1.5" id={`call-delete-confirm-${call.id}`}>
                                  <span className="text-[10px] text-red-600 font-semibold mr-1">Confirm?</span>
                                  <button
                                    onClick={() => onDeleteCall(call.id)}
                                    className="px-1.5 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-[10px] font-bold transition-colors cursor-pointer"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md text-[10px] font-medium transition-colors cursor-pointer"
                                  >
                                    Exit
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-2" id={`call-actions-${call.id}`}>
                                  <button
                                    onClick={() => onEditCall(call)}
                                    className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                    title="Edit record details"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(call.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title="Delete call log"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Display notes expandable row indicator */}
              {filteredCalls.some(c => c.notes) && (
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/20" id="table-notes-guidance">
                  <span className="text-[11px] text-slate-400/80 font-medium inline-flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                    <span>Double-click or edit any record to review specific client requirements & outbound dialogue notes.</span>
                  </span>
                </div>
              )}

              <Pagination
                currentPage={safeDailyPage}
                totalPages={dailyTotalPages}
                totalItems={dailyTotalItems}
                itemsPerPage={dailyPageSize}
                onPageChange={setDailyPage}
                onItemsPerPageChange={setDailyPageSize}
                itemLabel="call logs"
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="followup-calls-subtab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            {/* Calendar & Controller Panel */}
            <div className="bg-white border border-slate-200/85 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4" id="followups-control-panel">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  Follow-up Calendar Pipeline
                </h3>
                <p className="text-xs text-slate-500">
                  Manage active pipelines, reschedule callback requests, and record client responses.
                </p>
              </div>

              {/* Date selection controls */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="bg-slate-100 p-0.5 rounded-lg flex items-center border border-slate-200/40">
                  <button
                    onClick={() => setFollowupViewMode('custom_range')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      followupViewMode === 'custom_range'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Custom Range
                  </button>
                  <button
                    onClick={() => setFollowupViewMode('all')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      followupViewMode === 'all'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Show All Pending
                  </button>
                </div>

                {followupViewMode === 'custom_range' && (
                  <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">From:</span>
                    <input
                      type="date"
                      value={followupFromDate}
                      onChange={(e) => setFollowupFromDate(e.target.value)}
                      className="text-xs font-semibold text-slate-800 bg-transparent border-0 focus:outline-hidden p-0 cursor-pointer"
                    />
                    <span className="text-[10px] font-semibold text-slate-400 uppercase ml-1">To:</span>
                    <input
                      type="date"
                      value={followupToDate}
                      onChange={(e) => setFollowupToDate(e.target.value)}
                      className="text-xs font-semibold text-slate-800 bg-transparent border-0 focus:outline-hidden p-0 cursor-pointer"
                    />
                    <button
                      onClick={() => {
                        setFollowupFromDate(getLocalTodayDateString());
                        setFollowupToDate(getLocalTodayDateString());
                      }}
                      className="ml-1 p-1 hover:bg-slate-100 rounded text-[11px] font-semibold text-slate-600 cursor-pointer"
                      title="Reset to today"
                    >
                      Today
                    </button>
                  </div>
                )}

                <button
                  onClick={handleExportFollowups}
                  className="py-1.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  id="btn-followup-export"
                  title="Export follow-ups to CSV"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Export Follow-ups</span>
                </button>
              </div>
            </div>

            {/* Follow Up Grid list */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="followups-cards-grid">
              {followUpCallsFiltered.length === 0 ? (
                <div className="col-span-full bg-white border border-slate-200/85 rounded-2xl py-16 px-4 text-center text-slate-400" id="followups-empty-box">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 border border-slate-100 mb-3 text-slate-350 animate-pulse">
                    <Calendar className="w-5.5 h-5.5" />
                  </div>
                  <h4 className="font-semibold text-slate-900 text-sm">No follow-ups found</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    {followupViewMode === 'custom_range'
                      ? `No clients are scheduled for a callback or marked interested between ${followupFromDate} and ${followupToDate}. Check another date range or click "Show All Pending".`
                      : 'You do not have any pending follow-ups in the system right now.'}
                  </p>
                  {followupViewMode === 'custom_range' && (
                    <button
                      onClick={() => setFollowupViewMode('all')}
                      className="mt-4 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-2xs transition-all cursor-pointer"
                    >
                      Show All Pending Follow-ups
                    </button>
                  )}
                </div>
              ) : (
                paginatedFollowupCalls.map((call) => {
                  const isToday = call.followupDate === getLocalTodayDateString();
                  return (
                    <div
                      key={call.id}
                      className={`bg-white border rounded-2xl p-5 shadow-2xs flex flex-col justify-between transition-all hover:shadow-xs relative ${
                        isToday ? 'border-indigo-200/80 bg-indigo-50/5' : 'border-slate-200/85'
                      }`}
                      id={`followup-card-${call.id}`}
                    >
                      {isToday && (
                        <span className="absolute top-4 right-4 bg-indigo-500 text-white text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full shadow-2xs animate-pulse">
                          Due Today
                        </span>
                      )}

                      <div className="space-y-4">
                        {/* Header Client Profiling */}
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest block font-mono">Client Account</span>
                            <h4 className="font-bold text-slate-900 text-base mt-0.5">{call.clientName}</h4>
                            <span className="text-xs text-slate-600 font-mono block mt-1">{call.clientNumber}</span>
                          </div>

                          <span className={`inline-flex items-center gap-1 border px-2 py-0.5 rounded-full text-[11px] font-semibold mt-1 shrink-0 ${getStatusBadgeStyle(call.callStatus)}`}>
                            {call.callStatus}
                          </span>
                        </div>

                        {/* Middle pipeline schedule data */}
                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
                          <div className="space-y-1">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Target Schedule</span>
                            <div className="flex items-center gap-1.5 font-medium font-mono text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                              <span>{call.followupDate || '—'}</span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Assigned Service</span>
                            <div className="flex items-center gap-1.5 font-medium text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-100 truncate">
                              <HeartHandshake className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span className="truncate" title={call.interestedService || 'N/A'}>
                                {call.interestedService || 'None Listed'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Dialogue previous logs */}
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/40 space-y-1">
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block flex items-center gap-1">
                            <MessageSquare className="w-3 h-3 text-slate-400" />
                            <span>Client Outreach Dialogue Notes</span>
                          </span>
                          <p className="text-xs text-slate-600 italic leading-relaxed">
                            "{call.notes || 'No notes logged for this call.'}"
                          </p>
                        </div>

                        {/* Assigned staff member info */}
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-450 pt-1">
                          <Bookmark className="w-3.5 h-3.5 text-slate-350 shrink-0" />
                          <span>Logged by: <span className="font-semibold text-slate-600">{call.loggedBy}</span></span>
                        </div>
                      </div>

                      {/* Action buttons row */}
                      <div className="flex items-center justify-end gap-2.5 mt-5 pt-3.5 border-t border-slate-150/60">
                        {call.callStatus === 'Interested' && (
                          <button
                            onClick={() => handleOpenCloseLead(call)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                            id={`btn-close-lead-${call.id}`}
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Close Lead</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenUpdateFollowup(call)}
                          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                          id={`btn-update-followup-${call.id}`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Update Details</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="bg-white border border-slate-200/85 rounded-2xl overflow-hidden shadow-xs">
              <Pagination
                currentPage={safeFollowupPage}
                totalPages={followupTotalPages}
                totalItems={followupTotalItems}
                itemsPerPage={followupPageSize}
                onPageChange={setFollowupPage}
                onItemsPerPageChange={setFollowupPageSize}
                pageSizeOptions={[6, 12, 24, 48]}
                itemLabel="follow-ups"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modern Dialog overlays for update followup details */}
      <AnimatePresence>
        {updatingFollowupRecord && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 transition-opacity"
              onClick={() => setUpdatingFollowupRecord(null)}
              id="update-backdrop"
            />

            {/* Dialog Content */}
            <div className="fixed inset-0 flex items-center justify-center p-4 z-50" id="update-modal-outer">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: 'spring', duration: 0.4 }}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl max-w-md w-full overflow-hidden flex flex-col"
                id="update-modal-card"
              >
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                      <RefreshCw className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-none">Update Follow-up</h3>
                      <span className="text-[11px] text-slate-500 block mt-1">Client: <span className="font-semibold">{updatingFollowupRecord.clientName}</span></span>
                    </div>
                  </div>
                  <button
                    onClick={() => setUpdatingFollowupRecord(null)}
                    className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Form Fields inside modal */}
                <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
                  {updateError && (
                    <div className="bg-red-50 border border-red-100 text-red-950 p-3 rounded-xl text-xs flex gap-2" id="update-form-error">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <span>{updateError}</span>
                    </div>
                  )}

                  {/* Status Selection */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Updated Status
                    </label>
                    <select
                      value={updateStatus}
                      onChange={(e) => setUpdateStatus(e.target.value as CallStatus)}
                      className="block w-full py-2 px-3 border border-slate-200 rounded-xl bg-white text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-950/5 focus:border-slate-800"
                    >
                      <option value="Interested">Interested</option>
                      <option value="Call Back">Call Back</option>
                      <option value="Not Answered">Not Answered</option>
                      <option value="Busy">Busy</option>
                      <option value="Not Reachable">Not Reachable</option>
                      <option value="Not Interested">Not Interested</option>
                      <option value="Closed">Closed</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>

                  {/* Conditional Follow-up date picker */}
                  {(updateStatus === 'Interested' || updateStatus === 'Call Back') && (
                    <div className="space-y-1.5 animate-fade-in">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                        New Follow-up Date
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <input
                          type="date"
                          value={updateFollowupDate}
                          onChange={(e) => setUpdateFollowupDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-semibold text-slate-800"
                        />
                      </div>
                    </div>
                  )}

                  {/* Conditional Service Item selection */}
                  {updateStatus === 'Interested' && (
                    <div className="space-y-1.5 animate-fade-in">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                        Interested Service
                      </label>
                      <select
                        value={updateService}
                        onChange={(e) => setUpdateService(e.target.value)}
                        className="block w-full py-2 px-3 border border-slate-200 rounded-xl bg-white text-xs font-semibold text-slate-800 cursor-pointer"
                      >
                        {services.filter(s => s.status === 'Active').map((srv) => (
                          <option key={srv.id} value={srv.name}>
                            {srv.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Notes / Response Feedback */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Dialogue Feedback & Notes
                    </label>
                    <textarea
                      value={updateNotes}
                      onChange={(e) => setUpdateNotes(e.target.value)}
                      rows={3}
                      placeholder="Add summary notes of callback result or specific client needs..."
                      className="block w-full p-3 border border-slate-200 rounded-xl bg-white text-xs text-slate-800 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2 shrink-0">
                  <button
                    onClick={() => setUpdatingFollowupRecord(null)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveFollowupUpdate}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Export Modal Overlays */}
      <AnimatePresence>
        {isExportModalOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 transition-opacity"
              onClick={() => setIsExportModalOpen(false)}
              id="export-modal-backdrop"
            />

            {/* Modal Body Centered */}
            <div className="fixed inset-0 flex items-center justify-center p-4 z-50" id="export-modal-outer">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: 'spring', duration: 0.4 }}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl max-w-md w-full overflow-hidden flex flex-col"
                id="export-modal-card"
              >
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50" id="export-header">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-none">Export Call Records</h3>
                      <span className="text-[11px] text-slate-450 block mt-1">Export filtered call records as spreadsheet CSV</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsExportModalOpen(false)}
                    className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-all cursor-pointer"
                    id="btn-close-export"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Form fields */}
                <div className="p-6 space-y-5" id="export-modal-content">
                  {exportError && (
                    <div className="bg-red-50 border border-red-100 text-red-950 p-3.5 rounded-xl text-xs flex gap-2 leading-relaxed" id="export-error-banner">
                      <AlertCircle className="w-4.5 h-4.5 text-red-600 shrink-0" />
                      <span>{exportError}</span>
                    </div>
                  )}

                  {/* Predefined Range Options */}
                  <div className="space-y-2">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date bounds scope</span>
                    <div className="grid grid-cols-4 gap-2" id="export-ranges-box">
                      {(['Today', 'Week', 'Month', 'Custom'] as const).map((range) => (
                        <button
                          key={range}
                          onClick={() => {
                            setExportRange(range);
                            setExportError('');
                          }}
                          className={`py-2 px-1 rounded-xl border text-center text-xs font-semibold transition-all cursor-pointer ${
                            exportRange === range
                              ? 'bg-slate-900 text-white border-slate-950 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {range}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Conditional Custom Dates inputs */}
                  {exportRange === 'Custom' && (
                    <div className="grid grid-cols-2 gap-3 pt-1 animate-fade-in" id="export-custom-dates-row">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-600" htmlFor="export-start-date">
                          Start Date
                        </label>
                        <input
                          type="date"
                          id="export-start-date"
                          value={exportStartDate}
                          onChange={(e) => {
                            setExportStartDate(e.target.value);
                            setExportError('');
                          }}
                          className="block w-full p-2 border border-slate-205 rounded-xl text-xs font-medium text-slate-900 bg-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-600" htmlFor="export-end-date">
                          End Date
                        </label>
                        <input
                          type="date"
                          id="export-end-date"
                          value={exportEndDate}
                          onChange={(e) => {
                            setExportEndDate(e.target.value);
                            setExportError('');
                          }}
                          className="block w-full p-2 border border-slate-205 rounded-xl text-xs font-medium text-slate-900 bg-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* Active scope description status */}
                  <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl flex items-center justify-between text-xs" id="export-scope-desc">
                    <span className="text-slate-550 font-medium">Included records:</span>
                    <span className="font-mono text-slate-850 font-bold max-w-[210px] truncate" title={getRangeDescription()}>
                      {getRangeDescription()}
                    </span>
                  </div>

                  {/* Filename modifier */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-750 uppercase tracking-wider" htmlFor="export-filename">
                      Custom Filename <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      id="export-filename"
                      value={customFilename}
                      onChange={(e) => setCustomFilename(e.target.value)}
                      placeholder="E.g., call_logs_q2_report"
                      className="block w-full p-2.5 bg-white border border-slate-205 text-slate-900 placeholder:text-slate-400 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 text-sm"
                    />
                  </div>
                </div>

                {/* Footer controls */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5" id="export-footer">
                  <button
                    onClick={() => setIsExportModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                    id="btn-cancel-export"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExecuteExport}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md shadow-slate-900/10 flex items-center gap-1.5 cursor-pointer transition-colors"
                    id="btn-trigger-download"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Report</span>
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Close Lead Dialog Overlay */}
      <AnimatePresence>
        {closingLeadRecord && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 transition-opacity"
              onClick={() => setClosingLeadRecord(null)}
              id="close-lead-backdrop"
            />

            {/* Modal Body Centered */}
            <div className="fixed inset-0 flex items-center justify-center p-4 z-50" id="close-lead-modal-outer">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: 'spring', duration: 0.4 }}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl max-w-md w-full overflow-hidden flex flex-col"
                id="close-lead-modal-card"
              >
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50" id="close-lead-header">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-none">Close Business Lead</h3>
                      <span className="text-[11px] text-slate-450 block mt-1">Convert interested client into an active service lead</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setClosingLeadRecord(null)}
                    className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-all cursor-pointer"
                    id="btn-close-lead-x"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2">
                  <button
                    type="button"
                    onClick={() => setCloseLeadTab('business')}
                    className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                      closeLeadTab === 'business'
                        ? 'border-emerald-600 text-emerald-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Business Details
                  </button>
                  <button
                    type="button"
                    onClick={() => setCloseLeadTab('panel')}
                    className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                      closeLeadTab === 'panel'
                        ? 'border-emerald-600 text-emerald-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Panel Details
                  </button>
                </div>

                {/* Form fields */}
                <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]" id="close-lead-modal-content">
                  {closeLeadError && (
                    <div className="bg-red-50 border border-red-100 text-red-950 p-3.5 rounded-xl text-xs flex gap-2 leading-relaxed" id="close-lead-error-banner">
                      <AlertCircle className="w-4.5 h-4.5 text-red-600 shrink-0" />
                      <span>{closeLeadError}</span>
                    </div>
                  )}

                  {closeLeadTab === 'business' && (
                    <div className="space-y-5 animate-fade-in">
                      {/* Read-only client details */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-3">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Client Identity (Read-Only)</span>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="block text-[10px] text-slate-500 font-medium">Client Name</span>
                        <span className="text-sm font-bold text-slate-800 block mt-0.5">{closingLeadRecord.clientName}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500 font-medium">Phone Number</span>
                        <span className="text-sm font-mono font-bold text-slate-800 block mt-0.5">{closingLeadRecord.clientNumber}</span>
                      </div>
                    </div>
                  </div>

                  {/* 1. Taken Service Selection */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide" htmlFor="taken-service-select">
                      Taken Service <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        id="taken-service-select"
                        value={takenService}
                        onChange={(e) => setTakenService(e.target.value)}
                        className="block w-full py-2.5 pl-3.5 pr-10 bg-white border border-slate-205 text-slate-900 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 text-sm cursor-pointer"
                      >
                        <option value="">-- Select Service --</option>
                        {services.filter(s => s.status === 'Active').map((srv) => (
                          <option key={srv.id} value={srv.name}>
                            {srv.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 2. Amount Paid Input */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide" htmlFor="amount-paid-input">
                      Amount Paid (₹) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 text-sm font-bold">
                        ₹
                      </span>
                      <input
                        type="number"
                        id="amount-paid-input"
                        min="0"
                        placeholder="E.g., 5000"
                        value={amountPaid}
                        onWheel={(e) => e.currentTarget.blur()}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAmountPaid(val === '' ? '' : Number(val));
                        }}
                        className="block w-full pl-8 pr-3.5 py-2.5 bg-white border border-slate-205 text-slate-900 placeholder:text-slate-400 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 text-sm no-stepper [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>

                  {/* 3. Paid By Selection */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                      Paid By <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2" id="paid-by-selection">
                      {['Cash', 'UPI', 'Card', 'Bank Transfer', 'Other'].map((method) => {
                        const isSelected = paidBy === method;
                        return (
                          <button
                            type="button"
                            key={method}
                            onClick={() => {
                              setPaidBy(method);
                              setCloseLeadError('');
                            }}
                            className={`py-2 px-3 text-xs font-semibold rounded-xl border text-center transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {method}
                          </button>
                        );
                      })}
                    </div>

                    {paidBy === 'Other' && (
                      <div className="mt-2.5 animate-fade-in">
                        <input
                          type="text"
                          required
                          value={customPaidBy}
                          onChange={(e) => setCustomPaidBy(e.target.value)}
                          placeholder="E.g. Cheque / Sponsorship"
                          className="block w-full px-3.5 py-2.5 bg-white border border-slate-205 text-slate-900 placeholder:text-slate-400 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 text-sm"
                        />
                      </div>
                    )}
                  </div>
                    </div>
                  )}

                  {closeLeadTab === 'panel' && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 text-xs text-slate-600 leading-relaxed">
                        Specify optional service panel credentials or login URL for the client.
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide" htmlFor="panel-name-url-input">
                          Service Panel Name / URL (Optional)
                        </label>
                        <input
                          type="text"
                          id="panel-name-url-input"
                          placeholder="E.g., https://panel.example.com or SEO Portal"
                          value={panelNameUrl}
                          onChange={(e) => setPanelNameUrl(e.target.value)}
                          className="block w-full px-3.5 py-2.5 bg-white border border-slate-205 text-slate-900 placeholder:text-slate-400 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 text-sm"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide" htmlFor="panel-username-input">
                          Username (Optional)
                        </label>
                        <input
                          type="text"
                          id="panel-username-input"
                          placeholder="Client login username"
                          value={panelUsername}
                          onChange={(e) => setPanelUsername(e.target.value)}
                          className="block w-full px-3.5 py-2.5 bg-white border border-slate-205 text-slate-900 placeholder:text-slate-400 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 text-sm"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide" htmlFor="panel-password-input">
                          Password (Optional)
                        </label>
                        <input
                          type="text"
                          id="panel-password-input"
                          placeholder="Client login password"
                          value={panelPassword}
                          onChange={(e) => setPanelPassword(e.target.value)}
                          className="block w-full px-3.5 py-2.5 bg-white border border-slate-205 text-slate-900 placeholder:text-slate-400 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 text-sm font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer controls */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5" id="close-lead-footer">
                  <button
                    onClick={() => setClosingLeadRecord(null)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                    id="btn-cancel-close-lead"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExecuteCloseLead}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/10 flex items-center gap-1.5 cursor-pointer transition-colors"
                    id="btn-complete-close-lead"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Complete Lead Closure</span>
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
