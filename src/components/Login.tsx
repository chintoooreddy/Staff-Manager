/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Mail, Eye, EyeOff, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { StaffMember } from '../types';

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

  // Default credentials
  const defaultAdminEmail = 'admin@company.com';
  const defaultAdminPassword = 'adminpassword';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const enteredEmail = email.trim().toLowerCase();

    // Dynamic verification delay for premium feel
    setTimeout(() => {
      if (enteredEmail === defaultAdminEmail && password === defaultAdminPassword) {
        setIsSuccess(true);
        setTimeout(() => {
          onLoginSuccess(defaultAdminEmail, 'Administrator', 'Admin');
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

  const handleFillCredentials = () => {
    setEmail(defaultAdminEmail);
    setPassword(defaultAdminPassword);
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-radial from-slate-50 to-slate-100 p-4 md:p-8 font-sans">
      <div className="w-full max-w-md" id="login-container">
        {/* Decorative branding elements */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 text-white mb-3 shadow-md shadow-slate-900/10">
            <Lock className="w-6 h-6" id="brand-lock-icon" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Staff Portal
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Please authenticate to manage directory users
          </p>
        </div>

        {/* Info callout for Admin credentials */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white border border-slate-200 rounded-xl p-4 mb-6 shadow-sm"
          id="credentials-callout"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5 animate-pulse" />
            <div className="flex-1">
              <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-2">
                Administrator Access
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                Use the pre-seeded admin credentials below to log into the administrative management console:
              </p>
              <div className="bg-slate-50 rounded-lg p-2.5 font-mono text-xs text-slate-700 divide-y divide-slate-200/60 border border-slate-100">
                <div className="pb-1.5 flex justify-between items-center">
                  <span>Username: <span className="font-semibold text-slate-900">{defaultAdminEmail}</span></span>
                </div>
                <div className="pt-1.5 flex justify-between items-center">
                  <span>Password: <span className="font-semibold text-slate-900">{defaultAdminPassword}</span></span>
                </div>
              </div>
              <div className="mt-2.5 pt-2 border-t border-slate-150 text-[10.5px] text-slate-500 leading-relaxed">
                <span>Or log in with any active staff account (e.g. <b>jane.cooper@company.com</b> / <b>password</b> for Admin or <b>cody.fisher@company.com</b> / <b>password</b> for User).</span>
              </div>
              <button
                type="button"
                onClick={handleFillCredentials}
                className="mt-3 text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center transition-colors cursor-pointer"
                id="btn-auto-fill"
              >
                Auto-fill credentials
              </button>
            </div>
          </div>
        </motion.div>

        {/* Login form card */}
        <motion.div
          layout
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
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
              <h2 className="text-xl font-semibold text-slate-900">Success!</h2>
              <p className="text-sm text-slate-500 mt-1">Redirecting to administrator dashboard...</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" id="login-form">
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                    id="login-error-container"
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
                    className="block w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-305 text-slate-900 placeholder:text-slate-400 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:border-slate-950 transition-all text-sm"
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
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password-input"
                    className="block w-full pl-10 pr-10 py-2.5 bg-white border border-slate-305 text-slate-900 placeholder:text-slate-400 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:border-slate-950 transition-all text-sm"
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
                    id="toggle-password-visibility"
                  >
                    {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl bg-slate-900 text-white font-medium text-sm hover:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-900/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none hover:shadow-lg hover:shadow-slate-900/10 mt-2 cursor-pointer"
                id="btn-submit-login"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Verifying...</span>
                  </div>
                ) : (
                  'Sign In'
                )}
              </button>
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
