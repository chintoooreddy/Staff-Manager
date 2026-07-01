/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, User, Phone, ClipboardList, Calendar, ShieldAlert, HeartHandshake, Save } from 'lucide-react';
import { CallRecord, CallStatus, StaffMember, ServiceItem } from '../types';

interface CallFormProps {
  onClose: () => void;
  onSave: (callData: Omit<CallRecord, 'id' | 'createdDate'> & { id?: string }) => void;
  editingCall?: CallRecord | null;
  staffList: StaffMember[];
  currentAdminEmail: string;
  activeServices: ServiceItem[];
  currentUserRole?: string;
  currentUserFullName?: string;
  existingCalls?: CallRecord[];
}

export default function CallForm({ onClose, onSave, editingCall, staffList, currentAdminEmail, activeServices, currentUserRole, currentUserFullName, existingCalls }: CallFormProps) {
  const [clientName, setClientName] = useState('');
  const [clientNumber, setClientNumber] = useState('');
  const [callStatus, setCallStatus] = useState<CallStatus>('Interested');
  const [followupDate, setFollowupDate] = useState('');
  const [interestedService, setInterestedService] = useState('');
  const [loggedBy, setLoggedBy] = useState('Administrator');
  const [notes, setNotes] = useState('');
  const [errorCode, setErrorCode] = useState('');

  // Populate data when editing is triggered
  useEffect(() => {
    const firstActiveServiceName = activeServices[0]?.name || '';
    if (editingCall) {
      setClientName(editingCall.clientName);
      setClientNumber(editingCall.clientNumber);
      setCallStatus(editingCall.callStatus);
      setFollowupDate(editingCall.followupDate || '');
      setInterestedService(editingCall.interestedService || firstActiveServiceName);
      setLoggedBy(editingCall.loggedBy);
      setNotes(editingCall.notes || '');
    } else {
      setClientName('');
      setClientNumber('');
      setCallStatus('Interested');
      setFollowupDate('');
      setInterestedService(firstActiveServiceName);
      setLoggedBy(currentUserRole === 'User' ? (currentUserFullName || 'User') : 'Administrator');
      setNotes('');
    }
    setErrorCode('');
  }, [editingCall, activeServices, currentUserRole, currentUserFullName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorCode('');

    if (!clientName.trim()) {
      setErrorCode('Client Name is required.');
      return;
    }

    if (!clientNumber.trim()) {
      setErrorCode('Client Number is required.');
      return;
    }

    // Basic number validation (numbers, spaces, plus, dashes, parentheses)
    const phoneRegex = /^[+]?[0-9\s\-()]{5,20}$/;
    if (!phoneRegex.test(clientNumber)) {
      setErrorCode('Please enter a valid Client phone number.');
      return;
    }

    // Check if user tried to log a new call with an existing client mobile number
    if (!editingCall && existingCalls) {
      const cleanInput = clientNumber.replace(/[\s\-\(\)\+]/g, '').toLowerCase();
      const isDuplicate = existingCalls.some(
        (c) => (c.clientNumber || '').replace(/[\s\-\(\)\+]/g, '').toLowerCase() === cleanInput
      );
      if (isDuplicate) {
        setErrorCode(
          "This mobile number is already existed. Use 'Existing Client Follow-up' feature in Lookup instead create new call log."
        );
        return;
      }
    }

    // Conditional requirements check 
    const needsFollowup = callStatus === 'Interested' || callStatus === 'Call Back' || callStatus === 'Positive';
    if (needsFollowup && !followupDate) {
      setErrorCode('A followup date is strictly required for this call status.');
      return;
    }

    const needsService = callStatus === 'Interested';
    if (needsService && !interestedService) {
      setErrorCode('An Interested Service must be selected.');
      return;
    }

    onSave({
      id: editingCall?.id,
      clientName: clientName.trim(),
      clientNumber: clientNumber.trim(),
      callStatus,
      followupDate: needsFollowup ? followupDate : undefined,
      interestedService: needsService ? interestedService : undefined,
      loggedBy,
      notes: notes.trim() || undefined,
    });
  };

  const needsFollowup = callStatus === 'Interested' || callStatus === 'Call Back' || callStatus === 'Positive';
  const needsService = callStatus === 'Interested';

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 transition-opacity" 
        onClick={onClose}
        id="call-form-backdrop"
      />

      {/* Slide pane panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 z-50" id="call-form-drawer">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="w-screen max-w-md bg-white shadow-2xl flex flex-col h-full border-l border-slate-200"
          id="call-form-body-container"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-150 flex items-center justify-between" id="call-form-header">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {editingCall ? 'Edit Call Record' : 'Log New Call'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {editingCall ? 'Modify logged conversation parameters' : 'Record client outreach and follow-up activities'}
              </p>
            </div>
            <button
               type="button"
               onClick={onClose}
               className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 flex items-center justify-center transition-all cursor-pointer"
               id="btn-close-call-form"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 bg-slate-50/50" id="call-submission-form">
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Error banner */}
              {errorCode && (
                <div className="bg-red-50 border border-red-100 text-red-950 p-3.5 rounded-xl text-xs flex gap-2 leading-relaxed" id="call-form-error">
                  <ShieldAlert className="w-4.5 h-4.5 text-red-600 shrink-0 mt-0.5" />
                  <span>{errorCode}</span>
                </div>
              )}

              {/* Client Name Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5" htmlFor="call-client-name">
                  Client Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    id="call-client-name"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="block w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-205 text-slate-900 placeholder:text-slate-400 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm"
                    placeholder="E.g., Alexander Wright"
                  />
                </div>
              </div>

              {/* Client Number Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5" htmlFor="call-client-number">
                  Client Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    id="call-client-number"
                    required
                    value={clientNumber}
                    onChange={(e) => setClientNumber(e.target.value)}
                    className="block w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-205 text-slate-900 placeholder:text-slate-400 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm"
                    placeholder="E.g., +1 (555) 019-2834"
                  />
                </div>
              </div>

              {/* Status Radio Buttons */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
                  Call Status <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2" id="status-selection-box">
                  {(['Interested', 'Call Back', 'Not Answered', 'Busy', 'Not Reachable', 'Not Interested', 'Positive'] as CallStatus[]).map((status) => {
                    let activeStyle = '';
                    switch (status) {
                      case 'Interested':
                        activeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-400 ring-2 ring-emerald-50';
                        break;
                      case 'Call Back':
                        activeStyle = 'bg-indigo-50 text-indigo-800 border-indigo-400 ring-2 ring-indigo-50';
                        break;
                      case 'Not Answered':
                        activeStyle = 'bg-slate-100 text-slate-800 border-slate-400';
                        break;
                      case 'Busy':
                        activeStyle = 'bg-amber-50 text-amber-800 border-amber-400';
                        break;
                      case 'Not Reachable':
                        activeStyle = 'bg-rose-50 text-rose-850 border-rose-400';
                        break;
                      case 'Not Interested':
                        activeStyle = 'bg-slate-100 text-slate-700 border-slate-400';
                        break;
                      case 'Positive':
                        activeStyle = 'bg-cyan-50 text-cyan-800 border-cyan-400 ring-2 ring-cyan-50';
                        break;
                    }

                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => {
                          setCallStatus(status);
                          // Clear conditionally rendered inputs if not appropriate
                          if (status !== 'Interested' && status !== 'Call Back' && status !== 'Positive') {
                            setFollowupDate('');
                          }
                        }}
                        className={`py-2 px-3 rounded-xl border text-left text-xs font-medium transition-all cursor-pointer ${
                          callStatus === status
                            ? activeStyle
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {status}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Conditional Follow-up Date Field (ONLY for Interested and Call Back) */}
              {needsFollowup && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-1.5"
                  id="conditional-followup shadow"
                >
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide" htmlFor="call-followup-date">
                    Follow-up Date <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <input
                      type="date"
                      id="call-followup-date"
                      required
                      value={followupDate}
                      onChange={(e) => setFollowupDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]} // Prevents double logging backward entries
                      className="block w-full pl-9 pr-3.5 py-2.5 bg-white border border-teal-200 text-slate-900 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-100 focus:border-indigo-650 transition-all text-sm"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block italic leading-tight">
                    * Follow-up date required to ensure proper tracking and scheduling.
                  </span>
                </motion.div>
              )}

              {/* Conditional Interested Service Field (ONLY for Interested status) */}
              {needsService && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-1.5"
                  id="conditional-service-selector"
                >
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide" htmlFor="call-interested-service">
                    Interested Service <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <HeartHandshake className="w-4 h-4" />
                    </div>
                    <select
                      id="call-interested-service"
                      required
                      value={interestedService}
                      onChange={(e) => setInterestedService(e.target.value)}
                      className="block w-full pl-9 pr-10 py-2.5 bg-white border border-slate-205 text-slate-900 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm cursor-pointer"
                    >
                      {activeServices.length === 0 ? (
                        <option value="">No active services configured</option>
                      ) : (
                        activeServices.map((service) => (
                          <option key={service.id} value={service.name}>
                            {service.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </motion.div>
              )}

              {/* Logger Selection Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5" htmlFor="call-logged-by">
                  Logged By (Staff Agent)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <ClipboardList className="w-4 h-4" />
                  </div>
                  <select
                    id="call-logged-by"
                    value={loggedBy}
                    onChange={(e) => setLoggedBy(e.target.value)}
                    disabled={currentUserRole === 'User'}
                    className="block w-full pl-9 pr-10 py-2.5 bg-white border border-slate-205 text-slate-900 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm cursor-pointer disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                  >
                    <option value="Administrator">Administrator ({currentAdminEmail})</option>
                    {staffList
                      .filter((member) => member.status === 'Active')
                      .map((member) => (
                        <option key={member.id} value={member.fullName}>
                          {member.fullName} ({member.role})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Additional Log Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5" htmlFor="call-notes">
                  Outreach Notes / Log Comments
                </label>
                <textarea
                  id="call-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Record summary of client reaction, concerns, or requests..."
                  className="block w-full px-3.5 py-2 bg-white border border-slate-205 text-slate-900 placeholder:text-slate-400 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-xs"
                />
              </div>

            </div>

            {/* Form actions footer */}
            <div className="px-6 py-4 bg-white border-t border-slate-150 flex items-center justify-end gap-3" id="call-form-actions-footer">
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-755 hover:bg-slate-50 text-sm font-medium transition-colors cursor-pointer"
                id="btn-cancel-call-log"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-2.5 px-5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 text-sm font-medium transition-all inline-flex items-center gap-2 cursor-pointer shadow-md shadow-slate-900/10"
                id="btn-save-call"
              >
                <Save className="w-4 h-4" />
                <span>{editingCall ? 'Save Call Details' : 'Verify & Log Call'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </>
  );
}
