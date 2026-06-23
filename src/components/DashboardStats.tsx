/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Users, UserCheck, UserX, Plus } from 'lucide-react';
import { StaffMember } from '../types';

interface DashboardStatsProps {
  staffList: StaffMember[];
  onAddStaffClick: () => void;
}

export default function DashboardStats({ staffList, onAddStaffClick }: DashboardStatsProps) {
  const total = staffList.length;
  const active = staffList.filter((m) => m.status === 'Active').length;
  const suspended = staffList.filter((m) => m.status === 'Suspended').length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8" id="dashboard-stats-grid">
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between" id="stat-total-card">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Staff</p>
          <p className="text-3xl font-semibold text-slate-900 tracking-tight" id="stat-total-count">{total}</p>
        </div>
        <div className="w-11 h-11 rounded-xl bg-slate-50 text-slate-700 flex items-center justify-center border border-slate-100">
          <Users className="w-5.5 h-5.5" />
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between" id="stat-active-card">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Active Accounts</p>
          <div className="flex items-center gap-1.5">
            <p className="text-3xl font-semibold text-slate-900 tracking-tight" id="stat-active-count">{active}</p>
            {total > 0 && (
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                {Math.round((active / total) * 100)}%
              </span>
            )}
          </div>
        </div>
        <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/50">
          <UserCheck className="w-5.5 h-5.5" />
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between" id="stat-suspended-card">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Suspended</p>
          <div className="flex items-center gap-1.5">
            <p className="text-3xl font-semibold text-slate-900 tracking-tight" id="stat-suspended-count">{suspended}</p>
            {total > 0 && suspended > 0 && (
              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">
                {Math.round((suspended / total) * 100)}%
              </span>
            )}
          </div>
        </div>
        <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100/50">
          <UserX className="w-5.5 h-5.5" />
        </div>
      </div>

      {/* Primary Action Button Integrated as an Elegant Grid Card */}
      <button
        onClick={onAddStaffClick}
        className="bg-indigo-600 hover:bg-indigo-700 text-white p-5 rounded-2xl transition-all shadow-md shadow-indigo-600/10 hover:shadow-lg hover:shadow-indigo-600/20 active:scale-[0.99] flex flex-col justify-between text-left group cursor-pointer"
        id="btn-trigger-add-staff"
      >
        <div className="w-9 h-9 rounded-lg bg-indigo-500 text-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
          <Plus className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-medium text-white text-sm">Add New Staff</h3>
          <p className="text-indigo-200 text-xs mt-0.5">Register a new directory user</p>
        </div>
      </button>
    </div>
  );
}
