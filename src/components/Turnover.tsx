/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Coins, TrendingUp, Users, Search, Award, Briefcase, 
  ArrowUpRight, Calendar, Landmark, Percent, ChevronRight, Download
} from 'lucide-react';
import { ClosedLead, StaffMember } from '../types';

interface TurnoverProps {
  closedLeads: ClosedLead[];
  staffList: StaffMember[];
}

export default function Turnover({ closedLeads, staffList }: TurnoverProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const escapeCSVCell = (val: string): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    const needsQuotes = str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r');
    const escaped = str.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
  };

  // Helper to identify current month & year
  const now = new Date();
  const formatMonthMap: { [key: number]: string } = {
    0: 'Jan', 1: 'Feb', 2: 'Mar', 3: 'Apr', 4: 'May', 5: 'Jun',
    6: 'Jul', 7: 'Aug', 8: 'Sep', 9: 'Oct', 10: 'Nov', 11: 'Dec'
  };
  const currentMonthName = formatMonthMap[now.getMonth()];
  const currentYearStr = String(now.getFullYear());

  const isCurrentMonthLead = (lead: ClosedLead) => {
    if (!lead.closedDate) return false;
    return lead.closedDate.startsWith(currentMonthName) && lead.closedDate.endsWith(currentYearStr);
  };

  // 1. Overall Company Stats
  const currentMonthLeads = closedLeads.filter(isCurrentMonthLead);
  
  const overallMonthTurnover = currentMonthLeads.reduce((sum, c) => sum + (c.amountPaid || 0), 0);
  const overallTotalTurnover = closedLeads.reduce((sum, c) => sum + (c.amountPaid || 0), 0);

  // 2. Build the list of all employees (Union of active/suspended staff + any name in closedLeads)
  const staffNamesInList = staffList.map(s => s.fullName);
  const uniqueClosedByNames = Array.from(new Set(closedLeads.map(c => c.closedBy || 'Administrator')));
  
  // Combine them to get all unique employee names
  const allEmployeeNames = Array.from(new Set([...staffNamesInList, ...uniqueClosedByNames]));

  // 3. Compute turnover details per employee
  const employeeTurnovers = allEmployeeNames.map((name) => {
    // Find matching staff member to show email/status if exists
    const staffInfo = staffList.find(s => s.fullName.toLowerCase() === name.toLowerCase());
    
    // Closed leads for this employee
    const myLeads = closedLeads.filter(c => (c.closedBy || 'Administrator').toLowerCase() === name.toLowerCase());
    const myMonthLeads = myLeads.filter(isCurrentMonthLead);

    const monthTurnover = myMonthLeads.reduce((sum, c) => sum + (c.amountPaid || 0), 0);
    const totalTurnover = myLeads.reduce((sum, c) => sum + (c.amountPaid || 0), 0);

    return {
      name,
      email: staffInfo?.email || 'N/A (Preseeded / Guest)',
      status: staffInfo?.status || 'Active',
      role: staffInfo?.role || 'Agent',
      monthTurnover,
      totalTurnover,
      monthLeadCount: myMonthLeads.length,
      totalLeadCount: myLeads.length,
    };
  });

  // Sort employees by current month turnover (descending) as default
  const sortedEmployees = [...employeeTurnovers].sort((a, b) => b.monthTurnover - a.monthTurnover);

  // Filter based on search term
  const filteredEmployees = sortedEmployees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Find Top Performer of this month
  const topPerformer = sortedEmployees.find(e => e.monthTurnover > 0);

  const handleExportTurnover = () => {
    if (filteredEmployees.length === 0) {
      alert('No turnover records found to export.');
      return;
    }

    let filename = `turnover-matrix-export-${new Date().toISOString().split('T')[0]}.csv`;

    const headers = ['Employee Name', 'Role', 'Email', 'Status', `Turnover (${currentMonthName})`, 'Total Cumulative Turnover', 'Monthly Deals Closed', 'All-Time Deals Closed'];
    const rows = filteredEmployees.map(e => [
      escapeCSVCell(e.name),
      escapeCSVCell(e.role),
      escapeCSVCell(e.email),
      escapeCSVCell(e.status),
      String(e.monthTurnover),
      String(e.totalTurnover),
      String(e.monthLeadCount),
      String(e.totalLeadCount)
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

  return (
    <div className="pb-12 space-y-6" id="turnover-panel">
      {/* Module Title Block */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Corporate Turnover Ledger
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Audit and track agent-wise sales turnover for the current month vs. all-time totals, and view cumulative company performance.
          </p>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="turnover-overall-stats">
        {/* Overall Month Turnover */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Company Turnover (This Month)</p>
            <p className="text-3xl font-semibold text-slate-900 tracking-tight">₹{overallMonthTurnover.toLocaleString()}</p>
            <span className="text-[11px] text-slate-450 block mt-1">For {currentMonthName} {currentYearStr}</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <Coins className="w-5.5 h-5.5" />
          </div>
        </div>

        {/* Overall Cumulative Turnover */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Overall Cumulative Turnover</p>
            <p className="text-3xl font-semibold text-slate-900 tracking-tight">₹{overallTotalTurnover.toLocaleString()}</p>
            <span className="text-[11px] text-slate-450 block mt-1">Combined total across all employees</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <Landmark className="w-5.5 h-5.5" />
          </div>
        </div>

        {/* Top Performer Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Top Monthly Performer</p>
            {topPerformer ? (
              <>
                <p className="text-xl font-bold text-slate-900 tracking-tight truncate max-w-[180px] mt-1">{topPerformer.name}</p>
                <span className="text-[11px] text-emerald-600 font-semibold block mt-1 flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  ₹{topPerformer.monthTurnover.toLocaleString()} this month
                </span>
              </>
            ) : (
              <>
                <p className="text-lg font-bold text-slate-400 tracking-tight mt-1">No sales closed</p>
                <span className="text-[11px] text-slate-400 block mt-1">No sales recorded yet this month</span>
              </>
            )}
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
            <Award className="w-5.5 h-5.5" />
          </div>
        </div>
      </div>

      {/* Main Ledger Grid & Breakdown */}
      <div className="bg-white border border-slate-200/85 rounded-2xl shadow-xs overflow-hidden" id="turnover-ledger">
        {/* Table Filter/Search header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/40 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Employee Sales Performance Matrix</h2>
            <p className="text-xs text-slate-450 mt-0.5">Real-time breakdown of turnover generated per corporate representative</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:max-w-md md:justify-end">
            <div className="relative w-full sm:max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by agent name, email or role..."
                className="block w-full pl-9 pr-3 py-2 bg-white border border-slate-205 text-slate-900 placeholder:text-slate-400 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm"
              />
            </div>
            
            <button
              onClick={handleExportTurnover}
              className="py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs shrink-0 w-full sm:w-auto justify-center"
              id="btn-turnover-export"
              title="Export turnover to CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export Matrix</span>
            </button>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 text-slate-400 border border-slate-100 mb-3 animate-pulse">
                <Users className="w-5.5 h-5.5" />
              </div>
              <h3 className="font-semibold text-slate-900 text-sm">No employees found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No staff members match the search keywords. Verify the spelling or add staff in the Staff Management module.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse" id="turnover-employees-table">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/60 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Employee Representative</th>
                  <th className="py-3.5 px-5">Turnover ({currentMonthName})</th>
                  <th className="py-3.5 px-5">Total Cumulative Turnover</th>
                  <th className="py-3.5 px-5">Monthly Share (%)</th>
                  <th className="py-3.5 px-5">Monthly Deals / All-Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {filteredEmployees.map((emp) => {
                  // Compute share % of current month
                  const sharePercent = overallMonthTurnover > 0 
                    ? Math.round((emp.monthTurnover / overallMonthTurnover) * 100) 
                    : 0;

                  return (
                    <tr key={emp.name} className="hover:bg-slate-50/40 transition-colors" id={`turnover-row-${emp.name.replace(/\s+/g, '-').toLowerCase()}`}>
                      {/* Name & Role */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 text-slate-750 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {emp.name.substring(0, 2)}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 text-sm block leading-snug">
                              {emp.name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[11px] text-slate-500 font-medium">{emp.role}</span>
                              <span className="text-[10px] text-slate-300">•</span>
                              <span className="text-[10px] text-slate-450 font-mono truncate max-w-[150px]" title={emp.email}>{emp.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Current Month Turnover */}
                      <td className="py-4 px-5 text-sm">
                        <div className="flex flex-col">
                          <span className={`font-bold ${emp.monthTurnover > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                            ₹{emp.monthTurnover.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-450 mt-0.5">
                            {currentMonthName} ledger
                          </span>
                        </div>
                      </td>

                      {/* All time cumulative turnover */}
                      <td className="py-4 px-5 text-sm">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-850">
                            ₹{emp.totalTurnover.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-450 mt-0.5">
                            All-time ledger
                          </span>
                        </div>
                      </td>

                      {/* Monthly Share % visual indicator */}
                      <td className="py-4 px-5">
                        <div className="space-y-1.5 max-w-[140px]">
                          <div className="flex items-center justify-between text-xs font-semibold text-slate-750">
                            <span>{sharePercent}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-600 rounded-full transition-all duration-500" 
                              style={{ width: `${sharePercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Deals counts */}
                      <td className="py-4 px-5 text-xs text-slate-650 font-semibold">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-900 font-bold">{emp.monthLeadCount}</span>
                          <span className="text-slate-300">/</span>
                          <span className="text-slate-500">{emp.totalLeadCount} deals</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
