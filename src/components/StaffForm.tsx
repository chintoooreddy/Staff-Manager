/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, User, Mail, ShieldAlert, KeyRound, Eye, EyeOff, Save } from 'lucide-react';
import { StaffMember } from '../types';

interface StaffFormProps {
  onClose: () => void;
  onSave: (memberData: Omit<StaffMember, 'id' | 'joinedDate'> & { id?: string }) => void;
  editingMember?: StaffMember | null;
  existingEmails: string[];
}

export default function StaffForm({ onClose, onSave, editingMember, existingEmails }: StaffFormProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('User');
  const [status, setStatus] = useState<'Active' | 'Suspended'>('Active');
  
  const [showPassword, setShowPassword] = useState(false);
  const [errorCode, setErrorCode] = useState('');

  const rolesList = [
    'Admin',
    'User',
  ];

  // Feed existing record details when editing is triggered
  useEffect(() => {
    if (editingMember) {
      setFullName(editingMember.fullName);
      setEmail(editingMember.email);
      setPassword(''); // Password left blank by default when editing
      setRole(editingMember.role);
      setStatus(editingMember.status);
    } else {
      setFullName('');
      setEmail('');
      setPassword('');
      setRole('User');
      setStatus('Active');
    }
    setErrorCode('');
  }, [editingMember]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorCode('');

    const formattedEmail = email.trim().toLowerCase();

    // Validations
    if (!fullName.trim()) {
      setErrorCode('Full name is required.');
      return;
    }

    if (!formattedEmail) {
      setErrorCode('Username/Email is required.');
      return;
    }

    // Email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formattedEmail)) {
      setErrorCode('Please enter a valid email address (e.g., name@company.com).');
      return;
    }

    // Check duplicate email (if creating OR changing email to someone else's)
    const isDuplicate = existingEmails.some(
      (existing) => 
        existing.toLowerCase() === formattedEmail && 
        (!editingMember || editingMember.email.toLowerCase() !== formattedEmail)
    );
    if (isDuplicate) {
      setErrorCode('This username/email is already assigned to another staff member.');
      return;
    }

    // Password validation for new users
    if (!editingMember && (!password || password.length < 5)) {
      setErrorCode('Password must be at least 5 characters long for security.');
      return;
    }

    // Pass up to parent controller
    onSave({
      id: editingMember?.id,
      fullName: fullName.trim(),
      email: formattedEmail,
      password: password ? password : (editingMember?.password || ''), // keep old if blank
      role,
      status,
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 transition-opacity" 
        onClick={onClose}
        id="side-form-backdrop"
      />

      {/* Pane panel container */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 z-50" id="side-form-container">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="w-screen max-w-md bg-white shadow-2xl flex flex-col h-full border-l border-slate-200"
          id="side-form-body animate"
        >
          {/* Panel Header */}
          <div className="px-6 py-5 border-b border-slate-150 flex items-center justify-between" id="side-form-header">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {editingMember ? 'Edit Staff Details' : 'Create Staff Member'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {editingMember ? 'Update existing user profile characteristics' : 'Register and onboard a new directory user'}
              </p>
            </div>
            <button
               type="button"
               onClick={onClose}
               className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 flex items-center justify-center transition-all cursor-pointer"
               id="btn-close-side-form"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Panel Body Form */}
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 bg-slate-50/50" id="staff-form">
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Error Callout */}
              {errorCode && (
                <div className="bg-red-50 border border-red-100 text-red-950 p-3.5 rounded-xl text-xs flex gap-2 leading-relaxed" id="form-error-banner">
                  <ShieldAlert className="w-4.5 h-4.5 text-red-600 shrink-0 mt-0.5" />
                  <span>{errorCode}</span>
                </div>
              )}

              {/* Input Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5" htmlFor="field-fullname">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    id="field-fullname"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="block w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-205 text-slate-900 placeholder:text-slate-400 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm"
                    placeholder="Enter full name"
                  />
                </div>
              </div>

              {/* Input Email/Username */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5" htmlFor="field-email">
                  Username / Email <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    id="field-email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-205 text-slate-900 placeholder:text-slate-400 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm"
                    placeholder="username@company.com"
                  />
                </div>
              </div>

              {/* Input Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide" htmlFor="field-password">
                    Password {editingMember ? <span className="text-slate-400 font-normal lowercase">(optional override)</span> : <span className="text-rose-500">*</span>}
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="field-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={editingMember ? '•••••••• (Leave empty to keep current)' : 'Set entry password'}
                    required={!editingMember}
                    className="block w-full pl-9 pr-10 py-2.5 bg-white border border-slate-205 text-slate-900 placeholder:text-slate-400 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                    id="btn-toggle-form-password"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Select Role */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5" htmlFor="field-role">
                  Department / Role
                </label>
                <select
                  id="field-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="block w-full py-2.5 px-3 border border-slate-205 bg-white text-slate-900 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm"
                >
                  {rolesList.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Choose Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5" id="label-status">
                  Access Statuses
                </label>
                <div className="grid grid-cols-2 gap-3" id="field-stauts-grid">
                  <button
                    type="button"
                    onClick={() => setStatus('Active')}
                    className={`p-3.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      status === 'Active'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50/80'
                    }`}
                    id="btn-status-active"
                  >
                    <span className="text-xs font-semibold">Active</span>
                    <span className={`text-[10px] ${status === 'Active' ? 'text-indigo-200' : 'text-slate-400'}`}>
                      Permitted console log-in
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatus('Suspended')}
                    className={`p-3.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      status === 'Suspended'
                        ? 'bg-red-950 text-rose-100 border-red-900 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50/80'
                    }`}
                    id="btn-status-suspended"
                  >
                    <span className="text-xs font-semibold">Suspended</span>
                    <span className={`text-[10px] ${status === 'Suspended' ? 'text-red-300' : 'text-slate-400'}`}>
                      Revoked portal privilege
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Form actions footer */}
            <div className="px-6 py-4 bg-white border-t border-slate-150 flex items-center justify-end gap-3" id="form-actions-footer">
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-755 hover:bg-slate-50 text-sm font-medium transition-colors cursor-pointer"
                id="btn-cancel-post-form"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-2.5 px-5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 text-sm font-medium transition-all inline-flex items-center gap-2 cursor-pointer shadow-md shadow-slate-900/10"
                id="btn-save-staff"
              >
                <Save className="w-4 h-4" />
                <span>{editingMember ? 'Save Changes' : 'Onboard Member'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </>
  );
}
