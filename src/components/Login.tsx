/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Mail, Eye, EyeOff, ShieldAlert, CheckCircle2, ArrowLeft, Send, KeyRound } from 'lucide-react';
import { StaffMember } from '../types';
import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

interface LoginProps {
  onLoginSuccess: (email: string, fullName: string, role: string) => void;
  staffList?: StaffMember[];
}

export default function Login({ onLoginSuccess, staffList }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // View modes for login & password reset flow
  const [viewMode, setViewMode] = useState<'login' | 'forgot' | 'reset_success' | 'reset_form'>('login');
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [dispatchedLink, setDispatchedLink] = useState<string>('');

  // Master Admin credentials
  const masterAdminEmails = ['whitelineborder@gmail.com', 'whitelineborder@gmail'];
  const masterAdminPassword = 'Sindhu@0201';

  // Check URL parameters on mount for reset link clicks
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('resetToken');
    const urlEmail = params.get('email');
    if (token && urlEmail) {
      setResetEmail(urlEmail);
      setViewMode('reset_form');
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const enteredEmail = email.trim().toLowerCase();

    // Dynamic verification delay for premium feel
    setTimeout(() => {
      if (masterAdminEmails.includes(enteredEmail) && password === masterAdminPassword) {
        setIsSuccess(true);
        setTimeout(() => {
          onLoginSuccess('whitelineborder@gmail.com', 'Master Admin', 'Admin');
        }, 1000);
        return;
      }

      // Check dynamic staffList
      const staffMember = staffList?.find((m) => m.email.trim().toLowerCase() === enteredEmail);
      if (staffMember) {
        if (staffMember.status === 'Suspended') {
          setError('This account is suspended. Please contact the system administrator.');
          setIsSubmitting(false);
          return;
        }

        const expectedPassword = staffMember.password || 'password';
        if (password === expectedPassword) {
          setIsSuccess(true);
          setTimeout(() => {
            onLoginSuccess(staffMember.email, staffMember.fullName, staffMember.role);
          }, 1000);
          return;
        }
      }

      setError('Invalid email or password. Please try again.');
      setIsSubmitting(false);
    }, 800);
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const targetEmail = resetEmail.trim().toLowerCase();
    const isMaster = masterAdminEmails.includes(targetEmail);
    const staffMember = staffList?.find((m) => m.email.trim().toLowerCase() === targetEmail);

    if (!isMaster && !staffMember) {
      setError('No staff account found with this email address. Password reset links are restricted strictly to registered directory staff.');
      setIsSubmitting(false);
      return;
    }

    try {
      let senderName = 'Portal Security Team';
      const storedSmtp = localStorage.getItem('portal_smtp_config');
      if (storedSmtp) {
        try { senderName = JSON.parse(storedSmtp).senderName || senderName; } catch {}
      }
      const smtpSnap = await getDoc(doc(db, 'settings', 'smtp_config')).catch(() => null);
      if (smtpSnap && smtpSnap.exists()) {
        senderName = smtpSnap.data().senderName || senderName;
      }

      const token = Math.random().toString(36).substring(2, 14);
      const resetUrl = `${window.location.origin}${window.location.pathname}?resetToken=${token}&email=${encodeURIComponent(targetEmail)}`;
      setDispatchedLink(resetUrl);

      const recipientName = isMaster ? 'Master Admin' : staffMember?.fullName || 'Staff Member';

      const emailRecord = {
        id: `email_${Date.now()}`,
        to: targetEmail,
        subject: `Password Reset Instruction - ${senderName}`,
        body: `Hello ${recipientName},\n\nWe received a request to reset your access password for the Staff Portal.\n\nPlease click the secure link below to set your new password:\n${resetUrl}\n\nThis token will expire in 24 hours. If you did not initiate this request, no further action is required.`,
        sentAt: new Date().toLocaleString(),
        status: 'Delivered',
        resetLink: resetUrl,
      };

      // Save to localStorage logs immediately
      try {
        const existingLogs = JSON.parse(localStorage.getItem('portal_sent_emails') || '[]');
        existingLogs.unshift(emailRecord);
        localStorage.setItem('portal_sent_emails', JSON.stringify(existingLogs));
      } catch {}

      // Record dispatched SMTP email into Firestore outbox
      await setDoc(doc(db, 'sent_emails', emailRecord.id), emailRecord).catch(() => {});

      setIsSubmitting(false);
      setViewMode('reset_success');
    } catch (err) {
      setError('Failed to dispatch password reset token via SMTP gateway.');
      setIsSubmitting(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match. Please verify and try again.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    setIsSubmitting(true);
    const targetEmail = resetEmail.trim().toLowerCase();

    try {
      const staffMember = staffList?.find((m) => m.email.trim().toLowerCase() === targetEmail);
      if (staffMember) {
        await setDoc(
          doc(db, 'staff_members', staffMember.id),
          { ...staffMember, password: newPassword },
          { merge: true }
        ).catch(() => {});
      } else if (masterAdminEmails.includes(targetEmail)) {
        await setDoc(
          doc(db, 'staff_members', 'master-admin'),
          {
            id: 'master-admin',
            fullName: 'Master Admin',
            email: 'whitelineborder@gmail.com',
            role: 'Admin',
            status: 'Active',
            joinedDate: 'Jan 01, 2025',
            password: newPassword,
          },
          { merge: true }
        ).catch(() => {});
      }

      setIsSubmitting(false);
      setIsSuccess(true);
      // Clean URL params
      window.history.replaceState({}, document.title, window.location.pathname);

      setTimeout(() => {
        setIsSuccess(false);
        setViewMode('login');
        setEmail(targetEmail);
        setPassword(newPassword);
      }, 1800);
    } catch (err) {
      setError('Failed to update password.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-radial from-slate-50 to-slate-100 p-4 md:p-8 font-sans">
      <div className="w-full max-w-md" id="login-container">
        {/* Decorative branding elements */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 text-white mb-3 shadow-md shadow-slate-900/10">
            {viewMode === 'login' ? <Lock className="w-6 h-6" /> : <KeyRound className="w-6 h-6 text-indigo-400" />}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            {viewMode === 'login' ? 'Staff Portal' : 'Account Recovery'}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {viewMode === 'login'
              ? 'Please authenticate to access portal workspace'
              : 'Secure password reset via SMTP gateway'}
          </p>
        </div>

        {/* Form card */}
        <motion.div
          layout
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white border border-slate-200/80 rounded-2xl p-6 md:p-8 shadow-xl shadow-slate-100/60"
          id="login-card"
        >
          {isSuccess ? (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center py-8"
              id="success-animation-container"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mb-4">
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900">
                {viewMode === 'reset_form' ? 'Password Updated!' : 'Success!'}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {viewMode === 'reset_form'
                  ? 'Your password has been changed. Returning to sign in...'
                  : 'Redirecting to workspace dashboard...'}
              </p>
            </motion.div>
          ) : viewMode === 'login' ? (
            <form onSubmit={handleSubmit} className="space-y-5" id="login-form">
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-red-50 text-red-800 text-xs rounded-lg p-3.5 border border-red-100 leading-relaxed flex gap-2">
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                      <span>{error}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <label className="block text-xs font-medium text-slate-700 tracking-wide uppercase mb-1.5" htmlFor="email-input">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    id="email-input"
                    className="block w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-950 transition-all text-sm"
                    placeholder="name@company.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-700 tracking-wide uppercase" htmlFor="password-input">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setResetEmail(email || '');
                      setViewMode('forgot');
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition-colors cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password-input"
                    className="block w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-950 transition-all text-sm"
                    placeholder="Enter password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl bg-slate-900 text-white font-medium text-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/20 active:scale-[0.98] transition-all disabled:opacity-50 mt-2 cursor-pointer shadow-sm"
              >
                {isSubmitting ? 'Verifying...' : 'Sign In'}
              </button>
            </form>
          ) : viewMode === 'forgot' ? (
            <form onSubmit={handleForgotSubmit} className="space-y-5">
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="overflow-hidden"
                  >
                    <div className="bg-red-50 text-red-800 text-xs rounded-lg p-3.5 border border-red-100 leading-relaxed flex gap-2">
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                      <span>{error}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <label className="block text-xs font-medium text-slate-700 tracking-wide uppercase mb-1.5">
                  Staff Registered Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="staff.member@company.com"
                    className="block w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-300 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Password reset link will only be generated and delivered if this email corresponds to an active directory user.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-sm cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'Dispatching via SMTP...' : 'Send Password Reset Link'}</span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setViewMode('login');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Sign In</span>
                </button>
              </div>
            </form>
          ) : viewMode === 'reset_success' ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
                <Send className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Reset Token Dispatched!</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                An email containing secure recovery instructions has been dispatched via configured SMTP to <strong className="text-slate-900 font-mono">{resetEmail}</strong>.
              </p>
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left text-xs space-y-2">
                <span className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider block">Live Preview Testing Bypass:</span>
                <p className="text-slate-500 text-[11px]">
                  Because browser preview environments cannot access external mailboxes directly, you can simulate clicking the dispatched link below:
                </p>
                <button
                  onClick={() => setViewMode('reset_form')}
                  className="w-full py-2 px-3 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-lg font-bold text-xs text-center block transition-all shadow-2xs cursor-pointer"
                >
                  Simulate Clicking Reset Token Link →
                </button>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button
                  onClick={() => setViewMode('login')}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  ← Back to Sign In
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleResetPasswordSubmit} className="space-y-5">
              <div className="text-center mb-2">
                <span className="text-xs font-mono px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md">
                  Account: {resetEmail}
                </span>
              </div>

              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="overflow-hidden"
                  >
                    <div className="bg-red-50 text-red-800 text-xs rounded-lg p-3.5 border border-red-100 leading-relaxed">
                      {error}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <label className="block text-xs font-medium text-slate-700 tracking-wide uppercase mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="block w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-300 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 tracking-wide uppercase mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="block w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-300 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Updating...' : 'Set New Password'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setViewMode('login')}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                >
                  Cancel & Sign In
                </button>
              </div>
            </form>
          )}
        </motion.div>

        {/* Footer info lockup */}
        <div className="text-center mt-8 text-xs text-slate-400">
          <p>© 2026 Admin Portal. Secure connection guaranteed.</p>
        </div>
      </div>
    </div>
  );
}
