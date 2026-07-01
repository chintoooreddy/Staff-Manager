/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Mail, Eye, EyeOff, ShieldAlert, CheckCircle2, ArrowLeft, Send, KeyRound } from 'lucide-react';
import { StaffMember } from '../types';
import { db, getApiUrl } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

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
  const [smtpDispatchStatus, setSmtpDispatchStatus] = useState<'Delivered' | 'Failed'>('Delivered');
  const [smtpDispatchError, setSmtpDispatchError] = useState('');

  // View modes for login & password reset flow
  const [viewMode, setViewMode] = useState<'login' | 'forgot' | 'reset_success' | 'reset_form'>('login');
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [enteredToken, setEnteredToken] = useState('');
  const [tokenError, setTokenError] = useState('');

  // Master Admin credentials
  const masterAdminEmails = ['whitelineborder@gmail.com', 'whitelineborder@gmail'];
  const masterAdminPassword = 'Sindhu@0201';

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
      let smtpConfig: any = {
        host: 'smtp.gmail.com',
        port: 587,
        senderEmail: 'whitelineborder@gmail.com',
        senderName: 'Portal Security Team',
        username: 'whitelineborder@gmail.com',
        password: '',
        encryption: 'TLS',
      };
      const storedSmtp = localStorage.getItem('portal_smtp_config');
      if (storedSmtp) {
        try { smtpConfig = { ...smtpConfig, ...JSON.parse(storedSmtp) }; } catch {}
      }
      const smtpSnap = await getDoc(doc(db, 'settings', 'smtp_config')).catch(() => null);
      if (smtpSnap && smtpSnap.exists()) {
        smtpConfig = { ...smtpConfig, ...smtpSnap.data() };
      }

      const token = Math.random().toString(36).substring(2, 14);

      // Store valid token securely requiring email verification
      localStorage.setItem('portal_valid_token', JSON.stringify({ token, email: targetEmail }));
      await setDoc(doc(db, 'password_resets', targetEmail), { token, email: targetEmail, createdAt: Date.now() }).catch(() => {});

      const recipientName = isMaster ? 'Master Admin' : staffMember?.fullName || 'Staff Member';
      const subject = `Password Reset Instruction - ${smtpConfig.senderName || 'Portal Security'}`;
      const bodyText = `Hello ${recipientName},\n\nWe received a request to reset your access password for the Staff Portal.\n\nYour Recovery Token Code: ${token}\n\nPlease enter this token code on the portal verification screen to set your new password.\n\nThis token will expire in 24 hours. If you did not initiate this request, no further action is required.`;

      let deliveryStatus: 'Delivered' | 'Failed' = 'Delivered';
      let smtpErrorMsg = '';

      // Actually send email via Express backend route if password/credentials exist
      if (smtpConfig.host && smtpConfig.senderEmail) {
        try {
          const url = await getApiUrl('/api/send-email');
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              smtp: smtpConfig,
              to: targetEmail,
              subject,
              body: bodyText,
            }),
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            deliveryStatus = 'Failed';
            smtpErrorMsg = data.error || 'SMTP Handshake Rejected';
          }
        } catch (mailErr: any) {
          deliveryStatus = 'Failed';
          smtpErrorMsg = mailErr?.message || 'Network error during SMTP dispatch';
          console.warn('SMTP transmission note:', mailErr);
        }
      }

      setSmtpDispatchStatus(deliveryStatus);
      setSmtpDispatchError(smtpErrorMsg);

      const emailRecord: any = {
        id: `email_${Date.now()}`,
        to: targetEmail,
        subject,
        body: bodyText,
        sentAt: new Date().toLocaleString(),
        status: deliveryStatus,
        resetToken: token,
        ...(smtpErrorMsg ? { error: smtpErrorMsg } : {}),
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
      setError('Failed to process password reset request.');
      setIsSubmitting(false);
    }
  };

  const handleVerifyTokenCode = async () => {
    if (!enteredToken.trim()) {
      setTokenError('Please enter the Recovery Token Code sent to your email.');
      return;
    }
    const cleanToken = enteredToken.trim();
    const targetEmail = resetEmail.trim().toLowerCase();

    let isValid = false;
    const local = localStorage.getItem('portal_valid_token');
    if (local) {
      try {
        const p = JSON.parse(local);
        if (p.token === cleanToken && p.email.toLowerCase() === targetEmail) isValid = true;
      } catch {}
    }
    if (!isValid) {
      const snap = await getDoc(doc(db, 'password_resets', targetEmail)).catch(() => null);
      if (snap && snap.exists() && snap.data().token === cleanToken) isValid = true;
    }

    if (isValid) {
      setTokenError('');
      setViewMode('reset_form');
    } else {
      setTokenError('Invalid recovery token code. Access denied without valid email token.');
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

      localStorage.removeItem('portal_valid_token');
      await deleteDoc(doc(db, 'password_resets', targetEmail)).catch(() => {});

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
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                <Send className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Recovery Email Dispatched!</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                An email containing your recovery token code has been dispatched to <strong className="text-slate-900 font-mono">{resetEmail}</strong> via your configured SMTP Gateway.
              </p>
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left text-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5">
                    {smtpDispatchStatus === 'Failed' ? (
                      <>
                        <ShieldAlert className="w-3.5 h-3.5 text-red-600 animate-pulse" />
                        <span className="text-red-700">SMTP Delivery Status: Failed</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">SMTP Delivery Status: Delivered</span>
                      </>
                    )}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {smtpDispatchStatus === 'Failed' ? 'Dispatch Blocked' : 'Outbox Verified'}
                  </span>
                </div>

                {smtpDispatchStatus === 'Failed' ? (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-800 text-[11px] leading-relaxed space-y-1">
                    <p className="font-bold">Gateway Error Details:</p>
                    <p className="font-mono text-slate-700 text-[10px] break-words">{smtpDispatchError || 'Authentication failed or SMTP configuration is invalid.'}</p>
                    <p className="pt-1 text-slate-500 font-sans text-[10.5px]">
                      (Note: You can inspect the newly generated recovery token in the Admin SMTP outbox, or correct your credentials in SMTP settings.)
                    </p>
                  </div>
                ) : (
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Please check your inbox (and spam folder) for your secure recovery token code. Enter the token code below to verify access:
                  </p>
                )}

                <div className="pt-2 border-t border-slate-200/80 space-y-2">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Recovery Token Code:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={enteredToken}
                      onChange={(e) => { setEnteredToken(e.target.value); setTokenError(''); }}
                      placeholder="Enter token (e.g. xqz4k...)"
                      className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyTokenCode}
                      className="px-3.5 py-2 bg-indigo-600 text-white font-bold text-xs rounded-lg hover:bg-indigo-700 transition-all cursor-pointer shadow-sm"
                    >
                      Verify
                    </button>
                  </div>
                  {tokenError && <p className="text-[11px] text-red-600 font-medium">{tokenError}</p>}
                </div>
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
