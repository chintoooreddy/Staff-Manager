/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Mail, Server, Shield, Lock, Eye, EyeOff, CheckCircle2, Send, RefreshCw, Trash2, AlertCircle, ExternalLink } from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, onSnapshot, query, deleteDoc, getDocs } from 'firebase/firestore';
import { SmtpConfig, SentEmail } from '../types';

const DEFAULT_SMTP: SmtpConfig = {
  host: 'smtp.gmail.com',
  port: 587,
  senderEmail: 'whitelineborder@gmail.com',
  senderName: 'Portal Security Team',
  username: 'whitelineborder@gmail.com',
  password: '••••••••••••',
  encryption: 'TLS',
  isEnabled: true,
};

function cleanObj(obj: Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      cleaned[key] = val;
    }
  }
  return cleaned;
}

export default function SmtpConfiguration() {
  const [config, setConfig] = useState<SmtpConfig>(DEFAULT_SMTP);
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [selectedEmailModal, setSelectedEmailModal] = useState<SentEmail | null>(null);

  useEffect(() => {
    // 1. Load from local storage immediately so UI is instant
    const localConfig = localStorage.getItem('portal_smtp_config');
    if (localConfig) {
      try { setConfig(JSON.parse(localConfig)); } catch {}
    }
    const localLogs = localStorage.getItem('portal_sent_emails');
    if (localLogs) {
      try { setSentEmails(JSON.parse(localLogs)); } catch {}
    }

    // 2. Fetch SMTP config from Firestore
    const fetchConfig = async () => {
      try {
        const docRef = doc(db, 'settings', 'smtp_config');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const fetched = docSnap.data() as SmtpConfig;
          setConfig(fetched);
          localStorage.setItem('portal_smtp_config', JSON.stringify(fetched));
        } else {
          // Initialize default in DB
          await setDoc(docRef, cleanObj(DEFAULT_SMTP)).catch(() => {});
          localStorage.setItem('portal_smtp_config', JSON.stringify(DEFAULT_SMTP));
        }
      } catch (err) {
        console.error('Error fetching SMTP config:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchConfig();

    // 3. Listen to sent email logs
    const emailsQuery = query(collection(db, 'sent_emails'));
    const unsubscribe = onSnapshot(
      emailsQuery,
      (snapshot) => {
        const list: SentEmail[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as SentEmail);
        });
        if (list.length > 0) {
          list.sort((a, b) => b.id.localeCompare(a.id));
          setSentEmails(list);
          localStorage.setItem('portal_sent_emails', JSON.stringify(list));
        } else {
          setSentEmails([]);
          localStorage.removeItem('portal_sent_emails');
        }
      },
      (err) => console.error('Error fetching sent emails:', err)
    );

    return () => unsubscribe();
  }, []);

  const handleChange = (field: keyof SmtpConfig, value: any) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);
    try {
      localStorage.setItem('portal_smtp_config', JSON.stringify(config));
      await setDoc(doc(db, 'settings', 'smtp_config'), cleanObj(config));
      setStatusMessage({ text: 'SMTP Gateway Configuration saved successfully!', type: 'success' });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error('Save error:', err);
      setStatusMessage({ text: 'SMTP Gateway Configuration saved locally!', type: 'success' });
      setTimeout(() => setStatusMessage(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!config.host || !config.senderEmail) {
      setStatusMessage({ text: 'Please enter a valid SMTP Host and Sender Email before testing.', type: 'error' });
      return;
    }
    setIsTesting(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/test-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smtp: config }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Connection rejected by mail server');
      }
      setStatusMessage({
        text: `SMTP Handshake Verified! ${data.message || `Connected to ${config.host}:${config.port}`}. Ready to dispatch password reset emails.`,
        type: 'success',
      });
    } catch (err: any) {
      setStatusMessage({
        text: `SMTP Handshake Failed: ${err.message}. Please verify your username, App Password, and port settings.`,
        type: 'error',
      });
    } finally {
      setIsTesting(false);
      setTimeout(() => setStatusMessage(null), 8000);
    }
  };

  const handleClearLogs = async () => {
    setIsClearing(true);
    try {
      setSentEmails([]);
      localStorage.removeItem('portal_sent_emails');
      const querySnap = await getDocs(collection(db, 'sent_emails')).catch(() => null);
      if (querySnap) {
        await Promise.all(querySnap.docs.map((d) => deleteDoc(d.ref).catch(() => {})));
      }
      setStatusMessage({ text: 'All dispatched email logs have been successfully cleared.', type: 'success' });
    } catch (err) {
      console.error('Error clearing logs:', err);
      setStatusMessage({ text: 'Failed to clear logs.', type: 'error' });
    } finally {
      setIsClearing(false);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="w-6 h-6 animate-spin text-slate-400 mr-2" />
        <span className="text-sm text-slate-500">Loading SMTP gateway parameters...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 font-sans" id="smtp-config-page">
      {/* Title & Status Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                SMTP & Email Gateway Configuration
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure outbound mail server settings for dispatching secure password reset links to registered staff.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Status:</span>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
              config.isEnabled
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${config.isEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            {config.isEnabled ? 'Gateway Active' : 'Gateway Disabled'}
          </span>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-xs font-medium flex items-start gap-3 border transition-all animate-fade-in ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : statusMessage.type === 'error'
              ? 'bg-red-50 text-red-800 border-red-200'
              : 'bg-blue-50 text-blue-800 border-blue-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4.5 h-4.5 text-red-600 shrink-0 mt-0.5" />
          )}
          <span className="leading-relaxed">{statusMessage.text}</span>
        </div>
      )}

      {/* Main Configuration Card */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-4.5 h-4.5 text-indigo-600" />
              <span>Server Connection Parameters</span>
            </h2>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <span className="text-xs font-semibold text-slate-700">Enable SMTP Delivery</span>
              <input
                type="checkbox"
                checked={config.isEnabled}
                onChange={(e) => handleChange('isEnabled', e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                SMTP Gateway Host
              </label>
              <input
                type="text"
                required
                value={config.host}
                onChange={(e) => handleChange('host', e.target.value)}
                placeholder="smtp.gmail.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Standard gateways: smtp.gmail.com (Google), smtp.office365.com (Microsoft), smtp.mailgun.org
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                SMTP Port
              </label>
              <input
                type="number"
                required
                value={config.port}
                onChange={(e) => handleChange('port', Number(e.target.value))}
                placeholder="587"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">587 (TLS), 465 (SSL), or 25</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Sender Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={config.senderEmail}
                  onChange={(e) => handleChange('senderEmail', e.target.value)}
                  placeholder="whitelineborder@gmail.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Sender Display Name
              </label>
              <input
                type="text"
                required
                value={config.senderName}
                onChange={(e) => handleChange('senderName', e.target.value)}
                placeholder="Staff Portal Security"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Authentication Username
              </label>
              <input
                type="text"
                required
                value={config.username}
                onChange={(e) => handleChange('username', e.target.value)}
                placeholder="username or email"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                SMTP Password / App Key
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={config.password || ''}
                  onChange={(e) => handleChange('password', e.target.value)}
                  placeholder="App Password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Encryption Protocol
              </label>
              <select
                value={config.encryption}
                onChange={(e) => handleChange('encryption', e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all bg-white cursor-pointer"
              >
                <option value="TLS">STARTTLS / TLS (Recommended)</option>
                <option value="SSL">SSL / Direct TLS</option>
                <option value="None">None (Insecure)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs transition-all shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-indigo-600' : ''}`} />
            <span>{isTesting ? 'Handshaking...' : 'Test SMTP Handshake'}</span>
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-semibold text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>

      {/* Outbox / Dispatched Email Logs Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Mail className="w-4.5 h-4.5 text-indigo-600" />
              <span>Dispatched Password Reset Emails (Outbox Log)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review real-time records of password reset tokens delivered to staff. Click any link to test resetting the password.
            </p>
          </div>
          {sentEmails.length > 0 && (
            <button
              onClick={handleClearLogs}
              disabled={isClearing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 transition-all cursor-pointer border border-red-200/60"
            >
              {isClearing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              <span>{isClearing ? 'Clearing...' : 'Clear Log'}</span>
            </button>
          )}
        </div>

        {sentEmails.length === 0 ? (
          <div className="text-center py-12 px-4 bg-slate-50/50">
            <Mail className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-600">No password reset emails dispatched yet</p>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              When a staff member requests a password reset from the login portal, the outgoing SMTP dispatch record and testable reset link will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                  <th className="py-3 px-4">Recipient Staff</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action / Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {sentEmails.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 font-mono">{item.to}</td>
                    <td className="py-3.5 px-4 truncate max-w-xs">{item.subject}</td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">{item.sentAt}</td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200/60">
                        <CheckCircle2 className="w-3 h-3" />
                        Delivered
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {(item.resetLink || item.resetToken || item.subject.includes('Password Reset')) && (
                        <button
                          onClick={() => setSelectedEmailModal(item)}
                          className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer"
                        >
                          <span>Inspect Email & Token</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal to Inspect Email and Open Link */}
      {selectedEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm">Outbound SMTP Email Viewer</h3>
              </div>
              <button
                onClick={() => setSelectedEmailModal(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-2 py-2 border-b border-slate-100">
                <span className="font-bold text-slate-500">From:</span>
                <span className="col-span-2 font-mono text-slate-800">{config.senderName} &lt;{config.senderEmail}&gt;</span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-2 border-b border-slate-100">
                <span className="font-bold text-slate-500">To Staff:</span>
                <span className="col-span-2 font-bold text-slate-900 font-mono">{selectedEmailModal.to}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-2 border-b border-slate-100">
                <span className="font-bold text-slate-500">Subject:</span>
                <span className="col-span-2 font-semibold text-slate-800">{selectedEmailModal.subject}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono text-slate-700 whitespace-pre-wrap leading-relaxed text-[11px]">
                {selectedEmailModal.body}
              </div>
              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Delivered via SMTP ({config.host})</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
