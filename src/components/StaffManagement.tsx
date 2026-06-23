/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Search, SlidersHorizontal, UserMinus, Edit2, LogOut, Lock, Clock, Check, ShieldCheck, Mail, Briefcase } from 'lucide-react';
import { StaffMember, StaffFilterStatus } from '../types';
import DashboardStats from './DashboardStats';

interface StaffManagementProps {
  currentEmail: string;
  staffList: StaffMember[];
  onLogout: () => void;
  onAddStaff: () => void;
  onEditStaff: (member: StaffMember) => void;
  onDeleteStaff: (id: string) => void;
}

export default function StaffManagement({
  staffList,
  onAddStaff,
  onEditStaff,
  onDeleteStaff,
}: Omit<StaffManagementProps, 'currentEmail' | 'onLogout'>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StaffFilterStatus>('All');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Distinct color set for staff avatars
  const avatarColors = [
    'bg-blue-50 text-blue-700 border-blue-200',
    'bg-emerald-50 text-emerald-700 border-emerald-200',
    'bg-violet-50 text-violet-700 border-violet-200',
    'bg-amber-50 text-amber-700 border-amber-200',
    'bg-rose-50 text-rose-700 border-rose-200',
    'bg-cyan-50 text-cyan-700 border-cyan-200',
  ];

  const getAvatarStyle = (name: string) => {
    const code = name.charCodeAt(0) + (name.charCodeAt(1) || 0);
    return avatarColors[code % avatarColors.length];
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Get dynamic unique roles list for filtering
  const availableRoles = ['All', ...Array.from(new Set(staffList.map((m) => m.role)))];

  // Perform filtering logic
  const filteredStaff = staffList.filter((m) => {
    const matchesSearch = 
      m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.role.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || m.status === statusFilter;
    const matchesRole = roleFilter === 'All' || m.role === roleFilter;

    return matchesSearch && matchesStatus && matchesRole;
  });

  return (
    <div id="staff-dashboard-root">
      {/* Module Title Block */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6" id="title-wrapper">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Staff Management System
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Supervise user lists, view job profiles, create access credentials, and moderate active sessions.
          </p>
        </div>
      </div>

      {/* Dynamic Metric Widget Blocks */}
      <DashboardStats 
        staffList={staffList} 
        onAddStaffClick={onAddStaff} 
      />

      {/* Directory Controls and Database Table Log Box */}
      <div className="bg-white border border-slate-200/85 rounded-2xl shadow-xs overflow-hidden" id="directory-panel">
          
          {/* Header Controls */}
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/40 flex flex-col md:flex-row gap-3 items-center justify-between" id="filter-shelf">
            
            {/* Search Input */}
            <div className="relative w-full md:max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search staff, email, role..."
                className="block w-full pl-9 pr-3 py-2 bg-white border border-slate-205 text-slate-900 placeholder:text-slate-400 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm"
                id="staff-search-input"
              />
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto" id="filter-actions-group">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-widest mr-1">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-450" />
                <span>Filters:</span>
              </div>

              {/* Status Filters Toggle Selector */}
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1" id="status-toggle-wrapper">
                {(['All', 'Active', 'Suspended'] as StaffFilterStatus[]).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                      statusFilter === status
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              {/* Department Roles Select Filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="py-1.5 pl-3 pr-8 border border-slate-200 rounded-lg bg-white text-xs font-medium text-slate-650 focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-800 cursor-pointer"
                id="role-filter-select"
              >
                <option value="All">All Roles</option>
                {availableRoles.filter(r => r !== 'All').map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>

            </div>
          </div>

          {/* Database Listings Output */}
          <div className="overflow-x-auto" id="table-scroll-container">
            {filteredStaff.length === 0 ? (
              <div className="text-center py-12 px-4" id="empty-results-fallback">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-400 mb-3">
                  <Search className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-slate-900 text-sm">No staff members found</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Try adjusting your search terms or filters to locate specific directory profiles, or onboard a new staff record.
                </p>
                {(searchTerm || statusFilter !== 'All' || roleFilter !== 'All') && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('All');
                      setRoleFilter('All');
                    }}
                    className="mt-4 text-xs font-semibold text-slate-900 hover:underline cursor-pointer"
                    id="btn-filters-reset"
                  >
                    Reset filters
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full text-left border-collapse" id="staff-directory-table">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/60 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-5">Staff Member</th>
                    <th className="py-3 px-5 hidden md:table-cell">Username / Email</th>
                    <th className="py-3 px-5 hidden sm:table-cell">Department Role</th>
                    <th className="py-3 px-5">Onboard Date</th>
                    <th className="py-3 px-5">Security Status</th>
                    <th className="py-3 px-5 text-right">Moderations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {filteredStaff.map((member) => {
                    const isDeleting = deleteConfirmId === member.id;
                    const avatarStyle = getAvatarStyle(member.fullName);

                    return (
                      <tr key={member.id} className="hover:bg-slate-50/50 transition-colors" id={`staff-row-${member.id}`}>
                        
                        {/* Member Column */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full border flex items-center justify-center font-semibold text-xs shrink-0 ${avatarStyle}`}>
                              {getInitials(member.fullName)}
                            </div>
                            <div>
                              <span className="font-semibold text-slate-900 text-sm block leading-tight">
                                {member.fullName}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono mt-0.5 sm:hidden block">
                                {member.email}
                              </span>
                              <span className="text-[11px] text-slate-500 mt-0.5 sm:hidden block font-medium">
                                {member.role}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Email Column */}
                        <td className="py-3.5 px-5 text-xs text-slate-600 font-mono hidden md:table-cell">
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span>{member.email}</span>
                          </div>
                        </td>

                        {/* Role Column */}
                        <td className="py-3.5 px-5 text-xs text-slate-600 font-medium hidden sm:table-cell">
                          <div className="flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                            <span>{member.role}</span>
                          </div>
                        </td>

                        {/* Joined Date Column */}
                        <td className="py-3.5 px-5 text-xs text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{member.joinedDate}</span>
                          </div>
                        </td>

                        {/* Access Status badge */}
                        <td className="py-3.5 px-5 text-xs">
                          {member.status === 'Active' ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[11px] font-medium border border-emerald-100">
                              <Check className="w-3 h-3" />
                              <span>Active</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-2 py-0.5 rounded-full text-[11px] font-medium border border-red-100">
                              <Lock className="w-3 h-3" />
                              <span>Suspended</span>
                            </span>
                          )}
                        </td>

                        {/* Actions buttons */}
                        <td className="py-3.5 px-5 text-right">
                          {isDeleting ? (
                            <div className="flex items-center justify-end gap-1.5" id={`delete-confirm-${member.id}`}>
                              <span className="text-[10px] text-red-600 font-medium mr-1.5">Are you sure?</span>
                              <button
                                onClick={() => onDeleteStaff(member.id)}
                                className="px-2 py-1 bg-red-650 hover:bg-red-750 text-white rounded-md text-[11px] font-semibold transition-colors cursor-pointer"
                              >
                                Delete
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-medium transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2" id={`row-actions-${member.id}`}>
                              <button
                                onClick={() => onEditStaff(member)}
                                className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Edit configuration"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(member.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete user"
                              >
                                <UserMinus className="w-4 h-4" />
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

          {/* Database Footer Status Lock */}
          <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-2" id="database-footer-status">
            <span className="text-xs text-slate-500 font-medium">
              Showing <span className="font-semibold text-slate-800">{filteredStaff.length}</span> of <span className="font-semibold text-slate-800">{staffList.length}</span> entries
            </span>
            <div className="flex items-center gap-1.5 text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] font-semibold uppercase tracking-wider font-mono">STAFF_SYNC_ACTIVE_OK</span>
            </div>
          </div>

        </div>
    </div>
  );
}
