/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Phone,
  User,
  Calendar,
  CreditCard,
  ShoppingBag,
  AlertCircle,
  X,
  ExternalLink,
  Plus,
  Clock,
  UserCheck,
  Building2,
  Key,
  ShieldAlert,
  FileText,
  DollarSign,
  Layers
} from 'lucide-react';
import { CallRecord, ClosedLead, ServiceItem } from '../types';

interface ClientLookupProps {
  callList: CallRecord[];
  closedLeads: ClosedLead[];
  services: ServiceItem[];
  onCloseLead: (leadData: {
    callRecordId: string;
    clientName: string;
    clientNumber: string;
    takenService: string;
    amountPaid: number;
    paidBy: string;
    panelNameUrl?: string;
    panelUsername?: string;
    panelPassword?: string;
  }) => void;
  currentUserRole: string;
  currentUserFullName: string;
}

export default function ClientLookup({
  callList,
  closedLeads,
  services,
  onCloseLead,
  currentUserRole,
  currentUserFullName,
}: ClientLookupProps) {
  // Search input state
  const [searchInput, setSearchInput] = useState<string>('');
  const [searchedQuery, setSearchedQuery] = useState<string>('');
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  // Modal dialog states (identical workflow & UI to Close Business Lead)
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<'business' | 'panel'>('business');
  const [takenService, setTakenService] = useState<string>('');
  const [amountPaid, setAmountPaid] = useState<number | ''>('');
  const [paidBy, setPaidBy] = useState<string>('Cash');
  const [customPaidBy, setCustomPaidBy] = useState<string>('');
  const [panelNameUrl, setPanelNameUrl] = useState<string>('');
  const [panelUsername, setPanelUsername] = useState<string>('');
  const [panelPassword, setPanelPassword] = useState<string>('');
  const [modalError, setModalError] = useState<string>('');

  // Credentials viewing popup state
  const [viewingPanelOrder, setViewingPanelOrder] = useState<ClosedLead | null>(null);

  // Helper to clean mobile numbers for fuzzy comparison
  const cleanNumber = (num: string) => (num || '').replace(/[\s\-\(\)\+]/g, '').toLowerCase();

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = searchInput.trim();
    if (!q) return;
    setSearchedQuery(q);
    setHasSearched(true);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchedQuery('');
    setHasSearched(false);
  };

  // Find all matching CallRecords and ClosedLeads
  const cleanQuery = cleanNumber(searchedQuery);
  const matchingCalls = callList.filter(
    (c) => cleanNumber(c.clientNumber).includes(cleanQuery) || c.clientNumber.includes(searchedQuery)
  );
  const matchingOrders = closedLeads.filter(
    (c) => cleanNumber(c.clientNumber).includes(cleanQuery) || c.clientNumber.includes(searchedQuery)
  );

  // Derive primary client profile information
  const primaryCall = matchingCalls[0];
  const primaryOrder = matchingOrders[0];
  const isFound = matchingCalls.length > 0 || matchingOrders.length > 0;

  const clientName = primaryCall?.clientName || primaryOrder?.clientName || 'Unknown Client';
  const clientNumber = primaryCall?.clientNumber || primaryOrder?.clientNumber || searchedQuery;
  const accountManager = primaryCall?.loggedBy || primaryOrder?.closedBy || 'System Registry';
  const registrationDate = primaryCall?.createdDate || primaryOrder?.closedDate || 'Historic Record';
  const initialInterest = primaryCall?.interestedService || primaryOrder?.takenService || 'Direct Client';

  // Sort previous purchase orders chronologically (oldest to newest or newest to oldest)
  // We sort latest first (newest at the top)
  const sortedOrders = [...matchingOrders].sort((a, b) => {
    const timeA = a.id ? Number(a.id.replace(/\D/g, '').substring(0, 13)) || 0 : 0;
    const timeB = b.id ? Number(b.id.replace(/\D/g, '').substring(0, 13)) || 0 : 0;
    return timeB - timeA;
  });

  const totalRevenue = sortedOrders.reduce((sum, order) => sum + (Number(order.amountPaid) || 0), 0);

  // Open Purchase Modal
  const handleOpenPurchaseModal = () => {
    setModalTab('business');
    const activeServices = services.filter((s) => s.status === 'Active');
    setTakenService(initialInterest || activeServices[0]?.name || '');
    setAmountPaid('');
    setPaidBy('Cash');
    setCustomPaidBy('');
    setPanelNameUrl('');
    setPanelUsername('');
    setPanelPassword('');
    setModalError('');
    setIsPurchaseModalOpen(true);
  };

  // Execute Purchase Order creation
  const handleCreatePurchaseOrder = () => {
    if (!takenService) {
      setModalError('Please select an acquired service.');
      return;
    }
    if (amountPaid === '' || isNaN(Number(amountPaid)) || Number(amountPaid) < 0) {
      setModalError('Please enter a valid non-negative revenue amount.');
      return;
    }
    const finalPaidMode = paidBy === 'Other' ? customPaidBy.trim() : paidBy;
    if (!finalPaidMode) {
      setModalError('Please specify the custom payment mode.');
      return;
    }

    // Call onCloseLead which creates a separate transaction document in Firestore
    onCloseLead({
      callRecordId: primaryCall?.id || `lookup-ref-${Date.now()}`,
      clientName: clientName,
      clientNumber: clientNumber,
      takenService: takenService,
      amountPaid: Number(amountPaid),
      paidBy: finalPaidMode,
      panelNameUrl: panelNameUrl.trim(),
      panelUsername: panelUsername.trim(),
      panelPassword: panelPassword,
    });

    setIsPurchaseModalOpen(false);
  };

  return (
    <div className="space-y-6" id="client-lookup-module">
      {/* Module Title Block */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Search className="w-6 h-6 text-slate-800" />
            <span>Client Mobile Lookup</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Search client records by mobile number to inspect chronological purchase history and issue new transaction orders.
          </p>
        </div>
      </div>

      {/* Search Bar Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <Phone className="w-4.5 h-4.5" />
            </span>
            <input
              type="text"
              id="lookup-mobile-input"
              placeholder="Enter client mobile number (e.g. 9876543210 or +1 555-0199)..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="block w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 text-sm font-mono transition-all"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={!searchInput.trim()}
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed shrink-0"
            id="btn-execute-lookup"
          >
            <Search className="w-4 h-4" />
            <span>Search Records</span>
          </button>
          {hasSearched && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-all cursor-pointer shrink-0"
            >
              Reset
            </button>
          )}
        </form>
      </div>

      {/* Search Results Display Viewport */}
      <AnimatePresence mode="wait">
        {!hasSearched ? (
          <motion.div
            key="empty-prompt"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center space-y-3"
          >
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
              <Search className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Mobile Query Active</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Type a client's registered phone number in the search input above to retrieve their complete profile identity and chronologically ordered purchase history.
            </p>
          </motion.div>
        ) : !isFound ? (
          <motion.div
            key="not-found"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="bg-amber-50/70 border border-amber-200/80 p-8 rounded-2xl text-center space-y-3"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No Client Record Found</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              We couldn't locate any call logs or finalized purchase orders matching the mobile number <span className="font-mono font-bold text-slate-900">"{searchedQuery}"</span>. Please double-check digits or register them as a new lead.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="client-found-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Bento Profile Header Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="bg-slate-900 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-white">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center font-bold text-lg text-emerald-400">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">Verified Client Identity</span>
                    <h2 className="text-xl font-bold tracking-tight text-white mt-0.5">{clientName}</h2>
                  </div>
                </div>
                <div className="flex items-center gap-3 self-start sm:self-auto">
                  <span className="px-3.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 font-mono text-emerald-400 font-bold text-sm flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{clientNumber}</span>
                  </span>
                </div>
              </div>

              {/* Bento Details Grid */}
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50/50">
                <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1">
                    <Building2 className="w-3 h-3 text-slate-500" />
                    <span>Primary Account Manager</span>
                  </span>
                  <p className="text-sm font-bold text-slate-800">{accountManager}</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    <span>First Registration</span>
                  </span>
                  <p className="text-sm font-bold text-slate-800">{registrationDate}</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1">
                    <ShoppingBag className="w-3 h-3 text-slate-500" />
                    <span>Total Purchase Orders</span>
                  </span>
                  <p className="text-sm font-bold text-slate-900 font-mono">{sortedOrders.length} Orders</p>
                </div>

                <div className="bg-emerald-50/80 p-4 rounded-xl border border-emerald-200/60 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5 mb-1">
                    <DollarSign className="w-3 h-3 text-emerald-600" />
                    <span>Lifetime Revenue</span>
                  </span>
                  <p className="text-base font-extrabold text-emerald-700 font-mono">₹{totalRevenue.toLocaleString()}</p>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="px-6 py-4 bg-white border-t border-slate-200/80 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  Initial Service Interest: <span className="font-semibold text-slate-800">{initialInterest}</span>
                </div>
                <button
                  type="button"
                  onClick={handleOpenPurchaseModal}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/15 flex items-center gap-2 cursor-pointer transition-all"
                  id="btn-create-new-purchase-order"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New Service Purchase Order</span>
                </button>
              </div>
            </div>

            {/* Chronological Service Purchase Orders Section */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
                <div className="flex items-center gap-2.5">
                  <Layers className="w-4.5 h-4.5 text-slate-700" />
                  <h3 className="text-sm font-bold text-slate-900">Chronological Purchase History</h3>
                  <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-mono font-bold">
                    {sortedOrders.length}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">Ordered newest to oldest</span>
              </div>

              {sortedOrders.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">No Purchase Transactions Yet</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    This client has logged calls but no finalized service purchase orders on record. Click "+ Create New Service Purchase Order" above to issue their first order.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3.5 px-6">Order ID / Ref</th>
                        <th className="py-3.5 px-5">Closing Date</th>
                        <th className="py-3.5 px-5">Acquired Service</th>
                        <th className="py-3.5 px-5 font-mono">Revenue Collected</th>
                        <th className="py-3.5 px-5">Payment Mode</th>
                        <th className="py-3.5 px-5">Closed By</th>
                        <th className="py-3.5 px-6 text-right">Panel Access</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {sortedOrders.map((order, idx) => {
                        const hasPanel = Boolean(order.panelNameUrl || order.panelUsername || order.panelPassword);
                        return (
                          <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-4 px-6 font-mono font-bold text-slate-900">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Completed Transaction" />
                                <span>#{order.id.replace('closed-', '').substring(0, 10)}</span>
                              </div>
                            </td>
                            <td className="py-4 px-5 text-slate-600 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>{order.closedDate}</span>
                            </td>
                            <td className="py-4 px-5">
                              <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 font-bold text-xs">
                                {order.takenService}
                              </span>
                            </td>
                            <td className="py-4 px-5 font-mono font-extrabold text-emerald-700 text-sm">
                              ₹{(Number(order.amountPaid) || 0).toLocaleString()}
                            </td>
                            <td className="py-4 px-5 text-slate-600">
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                                {order.paidBy}
                              </span>
                            </td>
                            <td className="py-4 px-5 text-slate-800 font-semibold">
                              {order.closedBy || 'Staff'}
                            </td>
                            <td className="py-4 px-6 text-right">
                              {hasPanel ? (
                                <button
                                  type="button"
                                  onClick={() => setViewingPanelOrder(order)}
                                  className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <Key className="w-3 h-3" />
                                  <span>View Credentials</span>
                                </button>
                              ) : (
                                <span className="text-slate-400 text-[11px] italic">None specified</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Viewing Panel Credentials Modal */}
      <AnimatePresence>
        {viewingPanelOrder && (
          <>
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 transition-opacity"
              onClick={() => setViewingPanelOrder(null)}
            />
            <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                    <Key className="w-4 h-4" />
                    <span>Client Panel Access</span>
                  </div>
                  <button
                    onClick={() => setViewingPanelOrder(null)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Portal / URL</span>
                    {viewingPanelOrder.panelNameUrl ? (
                      <a
                        href={viewingPanelOrder.panelNameUrl.startsWith('http') ? viewingPanelOrder.panelNameUrl : `https://${viewingPanelOrder.panelNameUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 hover:underline font-semibold flex items-center gap-1 mt-0.5 break-all"
                      >
                        <span>{viewingPanelOrder.panelNameUrl}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    ) : (
                      <span className="text-slate-500 mt-0.5 block">N/A</span>
                    )}
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Username</span>
                    <span className="font-mono font-bold text-slate-900 mt-0.5 block select-all">
                      {viewingPanelOrder.panelUsername || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Password</span>
                    <span className="font-mono font-bold text-slate-900 mt-0.5 block bg-slate-100 p-1.5 rounded select-all">
                      {viewingPanelOrder.panelPassword || 'N/A'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingPanelOrder(null)}
                  className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Create New Service Purchase Order Modal (Exact Workflow & UI as Close Business Lead) */}
      <AnimatePresence>
        {isPurchaseModalOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 transition-opacity"
              onClick={() => setIsPurchaseModalOpen(false)}
              id="purchase-order-backdrop"
            />

            {/* Modal Body Centered */}
            <div className="fixed inset-0 flex items-center justify-center p-4 z-50" id="purchase-order-modal-outer">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: 'spring', duration: 0.4 }}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl max-w-md w-full overflow-hidden flex flex-col"
                id="purchase-order-modal-card"
              >
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-none">Close Business Lead</h3>
                      <span className="text-[11px] text-slate-450 block mt-1">Convert interested client into an active service lead</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsPurchaseModalOpen(false)}
                    className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalTab('business')}
                    className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                      modalTab === 'business'
                        ? 'border-emerald-600 text-emerald-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Business Details
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalTab('panel')}
                    className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                      modalTab === 'panel'
                        ? 'border-emerald-600 text-emerald-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Panel Details
                  </button>
                </div>

                {/* Form fields */}
                <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
                  {modalError && (
                    <div className="bg-red-50 border border-red-100 text-red-950 p-3.5 rounded-xl text-xs flex gap-2 leading-relaxed">
                      <AlertCircle className="w-4.5 h-4.5 text-red-600 shrink-0" />
                      <span>{modalError}</span>
                    </div>
                  )}

                  {modalTab === 'business' && (
                    <div className="space-y-5 animate-fade-in">
                      {/* Read-only client details */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-3">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Client Identity (Read-Only)</span>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="block text-[10px] text-slate-500 font-medium">Client Name</span>
                            <span className="text-sm font-bold text-slate-800 block mt-0.5">{clientName}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-500 font-medium">Phone Number</span>
                            <span className="text-sm font-mono font-bold text-slate-800 block mt-0.5">{clientNumber}</span>
                          </div>
                        </div>
                      </div>

                      {/* 1. Taken Service Selection */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide" htmlFor="lookup-taken-service">
                          Taken Service <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <select
                            id="lookup-taken-service"
                            value={takenService}
                            onChange={(e) => setTakenService(e.target.value)}
                            className="block w-full py-2.5 pl-3.5 pr-10 bg-white border border-slate-205 text-slate-900 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 text-sm cursor-pointer"
                          >
                            <option value="">-- Select Service --</option>
                            {services.filter((s) => s.status === 'Active').map((srv) => (
                              <option key={srv.id} value={srv.name}>
                                {srv.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* 2. Amount Paid Input */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide" htmlFor="lookup-amount-paid">
                          Amount Paid (₹) <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 text-sm font-bold">
                            ₹
                          </span>
                          <input
                            type="number"
                            id="lookup-amount-paid"
                            min="0"
                            placeholder="E.g., 5000"
                            value={amountPaid}
                            onWheel={(e) => e.currentTarget.blur()}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAmountPaid(val === '' ? '' : Number(val));
                            }}
                            className="block w-full pl-8 pr-3.5 py-2.5 bg-white border border-slate-205 text-slate-900 placeholder:text-slate-400 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 text-sm no-stepper [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                      </div>

                      {/* 3. Paid By Selection */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                          Paid By <span className="text-rose-500">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {['Cash', 'UPI', 'Card', 'Bank Transfer', 'Other'].map((method) => {
                            const isSelected = paidBy === method;
                            return (
                              <button
                                type="button"
                                key={method}
                                onClick={() => {
                                  setPaidBy(method);
                                  setModalError('');
                                }}
                                className={`py-2 px-3 text-xs font-semibold rounded-xl border text-center transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                {method}
                              </button>
                            );
                          })}
                        </div>

                        {paidBy === 'Other' && (
                          <div className="mt-2.5 animate-fade-in">
                            <input
                              type="text"
                              required
                              value={customPaidBy}
                              onChange={(e) => setCustomPaidBy(e.target.value)}
                              placeholder="E.g. Cheque / Sponsorship"
                              className="block w-full px-3.5 py-2.5 bg-white border border-slate-205 text-slate-900 placeholder:text-slate-400 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 text-sm"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {modalTab === 'panel' && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 text-xs text-slate-600 leading-relaxed">
                        Specify optional service panel credentials or login URL for the client.
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide" htmlFor="lookup-panel-url">
                          Service Panel Name / URL (Optional)
                        </label>
                        <input
                          type="text"
                          id="lookup-panel-url"
                          placeholder="E.g., https://panel.example.com or SEO Portal"
                          value={panelNameUrl}
                          onChange={(e) => setPanelNameUrl(e.target.value)}
                          className="block w-full px-3.5 py-2.5 bg-white border border-slate-205 text-slate-900 placeholder:text-slate-400 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 text-sm"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide" htmlFor="lookup-panel-user">
                          Username (Optional)
                        </label>
                        <input
                          type="text"
                          id="lookup-panel-user"
                          placeholder="Client login username"
                          value={panelUsername}
                          onChange={(e) => setPanelUsername(e.target.value)}
                          className="block w-full px-3.5 py-2.5 bg-white border border-slate-205 text-slate-900 placeholder:text-slate-400 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 text-sm"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide" htmlFor="lookup-panel-pass">
                          Password (Optional)
                        </label>
                        <input
                          type="text"
                          id="lookup-panel-pass"
                          placeholder="Client login password"
                          value={panelPassword}
                          onChange={(e) => setPanelPassword(e.target.value)}
                          className="block w-full px-3.5 py-2.5 bg-white border border-slate-205 text-slate-900 placeholder:text-slate-400 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 text-sm font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer controls */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    onClick={() => setIsPurchaseModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreatePurchaseOrder}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/10 flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Complete Lead Closure</span>
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
