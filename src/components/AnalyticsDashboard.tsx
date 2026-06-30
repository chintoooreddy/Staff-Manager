/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Users, PhoneCall, Calendar, Bookmark, HeartHandshake, PhoneForwarded, UserCheck, ShieldAlert, Clock, ArrowUpRight, CheckCircle2, User, DollarSign, Coins, TrendingUp } from 'lucide-react';
import { StaffMember, CallRecord, CallStatus, ClosedLead } from '../types';
import Pagination from './Pagination';

interface AnalyticsDashboardProps {
  currentEmail: string;
  staffList: StaffMember[];
  callList: CallRecord[];
  closedLeads?: ClosedLead[];
  currentUserRole?: string;
  currentUserFullName?: string;
}

export default function AnalyticsDashboard({ currentEmail, staffList, callList, closedLeads = [], currentUserRole, currentUserFullName }: AnalyticsDashboardProps) {
  // We'll compute "today"'s date string matching our logged format (e.g. "Jun 23, 2026")
  // Let's formulate the formatted today string
  const formatMonthMap: { [key: number]: string } = {
    0: 'Jan', 1: 'Feb', 2: 'Mar', 3: 'Apr', 4: 'May', 5: 'Jun',
    6: 'Jul', 7: 'Aug', 8: 'Sep', 9: 'Oct', 10: 'Nov', 11: 'Dec'
  };
  const now = new Date();
  const monthStr = formatMonthMap[now.getMonth()];
  const dayStr = String(now.getDate()).padStart(2, '0');
  const yearStr = now.getFullYear();
  const todayDateString = `${monthStr} ${dayStr}, ${yearStr}`;

  const isUserRole = currentUserRole === 'User';
  const effectiveLoggerName = isUserRole && currentUserFullName ? currentUserFullName : null;

  // State to filter individual user's followup details
  const [selectedUserForFollowups, setSelectedUserForFollowups] = useState<string>(
    isUserRole && currentUserFullName ? currentUserFullName : 'Administrator'
  );
  const [followupBoardFilter, setFollowupBoardFilter] = useState<'today' | 'all'>('today');

  // Let's build a list of all possible "Loggers/Users"
  // This includes the pre-defined Administrator and all Active Staff members
  const activeStaffLoggers = staffList
    .filter((member) => member.status === 'Active')
    .map((member) => member.fullName);
  
  const allLoggersList = ['Administrator', ...activeStaffLoggers];

  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const totalItems = allLoggersList.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safePage = Math.min(page, totalPages);
  const paginatedLoggers = allLoggersList.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Helper to calculate daily metrics for a specific logger name
  const getLoggerDailyStats = (loggerName: string) => {
    // New/Initial calls are those logged today (their original created date is today)
    const totalNewCallsToday = callList.filter(
      (c) => c.loggedBy === loggerName && c.createdDate === todayDateString
    ).length;

    // Followups are calls where a follow-up action was completed today
    const totalFollowupsToday = callList.filter(
      (c) => c.loggedBy === loggerName && c.followupCompletedDate === todayDateString
    ).length;

    // Total dials today is the sum of new calls made today and follow-up actions completed today
    const totalToday = totalNewCallsToday + totalFollowupsToday;

    return {
      totalToday,
      totalFollowupsToday,
      totalNewCallsToday,
    };
  };

  // Helper to get today's date string in YYYY-MM-DD format
  const getLocalTodayISOString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get active follow-ups for the selected user (any call status "Interested" or "Call Back" logged by this user)
  const allUserScheduledFollowups = callList.filter(
    (c) => c.loggedBy === selectedUserForFollowups && (c.callStatus === 'Interested' || c.callStatus === 'Call Back')
  );

  const userScheduledFollowups = allUserScheduledFollowups.filter((c) => {
    if (followupBoardFilter === 'today') {
      return c.followupDate === getLocalTodayISOString();
    }
    return true;
  });

  // Stats overall for today (system-wide if Admin, user-specific if User)
  const overallNewCallsToday = callList.filter((c) => {
    const matchesLogger = !effectiveLoggerName || c.loggedBy === effectiveLoggerName;
    return matchesLogger && c.createdDate === todayDateString;
  }).length;

  const overallFollowupsToday = callList.filter((c) => {
    const matchesLogger = !effectiveLoggerName || c.loggedBy === effectiveLoggerName;
    return matchesLogger && c.followupCompletedDate === todayDateString;
  }).length;

  const overallCallsTodayCount = overallNewCallsToday + overallFollowupsToday;

  // Closed Leads & Turnover Calculations (Current Day and Current Month)
  const todayLeads = closedLeads.filter((lead) => lead.closedDate === todayDateString);
  const todayLeadsCount = todayLeads.length;
  const todayTurnover = todayLeads.reduce((acc, lead) => acc + (lead.amountPaid || 0), 0);

  const currentMonthLeads = closedLeads.filter((lead) => {
    if (!lead.closedDate) return false;
    return lead.closedDate.startsWith(monthStr) && lead.closedDate.endsWith(String(yearStr));
  });
  const currentMonthLeadsCount = currentMonthLeads.length;
  const currentMonthTurnover = currentMonthLeads.reduce((acc, lead) => acc + (lead.amountPaid || 0), 0);

  return (
    <div className="space-y-8" id="analytics-dashboard-viewport">
      
      {/* Top Welcome Banner Card */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-lg shadow-slate-900/15" id="analytics-hero">
        <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-5 pointer-events-none hidden md:block">
          <svg className="w-full h-full text-white" viewBox="0 0 100 100" preserveAspectRatio="none" fill="currentColor">
            <polygon points="0,100 100,0 100,100" />
          </svg>
        </div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase mb-4 border border-slate-700">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Today's Date: {todayDateString}</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white leading-tight">
            {isUserRole ? 'User Real-time Dashboard' : 'Console Real-time Operations'}
          </h2>
          <p className="text-slate-400 text-sm mt-1.5 max-w-xl">
            {isUserRole 
              ? 'Your personalized workspace overview of daily call records, followups, and pipelined support client statuses.'
              : 'Live operations overview of all outbound tele-support dials, agent pipeline logs, and active client followups.'}
          </p>
        </div>

        {/* Global Today Counter strip */}
        <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-slate-800 max-w-lg" id="global-today-strips">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold block">
              {isUserRole ? "My Dials Today" : "Today's Dials"}
            </span>
            <span className="text-xl md:text-2xl font-bold text-white block mt-0.5" id="hero-calls-count">{overallCallsTodayCount}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold block">
              {isUserRole ? "My Outbounds Today" : "New Outbounds"}
            </span>
            <span className="text-xl md:text-2xl font-bold text-white block mt-0.5 text-amber-400" id="hero-new-count">{overallNewCallsToday}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold block">
              {isUserRole ? "My Followups Today" : "Scheduled followups"}
            </span>
            <span className="text-xl md:text-2xl font-bold text-indigo-400 block mt-0.5" id="hero-followups-count">{overallFollowupsToday}</span>
          </div>
        </div>
      </div>

      {/* Admin Closed Leads & Turnover Dashboard Section */}
      {!isUserRole && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="admin-closed-leads-kpis">
          {/* Today's Closed Leads */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 md:p-5 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] md:text-[11px] text-slate-500 uppercase tracking-wider font-semibold block">Today's Closed Leads</span>
              <span className="text-xl md:text-2xl font-bold text-slate-900 block font-mono">
                {todayLeadsCount}
              </span>
              <span className="text-[10px] text-slate-400 block">Lead conversions completed today</span>
            </div>
            <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100/60">
              <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-emerald-650" />
            </div>
          </div>

          {/* Today's Turnover */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 md:p-5 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] md:text-[11px] text-slate-500 uppercase tracking-wider font-semibold block">Today's Turnover</span>
              <span className="text-xl md:text-2xl font-bold text-emerald-700 block font-mono">
                ₹{todayTurnover.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-slate-400 block">Revenue generated today</span>
            </div>
            <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100/60">
              <Coins className="w-5 h-5 md:w-6 md:h-6 text-emerald-650" />
            </div>
          </div>

          {/* Current Month's Closed Leads */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 md:p-5 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] md:text-[11px] text-slate-500 uppercase tracking-wider font-semibold block">Month's Closed Leads</span>
              <span className="text-xl md:text-2xl font-bold text-slate-900 block font-mono">
                {currentMonthLeadsCount}
              </span>
              <span className="text-[10px] text-slate-400 block">Acquired in {monthStr} {yearStr}</span>
            </div>
            <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100/60">
              <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-indigo-650" />
            </div>
          </div>

          {/* Current Month's Turnover */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 md:p-5 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] md:text-[11px] text-slate-500 uppercase tracking-wider font-semibold block font-sans">Month's Turnover</span>
              <span className="text-xl md:text-2xl font-bold text-indigo-700 block font-mono">
                ₹{currentMonthTurnover.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-slate-400 block">Total revenue for {monthStr}</span>
            </div>
            <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100/60">
              <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-indigo-650" />
            </div>
          </div>
        </div>
      )}

      {/* Grid: Admin View (Individual Users Stats) and Personal Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="analytics-grid-row">
        
        {/* SECTION A: Admin Individual User Daily Metrics (8 Cols on large) OR User Personal Metrics Breakdown */}
        <div className={isUserRole ? "lg:col-span-7 space-y-4" : "lg:col-span-12 space-y-4"} id="section-admin-users">
          {isUserRole ? (
            <div className="space-y-4" id="user-performance-dashboard">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  My Performance Breakdown
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Detailed analysis of your personal logged activity and client pipelines
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Stat 1: Total Calls logged all-time */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-xs flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg">
                    <PhoneCall className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">Total Logged Dials</span>
                    <span className="text-xl font-bold text-slate-900 block mt-0.5 font-mono">
                      {callList.filter((c) => c.loggedBy === currentUserFullName).length}
                    </span>
                  </div>
                </div>

                {/* Stat 2: Interested count */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-xs flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-lg border border-emerald-100">
                    <HeartHandshake className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">Clients Interested</span>
                    <span className="text-xl font-bold text-emerald-700 block mt-0.5 font-mono">
                      {callList.filter((c) => c.loggedBy === currentUserFullName && c.callStatus === 'Interested').length}
                    </span>
                  </div>
                </div>

                {/* Stat 3: Callbacks pending */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-xs flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-lg border border-indigo-100">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">Call Backs Scheduled</span>
                    <span className="text-xl font-bold text-indigo-700 block mt-0.5 font-mono">
                      {callList.filter((c) => c.loggedBy === currentUserFullName && c.callStatus === 'Call Back').length}
                    </span>
                  </div>
                </div>

                {/* Stat 4: Busy/No Answer */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-xs flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-lg border border-amber-100">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">Busy / No Answer</span>
                    <span className="text-xl font-bold text-amber-600 block mt-0.5 font-mono">
                      {callList.filter((c) => c.loggedBy === currentUserFullName && (c.callStatus === 'Busy' || c.callStatus === 'Not Answered' || c.callStatus === 'Not Reachable')).length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Welcome card for support team member */}
              <div className="bg-gradient-to-tr from-slate-900 to-slate-800 text-white rounded-2xl p-5 relative overflow-hidden shadow-xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300">Logged in as {currentUserFullName}</h4>
                <p className="text-xs text-slate-350 mt-1.5 leading-relaxed">
                  As a workspace operator, you can track daily support dials, schedule followups, and check lead statuses in the <b>Call Management</b> tab. Use the sidebar menu to navigate.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Staff Activity Leaderboard
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Individual users logs and outcome classification for <span className="font-semibold text-slate-800">{todayDateString}</span>
                  </p>
                </div>
              </div>

              <div className="bg-white border border-slate-200/85 rounded-2xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto font-sans">
                  <table className="w-full text-left border-collapse" id="staff-performance-today-table">
                    <thead>
                      <tr className="border-b border-slate-150 bg-slate-50 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-2.5 px-4">Staff Agent Name</th>
                        <th className="py-2.5 px-3 text-center">New Calls</th>
                        <th className="py-2.5 px-3 text-center">Followups</th>
                        <th className="py-2.5 px-4 text-right font-semibold text-slate-900">Total Calls Today</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 text-xs">
                      {paginatedLoggers.map((loggerName) => {
                        const stats = getLoggerDailyStats(loggerName);
                        const isSelf = loggerName === 'Administrator';

                        return (
                          <tr key={loggerName} className="hover:bg-slate-50/40 transition-colors">
                            {/* Name */}
                            <td className="py-2 px-4 font-medium text-slate-900">
                              <div className="flex items-center gap-2">
                                <div className={`w-6.5 h-6.5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                  isSelf ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {loggerName === 'Administrator' ? 'AD' : loggerName.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="truncate">
                                  <span className="text-xs font-semibold">{loggerName}</span>
                                  {isSelf && (
                                    <span className="text-[8px] font-bold bg-indigo-50 text-indigo-700 px-1 py-0.2 rounded ml-1 uppercase border border-indigo-100/40">
                                      You
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Total New Today */}
                            <td className="py-2 px-3 text-center">
                              {stats.totalNewCallsToday > 0 ? (
                                <span className="inline-flex items-center justify-center px-1.5 py-0.2 rounded-full bg-amber-50 text-amber-700 font-mono text-[11px] font-semibold border border-amber-100">
                                  {stats.totalNewCallsToday}
                                </span>
                              ) : (
                                <span className="text-slate-350 font-mono text-[11px]">—</span>
                              )}
                            </td>

                            {/* Total Followups Today */}
                            <td className="py-2 px-3 text-center">
                              {stats.totalFollowupsToday > 0 ? (
                                <span className="inline-flex items-center justify-center px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 font-mono text-[11px] font-semibold border border-emerald-100">
                                  {stats.totalFollowupsToday}
                                </span>
                              ) : (
                                <span className="text-slate-350 font-mono text-[11px]">—</span>
                              )}
                            </td>

                            {/* Grand Total Calls logged Today */}
                            <td className="py-2 px-4 text-right font-bold font-mono text-slate-900 text-xs">
                              {stats.totalToday > 0 ? (
                                <div className="inline-flex items-center gap-0.5 text-slate-950">
                                  <span>{stats.totalToday}</span>
                                  <ArrowUpRight className="w-3 h-3 text-indigo-500" />
                                </div>
                              ) : (
                                <span className="text-slate-300 font-normal">0</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <Pagination
                  currentPage={safePage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  itemsPerPage={pageSize}
                  onPageChange={setPage}
                  onItemsPerPageChange={setPageSize}
                  itemLabel="staff agents"
                />

                {/* Quick Summary Footer banner */}
                <div className="bg-slate-50/60 px-4 py-2 border-t border-slate-150 text-[10px] text-slate-500 flex items-center gap-1.5 font-medium">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Realtime call metrics sync with logged active-session agents.</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* SECTION B: Personal Agent Call count & Follow-ups names and numbers list */}
        {isUserRole && (
          <div className="lg:col-span-5 space-y-4" id="section-personal-followups">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Scheduled Follow-up Board
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Client directory lookup with followup details
                </p>
              </div>

              {/* Selector of which logger followup to view */}
              {!isUserRole ? (
                <select
                  value={selectedUserForFollowups}
                  onChange={(e) => setSelectedUserForFollowups(e.target.value)}
                  className="py-1 px-2.5 border border-slate-200 rounded-lg bg-white text-xs font-semibold text-slate-755 focus:outline-hidden cursor-pointer shadow-2xs"
                  id="followup-agent-filter"
                >
                  {allLoggersList.map((logger) => (
                    <option key={logger} value={logger}>
                      {logger === 'Administrator' ? 'My Followups (Admin)' : `${logger}'s Followups`}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-xs font-bold text-slate-500 font-mono tracking-tight uppercase px-2.5 py-1 bg-slate-100 rounded-lg border border-slate-200/40">
                  My Pipeline
                </span>
              )}
            </div>

            <div className="bg-white border border-slate-200/85 rounded-2xl shadow-xs p-3.5 space-y-3" id="followups-container-card">
              <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                <button
                  onClick={() => setFollowupBoardFilter('today')}
                  className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    followupBoardFilter === 'today'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Current Day follow ups
                </button>
                <button
                  onClick={() => setFollowupBoardFilter('all')}
                  className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    followupBoardFilter === 'all'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All follow ups
                </button>
              </div>

              {/* Short logger visual stats card */}
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-150 flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold block">Agent Name</span>
                  <span className="font-semibold text-slate-900 text-xs block truncate mt-0.5">{selectedUserForFollowups}</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold block">Active Followups</span>
                  <span className="font-bold text-slate-950 font-mono text-xs block mt-0.5">{userScheduledFollowups.length}</span>
                </div>
              </div>

              {/* Followups actual lists (names and numbers) */}
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1" id="followups-mini-scroll">
                {userScheduledFollowups.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50/40">
                    <PhoneForwarded className="w-5 h-5 text-slate-300 mx-auto mb-1.5" />
                    <p className="text-xs text-slate-800 font-medium">
                      {followupBoardFilter === 'today' ? 'No follow-ups for today' : 'No follow-ups recorded'}
                    </p>
                    <p className="text-[9px] text-slate-400 mt-0.5 px-2">
                      {followupBoardFilter === 'today'
                        ? 'No client follow-ups are scheduled for the current date.'
                        : 'This user hasn\'t flagged any client interactions as "Interested" or "Call Back".'}
                    </p>
                  </div>
                ) : (
                  userScheduledFollowups.map((followup) => (
                    <div 
                      key={followup.id} 
                      className="p-2 bg-white border border-slate-155 rounded-xl hover:border-indigo-200 hover:shadow-xs transition-all flex items-start gap-2.5"
                      id={`followup-item-${followup.id}`}
                    >
                      <div className={`w-7 h-7 rounded-md shrink-0 flex items-center justify-center font-bold text-[10px] ${
                        followup.callStatus === 'Interested' ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700'
                      }`}>
                        {followup.callStatus === 'Interested' ? 'IN' : 'CB'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {followup.clientName}
                          </h4>
                          <span className={`text-[8px] font-bold px-1 py-0.2 rounded border ${
                            followup.callStatus === 'Interested' 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
                              : 'bg-indigo-50 text-indigo-800 border-indigo-100'
                          }`}>
                            {followup.callStatus}
                          </span>
                        </div>

                        {/* Number and Date Row */}
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-slate-600 font-mono">
                          <span className="font-semibold text-indigo-650">{followup.clientNumber}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-450 flex items-center gap-0.5">
                            <Calendar className="w-2.5 h-2.5 text-slate-400" />
                            <span>{followup.followupDate}</span>
                          </span>
                        </div>

                        {/* Conditionally showing service name */}
                        {followup.interestedService && (
                          <div className="mt-0.5 text-[9px] font-medium text-emerald-800 bg-emerald-50/50 rounded px-1.5 py-0.2 w-fit border border-emerald-100/30">
                            {followup.interestedService}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          </div>
        )}

      </div>

    </div>
  );
}
