/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Trash2, Edit3, Coins, CreditCard, TrendingUp, X, Save,
  AlertCircle, ChevronDown, CheckCircle2, DollarSign, Calendar, HeartHandshake, User, Phone, UserCheck, Download
} from 'lucide-react';
import { ClosedLead, ServiceItem } from '../types';

interface ClosedLeadsProps {
  closedLeads: ClosedLead[];
  services: ServiceItem[];
  onSaveClosedLead: (leadData: Omit<ClosedLead, 'closedDate'> & { id?: string }) => void;
  onDeleteClosedLead?: (id: string) => void;
  currentUserRole?: string;
  currentUserFullName?: string;
}

export default function ClosedLeads({
  closedLeads,
  services,
  onSaveClosedLead,
  onDeleteClosedLead,
  currentUserRole,
  currentUserFullName,
}: ClosedLeadsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceFilter, setServiceFilter] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // Filter visible closed leads based on user role
  const visibleLeads = currentUserRole === 'User'
    ? closedLeads.filter((lead) => (lead.closedBy || 'Administrator').toLowerCase() === (currentUserFullName || '').toLowerCase())
    : closedLeads;

  // Edit closed lead state
  const [editingLead, setEditingLead] = useState<ClosedLead | null>(null);
  const [editClientName, setEditClientName] = useState('');
  const [editClientNumber, setEditClientNumber] = useState('');
  const [editTakenService, setEditTakenService] = useState('');
  const [editAmountPaid, setEditAmountPaid] = useState<number | ''>('');
  const [editPaidBy, setEditPaidBy] = useState('');
  const [editCustomPaidBy, setEditCustomPaidBy] = useState('');
  const [editClosedBy, setEditClosedBy] = useState('');
  const [editError, setEditError] = useState('');

  // Delete lead state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Helper to identify current month & year
  const now = new Date();
  const formatMonthMap: { [key: number]: string } = {
    0: 'Jan', 1: 'Feb', 2: 'Mar', 3: 'Apr', 4: 'May', 5: 'Jun',
    6: 'Jul', 7: 'Aug', 8: 'Sep', 9: 'Oct', 10: 'Nov', 11: 'Dec'
  };
  const currentMonthName = formatMonthMap[now.getMonth()];
  const currentYearStr = String(now.getFullYear());

  const currentMonthLeads = visibleLeads.filter((lead) => {
    if (!lead.closedDate) return false;
    return lead.closedDate.startsWith(currentMonthName) && lead.closedDate.endsWith(currentYearStr);
  });

  // Financial statistics for current month only
  const totalLeadsCurrentMonth = currentMonthLeads.length;
  const totalRevenueCurrentMonth = currentMonthLeads.reduce((acc, c) => acc + (c.amountPaid || 0), 0);
  const averageLeadValueCurrentMonth = totalLeadsCurrentMonth > 0 ? Math.round(totalRevenueCurrentMonth / totalLeadsCurrentMonth) : 0;

  // Distinct payment methods & services for filters
  const uniqueServices = ['All', ...Array.from(new Set(visibleLeads.map((c) => c.takenService)))];
  const uniquePayments = ['All', ...Array.from(new Set(visibleLeads.map((c) => c.paidBy)))];

  const parseRecordDate = (dateStr: string): Date => {
    if (!dateStr) return new Date(0);
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
      d.setHours(12, 0, 0, 0);
      return d;
    }
    const parsed = Date.parse(dateStr);
    if (!isNaN(parsed)) {
      const d = new Date(parsed);
      d.setHours(12, 0, 0, 0);
      return d;
    }
    return new Date();
  };

  const parseInputDate = (isoStr: string, isEnd: boolean): Date => {
    const [y, m, d] = isoStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (isEnd) {
      date.setHours(23, 59, 59, 999);
    } else {
      date.setHours(0, 0, 0, 0);
    }
    return date;
  };

  // Filtering implementation
  const filteredLeads = visibleLeads.filter((lead) => {
    const matchesSearch =
      lead.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.clientNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.takenService.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.paidBy.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesService = serviceFilter === 'All' || lead.takenService === serviceFilter;
    const matchesPayment = paymentFilter === 'All' || lead.paidBy === paymentFilter;

    let matchesDateRange = true;
    if (startDateFilter || endDateFilter) {
      const recordDate = parseRecordDate(lead.closedDate);
      if (startDateFilter) {
        const start = parseInputDate(startDateFilter, false);
        if (recordDate < start) matchesDateRange = false;
      }
      if (endDateFilter) {
        const end = parseInputDate(endDateFilter, true);
        if (recordDate > end) matchesDateRange = false;
      }
    }

    return matchesSearch && matchesService && matchesPayment && matchesDateRange;
  });

  const escapeCSVCell = (val: string): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    const needsQuotes = str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r');
    const escaped = str.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
  };

  const handleExportLeads = () => {
    if (filteredLeads.length === 0) {
      alert('No closed leads records found to export.');
      return;
    }

    let filename = `closed-leads-export-${new Date().toISOString().split('T')[0]}.csv`;

    const headers = ['Client Name', 'Number', 'Taken Service', 'Amount Paid (INR)', 'Payment Mode', 'Closed Date', 'Closed By'];
    const rows = filteredLeads.map(r => [
      escapeCSVCell(r.clientName),
      escapeCSVCell(r.clientNumber),
      escapeCSVCell(r.takenService),
      String(r.amountPaid || 0),
      escapeCSVCell(r.paidBy),
      escapeCSVCell(r.closedDate),
      escapeCSVCell(r.closedBy || 'Administrator')
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

  const handleOpenEdit = (lead: ClosedLead) => {
    setEditingLead(lead);
    setEditClientName(lead.clientName);
    setEditClientNumber(lead.clientNumber);
    setEditTakenService(lead.takenService);
    setEditAmountPaid(lead.amountPaid);
    setEditClosedBy(lead.closedBy || 'Administrator');
    
    const standardMethods = ['Cash', 'UPI', 'Card', 'Bank Transfer'];
    if (standardMethods.includes(lead.paidBy)) {
      setEditPaidBy(lead.paidBy);
      setEditCustomPaidBy('');
    } else {
      setEditPaidBy('Other');
      setEditCustomPaidBy(lead.paidBy);
    }
    setEditError('');
  };

  const handleSaveEdit = () => {
    if (!editingLead) return;
    if (!editClientName.trim()) {
      setEditError('Client Name is required.');
      return;
    }
    if (!editClientNumber.trim()) {
      setEditError('Client Number is required.');
      return;
    }
    if (!editTakenService) {
      setEditError('Please select a Service.');
      return;
    }
    if (editAmountPaid === '' || isNaN(Number(editAmountPaid)) || Number(editAmountPaid) < 0) {
      setEditError('Please enter a valid Amount Paid.');
      return;
    }
    if (!editClosedBy.trim()) {
      setEditError('Closed By employee is required.');
      return;
    }

    const finalPaidBy = editPaidBy === 'Other' ? editCustomPaidBy.trim() : editPaidBy;
    if (!finalPaidBy) {
      setEditError('Please specify how the payment was made (Paid By).');
      return;
    }

    onSaveClosedLead({
      id: editingLead.id,
      callRecordId: editingLead.callRecordId,
      clientName: editClientName.trim(),
      clientNumber: editClientNumber.trim(),
      takenService: editTakenService,
      amountPaid: Number(editAmountPaid),
      paidBy: finalPaidBy,
      closedBy: editClosedBy.trim(),
    });

    setEditingLead(null);
  };

  const executeDelete = (id: string) => {
    if (onDeleteClosedLead) {
      onDeleteClosedLead(id);
    }
    setDeleteConfirmId(null);
  };

  return (
    <div className="pb-12 space-y-6" id="closed-leads-panel">
      {/* Module Title Block */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Closed Leads Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor closed sales opportunities, track business revenues, audit client services, and edit lead ledger details.
          </p>
        </div>
      </div>

      {/* Financial KPIs Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="closed-leads-stats">
        {/* Total closed deals */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Closed Leads (This Month)</p>
            <p className="text-3xl font-semibold text-slate-900 tracking-tight">{totalLeadsCurrentMonth}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <CheckCircle2 className="w-5.5 h-5.5" />
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Revenue (This Month)</p>
            <p className="text-3xl font-semibold text-slate-900 tracking-tight">₹{totalRevenueCurrentMonth.toLocaleString()}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <Coins className="w-5.5 h-5.5" />
          </div>
        </div>

        {/* Average value */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Average Revenue (This Month)</p>
            <p className="text-3xl font-semibold text-slate-900 tracking-tight">₹{averageLeadValueCurrentMonth.toLocaleString()}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
            <TrendingUp className="w-5.5 h-5.5" />
          </div>
        </div>
      </div>

      {/* Central Interactive Grid */}
      <div className="bg-white border border-slate-200/85 rounded-2xl shadow-xs overflow-hidden" id="closed-datagrid">
        {/* Search & Filters block */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/40 flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Quick Search */}
          <div className="relative w-full md:max-w-xs">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search clients, services, payment modes..."
              className="block w-full pl-9 pr-3 py-2 bg-white border border-slate-205 text-slate-900 placeholder:text-slate-400 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm"
            />
          </div>

          {/* Filters dropdowns */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="py-1.5 pl-3 pr-8 border border-slate-200 rounded-lg bg-white text-xs font-medium text-slate-650 focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-800 cursor-pointer"
            >
              <option value="All">All Services</option>
              {uniqueServices.filter(s => s !== 'All').map((service) => (
                <option key={service} value={service}>
                  {service}
                </option>
              ))}
            </select>

            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="py-1.5 pl-3 pr-8 border border-slate-200 rounded-lg bg-white text-xs font-medium text-slate-650 focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-800 cursor-pointer"
            >
              <option value="All">All Payment Modes</option>
              {uniquePayments.filter(p => p !== 'All').map((payment) => (
                <option key={payment} value={payment}>
                  {payment}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
              <span className="text-[10px] font-semibold text-slate-400 uppercase">From:</span>
              <input
                type="date"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                className="text-xs font-semibold text-slate-700 bg-transparent border-0 focus:outline-hidden p-0 cursor-pointer"
              />
              <span className="text-[10px] font-semibold text-slate-400 uppercase ml-1">To:</span>
              <input
                type="date"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                className="text-xs font-semibold text-slate-700 bg-transparent border-0 focus:outline-hidden p-0 cursor-pointer"
              />
            </div>

            {(searchTerm || serviceFilter !== 'All' || paymentFilter !== 'All' || startDateFilter || endDateFilter) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setServiceFilter('All');
                  setPaymentFilter('All');
                  setStartDateFilter('');
                  setEndDateFilter('');
                }}
                className="py-1.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1 cursor-pointer"
              >
                <span>Reset Filters</span>
              </button>
            )}

            <button
              onClick={handleExportLeads}
              className="py-1.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              id="btn-leads-export"
              title="Export closed leads to CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export Closed Leads</span>
            </button>
          </div>
        </div>

        {/* Table representation */}
        <div className="overflow-x-auto">
          {filteredLeads.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 text-slate-400 border border-slate-100 mb-3 animate-pulse">
                <HeartHandshake className="w-5.5 h-5.5" />
              </div>
              <h3 className="font-semibold text-slate-900 text-sm">No closed leads found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No closed leads match the current filters. Navigate to Call Management - Follow Up Calls and tap "Close Lead" on any Interested call record to close leads.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse" id="closed-leads-table">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/60 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-5">Client Profile</th>
                  <th className="py-3 px-5">Acquired Service</th>
                  <th className="py-3 px-5">Revenue Collected</th>
                  <th className="py-3 px-5">Payment Mode</th>
                  <th className="py-3 px-5">Closing Date</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {filteredLeads.map((lead) => {
                  const isDeleting = deleteConfirmId === lead.id;
                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors" id={`closed-lead-row-${lead.id}`}>
                      {/* Client Name & Phone */}
                      <td className="py-3.5 px-5">
                        <div>
                          <span className="font-semibold text-slate-900 text-sm block leading-snug">
                            {lead.clientName}
                          </span>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span className="text-xs text-slate-500 font-mono">
                              {lead.clientNumber}
                            </span>
                            <span className="text-[10px] text-slate-300">•</span>
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                              Closed by: {lead.closedBy || 'Administrator'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Acquired Service */}
                      <td className="py-3.5 px-5 text-xs">
                        <div className="flex items-center gap-1.5 text-emerald-800 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100/60 w-fit">
                          <HeartHandshake className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>{lead.takenService}</span>
                        </div>
                      </td>

                      {/* Revenue Collected */}
                      <td className="py-3.5 px-5 text-xs text-slate-900 font-bold">
                        <span>₹{lead.amountPaid.toLocaleString()}</span>
                      </td>

                      {/* Payment Mode */}
                      <td className="py-3.5 px-5 text-xs">
                        <div className="flex items-center gap-1.5 text-indigo-700 font-semibold">
                          <CreditCard className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>{lead.paidBy}</span>
                        </div>
                      </td>

                      {/* Closing Date */}
                      <td className="py-3.5 px-5 text-xs text-slate-500">
                        <span className="font-mono">{lead.closedDate}</span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right">
                        {isDeleting ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-[10px] text-red-600 font-semibold mr-1">Delete Lead?</span>
                            <button
                              onClick={() => executeDelete(lead.id)}
                              className="px-1.5 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-[10px] font-bold transition-colors cursor-pointer"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md text-[10px] font-medium transition-colors cursor-pointer"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEdit(lead)}
                              className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Edit closed lead details"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            {onDeleteClosedLead && (
                              <button
                                onClick={() => setDeleteConfirmId(lead.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-650 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete closed record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
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
      </div>

      {/* Edit Closed Lead modal */}
      <AnimatePresence>
        {editingLead && (
          <>
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 transition-opacity"
              onClick={() => setEditingLead(null)}
              id="edit-closed-lead-backdrop"
            />

            <div className="fixed inset-0 flex items-center justify-center p-4 z-50" id="edit-closed-lead-modal-outer">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: 'spring', duration: 0.4 }}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl max-w-md w-full overflow-hidden flex flex-col"
                id="edit-closed-lead-card"
              >
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                      <Edit3 className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-none">Edit Closed Lead Record</h3>
                      <span className="text-[11px] text-slate-450 block mt-1">Modify closed service lead configurations</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingLead(null)}
                    className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Body Form */}
                <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
                  {editError && (
                    <div className="bg-red-50 border border-red-100 text-red-950 p-3.5 rounded-xl text-xs flex gap-2 leading-relaxed">
                      <AlertCircle className="w-4.5 h-4.5 text-red-600 shrink-0" />
                      <span>{editError}</span>
                    </div>
                  )}

                  {/* 1. Client Name */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide" htmlFor="edit-client-name">
                      Client Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        id="edit-client-name"
                        value={editClientName}
                        onChange={(e) => setEditClientName(e.target.value)}
                        className="block w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-205 text-slate-900 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 text-sm"
                      />
                    </div>
                  </div>

                  {/* 2. Client Number */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide" htmlFor="edit-client-number">
                      Client Number <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        id="edit-client-number"
                        value={editClientNumber}
                        onChange={(e) => setEditClientNumber(e.target.value)}
                        className="block w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-205 text-slate-900 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 text-sm"
                      />
                    </div>
                  </div>

                  {/* Closed By Employee */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide" htmlFor="edit-closed-by">
                      Closed By Employee <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <UserCheck className="w-4 h-4 text-slate-450" />
                      </div>
                      <input
                        type="text"
                        id="edit-closed-by"
                        value={editClosedBy}
                        onChange={(e) => setEditClosedBy(e.target.value)}
                        placeholder="E.g., Jane Cooper"
                        className="block w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-205 text-slate-900 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 text-sm"
                      />
                    </div>
                  </div>

                  {/* 3. Taken Service */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide" htmlFor="edit-taken-service">
                      Taken Service <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="edit-taken-service"
                      value={editTakenService}
                      onChange={(e) => setEditTakenService(e.target.value)}
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

                  {/* 4. Amount Paid */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide" htmlFor="edit-amount-paid">
                      Amount Paid (₹) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 text-sm font-bold">
                        ₹
                      </span>
                      <input
                        type="number"
                        id="edit-amount-paid"
                        min="0"
                        value={editAmountPaid}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditAmountPaid(val === '' ? '' : Number(val));
                        }}
                        className="block w-full pl-8 pr-3.5 py-2.5 bg-white border border-slate-205 text-slate-900 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 text-sm"
                      />
                    </div>
                  </div>

                  {/* 5. Paid By */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                      Paid By <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Cash', 'UPI', 'Card', 'Bank Transfer', 'Other'].map((method) => {
                        const isSelected = editPaidBy === method;
                        return (
                          <button
                            type="button"
                            key={method}
                            onClick={() => {
                              setEditPaidBy(method);
                              setEditError('');
                            }}
                            className={`py-2 px-3 text-xs font-semibold rounded-xl border text-center transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-slate-900 text-white border-slate-950 shadow-2xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {method}
                          </button>
                        );
                      })}
                    </div>

                    {editPaidBy === 'Other' && (
                      <div className="mt-2.5">
                        <input
                          type="text"
                          required
                          value={editCustomPaidBy}
                          onChange={(e) => setEditCustomPaidBy(e.target.value)}
                          placeholder="E.g. Cheque / Sponsorship"
                          className="block w-full px-3.5 py-2.5 bg-white border border-slate-205 text-slate-900 placeholder:text-slate-400 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 text-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    onClick={() => setEditingLead(null)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
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
    </div>
  );
}
