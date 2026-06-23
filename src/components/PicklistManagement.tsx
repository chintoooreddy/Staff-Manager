/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Plus, Edit, Check, X, Search, Briefcase, Trash2, CheckCircle, AlertCircle, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { ServiceItem } from '../types';

interface PicklistManagementProps {
  services: ServiceItem[];
  onSaveService: (serviceData: { id?: string; name: string; status: 'Active' | 'Inactive' }) => void;
  onDeleteService: (id: string) => void;
}

export default function PicklistManagement({ services, onSaveService, onDeleteService }: PicklistManagementProps) {
  const [activeSubTab, setActiveSubTab] = useState<'Services'>('Services');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');

  // Service form editing state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [serviceName, setServiceName] = useState('');
  const [serviceStatus, setServiceStatus] = useState<'Active' | 'Inactive'>('Active');
  const [errorMsg, setErrorMsg] = useState('');

  const handleOpenAddForm = () => {
    setEditingId(null);
    setServiceName('');
    setServiceStatus('Active');
    setErrorMsg('');
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (item: ServiceItem) => {
    setEditingId(item.id);
    setServiceName(item.name);
    setServiceStatus(item.status);
    setErrorMsg('');
    setIsFormOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedName = serviceName.trim();
    if (!trimmedName) {
      setErrorMsg('Service name is required.');
      return;
    }

    // Check if name already exists (excluding the one being edited)
    const nameExists = services.some(
      (s) => s.name.toLowerCase() === trimmedName.toLowerCase() && s.id !== editingId
    );

    if (nameExists) {
      setErrorMsg('A service with this name already exists.');
      return;
    }

    onSaveService({
      id: editingId || undefined,
      name: trimmedName,
      status: serviceStatus,
    });

    setIsFormOpen(false);
    setEditingId(null);
    setServiceName('');
    setServiceStatus('Active');
  };

  const handleToggleStatusInline = (item: ServiceItem) => {
    onSaveService({
      id: item.id,
      name: item.name,
      status: item.status === 'Active' ? 'Inactive' : 'Active',
    });
  };

  // Filter logic
  const filteredServices = services.filter((service) => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || service.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeCount = services.filter((s) => s.status === 'Active').length;
  const inactiveCount = services.filter((s) => s.status === 'Inactive').length;

  return (
    <div className="space-y-6" id="picklist-module-root">
      {/* Module Navigation / Header Block */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4" id="picklist-header-row">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            System Settings & Picklists
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure dropdown values, customize service sub-modules, and moderate operational choices.
          </p>
        </div>

        <button
          onClick={handleOpenAddForm}
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-md shadow-slate-900/10 cursor-pointer transition-all active:scale-95"
          id="btn-add-service-main"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          <span>Create Service</span>
        </button>
      </div>

      {/* Sub-modules Tabs */}
      <div className="border-b border-slate-200" id="picklist-sub-tabs">
        <nav className="flex space-x-6" aria-label="Tabs">
          <button
            onClick={() => setActiveSubTab('Services')}
            className={`pb-4 px-1 border-b-2 font-semibold text-sm flex items-center gap-2 cursor-pointer transition-all ${
              activeSubTab === 'Services'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300'
            }`}
            id="subtab-services"
          >
            <Briefcase className="w-4 h-4" />
            <span>Services Config</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              activeSubTab === 'Services' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {services.length}
            </span>
          </button>
        </nav>
      </div>

      {/* Services Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="picklist-layout-grid">
        
        {/* Left Side: Services Table/List (2 Columns) */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Filter/Search Bar Panel */}
          <div className="bg-white border border-slate-200/85 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-2xs" id="services-filter-bar">
            {/* Search Input */}
            <div className="relative w-full sm:max-w-xs">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-xs"
                id="search-services-input"
              />
            </div>

            {/* Status Filters */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl" id="services-status-filter-pills">
              {(['All', 'Active', 'Inactive'] as const).map((filter) => {
                let pillCount = services.length;
                if (filter === 'Active') pillCount = activeCount;
                if (filter === 'Inactive') pillCount = inactiveCount;

                return (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                      statusFilter === filter
                        ? 'bg-white text-slate-950 shadow-xs border border-slate-200/40'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <span>{filter}</span>
                    <span className="text-[10px] opacity-60 font-mono">({pillCount})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table Box */}
          <div className="bg-white border border-slate-200/85 rounded-2xl shadow-xs overflow-hidden" id="services-table-panel">
            {filteredServices.length === 0 ? (
              <div className="p-12 text-center">
                <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-800">No Services Found</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  No services matching the search term or status filter were located in this configuration block.
                </p>
                {searchTerm || statusFilter !== 'All' ? (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('All');
                    }}
                    className="mt-4 text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    Reset Filter
                  </button>
                ) : (
                  <button
                    onClick={handleOpenAddForm}
                    className="mt-4 text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    Create one now
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse" id="services-admin-table">
                  <thead>
                    <tr className="border-b border-slate-150 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-5">Service ID</th>
                      <th className="py-3 px-5">Service Name</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 text-xs">
                    {filteredServices.map((service, idx) => (
                      <tr key={service.id} className="hover:bg-slate-50/40 transition-colors">
                        {/* ID */}
                        <td className="py-3 px-5 text-slate-400 font-mono">
                          {service.id}
                        </td>

                        {/* Name */}
                        <td className="py-3 px-5 font-semibold text-slate-900 text-sm">
                          {service.name}
                        </td>

                        {/* Status badge with Toggle helper */}
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleToggleStatusInline(service)}
                            title="Click to toggle status"
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all border ${
                              service.status === 'Active'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100/60'
                                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200/60'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${service.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            <span>{service.status}</span>
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEditForm(service)}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-950 hover:bg-slate-50 transition-all cursor-pointer"
                              title="Edit Service"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete service "${service.name}"?`)) {
                                  onDeleteService(service.id);
                                }
                              }}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-100 transition-all cursor-pointer"
                              title="Delete Service"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Form or Explanatory panel */}
        <div className="lg:col-span-1">
          {isFormOpen ? (
            <div className="bg-white border border-slate-250 rounded-2xl p-5 shadow-xs space-y-4" id="service-form-card">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-sm">
                  {editingId ? 'Edit Service' : 'Add New Service'}
                </h3>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="w-6 h-6 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {errorMsg && (
                <div className="bg-red-50 border border-red-100 text-red-950 p-3 rounded-lg text-xs flex gap-1.5 leading-relaxed">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5" htmlFor="edit-service-name">
                    Service Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="edit-service-name"
                    required
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    placeholder="E.g., Digital Transformation Consulting"
                    className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-450 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-xs"
                  />
                </div>

                {/* Status Toggle */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                    Service Status
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setServiceStatus('Active')}
                      className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                        serviceStatus === 'Active'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-400 ring-2 ring-emerald-50'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Active
                    </button>
                    <button
                      type="button"
                      onClick={() => setServiceStatus('Inactive')}
                      className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                        serviceStatus === 'Inactive'
                          ? 'bg-slate-100 text-slate-700 border-slate-400'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Inactive
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-400 block italic leading-tight mt-1.5">
                    * Inactive services won't show in the Call Interest options dropdown.
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="flex-1 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-755 text-xs font-medium rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-slate-900 text-white hover:bg-slate-800 text-xs font-medium rounded-xl transition-all cursor-pointer shadow-sm"
                  >
                    {editingId ? 'Save Changes' : 'Create Service'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white border border-slate-200/85 rounded-2xl p-5 shadow-xs space-y-4 text-slate-600 text-xs" id="services-how-to-card">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-slate-700" />
                <span>Services Submodule</span>
              </h3>
              <p className="leading-relaxed">
                As an <strong>Administrator</strong>, you can configure the catalog of services offered by your enterprise.
              </p>
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <p className="font-semibold text-slate-900">How it works:</p>
                <ul className="list-disc pl-4 space-y-1.5 leading-relaxed">
                  <li>Define specialized service names for tracking clients' specific project interests.</li>
                  <li>Set status to <strong className="text-emerald-700">Active</strong> to expose the service to all team members logging outbound dials.</li>
                  <li>Toggle status to <strong className="text-slate-500">Inactive</strong> to hide outdated or fully-booked services without deleting their historical logs.</li>
                </ul>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-150">
                <p className="font-semibold text-slate-900 mb-1 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  <span>Realtime Integration</span>
                </p>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Adding or disabling services updates the call logging panel in real-time, preventing misaligned logging entries.
                </p>
              </div>

              <button
                onClick={handleOpenAddForm}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-semibold rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5"
                id="btn-create-service-aside"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Service</span>
              </button>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
