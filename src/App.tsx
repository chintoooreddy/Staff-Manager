/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { LogOut, Users, PhoneCall, ShieldCheck, LayoutDashboard, Settings, Menu, X, UserCheck, TrendingUp, Mail, Search } from 'lucide-react';
import Login from './components/Login';
import StaffManagement from './components/StaffManagement';
import StaffForm from './components/StaffForm';
import CallManagement from './components/CallManagement';
import CallForm from './components/CallForm';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import PicklistManagement from './components/PicklistManagement';
import ClosedLeads from './components/ClosedLeads';
import Turnover from './components/Turnover';
import SmtpConfiguration from './components/SmtpConfiguration';
import ClientLookup from './components/ClientLookup';
import { StaffMember, CallRecord, ServiceItem, ClosedLead, CallStatus } from './types';

// Firebase imports
import { db, handleFirestoreError, OperationType } from './firebase';
import { collection, onSnapshot, setDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';

function cleanObjectForFirestore<T extends Record<string, any>>(obj: T): T {
  const cleaned: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      cleaned[key] = val;
    }
  }
  return cleaned as T;
}

// Preseed records for realistic corporate directory
const DEFAULT_PRESEED_STAFF: StaffMember[] = [
  {
    id: 'master-admin',
    fullName: 'Master Admin',
    email: 'whitelineborder@gmail.com',
    role: 'Admin',
    status: 'Active',
    joinedDate: 'Jan 01, 2025',
    password: 'Sindhu@0201',
  },
  {
    id: 'staff-1',
    fullName: 'Jane Cooper',
    email: 'jane.cooper@company.com',
    role: 'Admin',
    status: 'Active',
    joinedDate: 'Mar 15, 2025',
    password: 'password',
  },
  {
    id: 'staff-2',
    fullName: 'Cody Fisher',
    email: 'cody.fisher@company.com',
    role: 'User',
    status: 'Active',
    joinedDate: 'May 20, 2025',
    password: 'password',
  },
  {
    id: 'staff-3',
    fullName: 'Esther Howard',
    email: 'esther.howard@company.com',
    role: 'User',
    status: 'Suspended',
    joinedDate: 'Nov 02, 2025',
    password: 'password',
  },
  {
    id: 'staff-4',
    fullName: 'Guy Hawkins',
    email: 'guy.hawkins@company.com',
    role: 'User',
    status: 'Active',
    joinedDate: 'Jan 18, 2026',
    password: 'password',
  },
];

// Preseed call logs for Call Management module
const DEFAULT_PRESEED_CALLS: CallRecord[] = [
  {
    id: 'call-1',
    clientName: 'Sarah Jenkins',
    clientNumber: '+1 (555) 234-5678',
    callStatus: 'Interested',
    followupDate: '2026-06-25',
    interestedService: 'Full-stack Development',
    loggedBy: 'Jane Cooper',
    createdDate: 'Jun 22, 2026',
    notes: 'Very excited about migrating their inventory logs to a cloud solution.',
  },
  {
    id: 'call-2',
    clientName: 'Marcus Brodie',
    clientNumber: '+44 20 7946 0958',
    callStatus: 'Call Back',
    followupDate: '2026-06-24',
    loggedBy: 'Cody Fisher',
    createdDate: 'Jun 23, 2026',
    notes: 'Requested call back in afternoon to review customizable layouts.',
  },
  {
    id: 'call-3',
    clientName: 'David Vance',
    clientNumber: '+1 (555) 987-6543',
    callStatus: 'Busy',
    loggedBy: 'Guy Hawkins',
    createdDate: 'Jun 21, 2026',
    notes: 'Busy twice; scheduled automated reminder for tomorrow.',
  },
  {
    id: 'call-4',
    clientName: 'Linda Thompson',
    clientNumber: '+1 (555) 304-9812',
    callStatus: 'Not Answered',
    loggedBy: 'Jane Cooper',
    createdDate: 'Jun 22, 2026',
    notes: 'Attempted outbound dial; no answer.',
  }
];

const DEFAULT_PRESEED_SERVICES: ServiceItem[] = [
  { id: 'srv-1', name: 'Full-stack Development', status: 'Active' },
  { id: 'srv-2', name: 'SEO & Content Marketing', status: 'Active' },
  { id: 'srv-3', name: 'Enterprise Cloud Consulting', status: 'Active' },
  { id: 'srv-4', name: 'SaaS UI/UX Design Contract', status: 'Active' },
  { id: 'srv-5', name: 'Annual Support Retainer', status: 'Active' },
  { id: 'srv-6', name: 'Custom Database Optimization', status: 'Active' },
];

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [currentUserRole, setCurrentUserRole] = useState<string>('Admin');
  const [currentUserFullName, setCurrentUserFullName] = useState<string>('Administrator');
  
  // App views: 'analytics' (Operational Dashboard), 'staff' (Staff Management), 'calls' (Call Management), 'picklist' (Picklist Management), 'closed_leads' (Closed Leads), 'turnover' (Corporate Turnover), 'smtp' or 'lookup'
  const [activeTab, setActiveTab] = useState<'analytics' | 'staff' | 'calls' | 'picklist' | 'closed_leads' | 'turnover' | 'smtp' | 'lookup'>('analytics');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Staff state
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isStaffFormOpen, setIsStaffFormOpen] = useState<boolean>(false);
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);

  // Call management state
  const [callList, setCallList] = useState<CallRecord[]>([]);
  const [isCallFormOpen, setIsCallFormOpen] = useState<boolean>(false);
  const [editingCall, setEditingCall] = useState<CallRecord | null>(null);

  // Services/Picklist state
  const [services, setServices] = useState<ServiceItem[]>([]);

  // Closed leads state
  const [closedLeads, setClosedLeads] = useState<ClosedLead[]>([]);

  // Load configuration from local storage on mount and sync with Firebase Firestore
  useEffect(() => {
    // 1. Auth load
    const storedAuth = localStorage.getItem('staff_admin_auth');
    const storedEmail = localStorage.getItem('staff_admin_email');
    if (storedAuth === 'true' && storedEmail) {
      setIsAuthenticated(true);
      setAdminEmail(storedEmail);
      setCurrentUserRole(localStorage.getItem('staff_user_role') || 'Admin');
      setCurrentUserFullName(localStorage.getItem('staff_user_fullname') || 'Administrator');
    }

    // 2. Firebase real-time data sync
    // Realtime listener: Staff Members
    const unsubscribeStaff = onSnapshot(collection(db, 'staff_members'), (snapshot) => {
      const items: StaffMember[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as StaffMember);
      });

      if (items.length === 0) {
        // Preseed staff members if empty
        const batch = writeBatch(db);
        DEFAULT_PRESEED_STAFF.forEach((staff) => {
          const docRef = doc(db, 'staff_members', staff.id);
          batch.set(docRef, cleanObjectForFirestore(staff));
        });
        batch.commit().catch((err) => handleFirestoreError(err, OperationType.WRITE, 'staff_members'));
      } else {
        // Clean up legacy Master Admin records from DB
        const legacyEmails = ['admin@company.com', 'admin@campany.com', 'adleaddigitalmedia@gmail.com'];
        items.forEach((item) => {
          const lower = item.email?.trim().toLowerCase();
          if (item.id !== 'master-admin' && legacyEmails.includes(lower)) {
            deleteDoc(doc(db, 'staff_members', item.id)).catch(() => {});
          }
        });

        // Automatically sync Master Admin record to Firestore so it appears in the Directory and can be managed
        const masterDoc = items.find((s) => s.id === 'master-admin' || s.email?.trim().toLowerCase().startsWith('whitelineborder@gmail'));
        if (!masterDoc || !masterDoc.email?.toLowerCase().startsWith('whitelineborder@gmail') || masterDoc.password !== 'Sindhu@0201') {
          const masterRecord: StaffMember = {
            id: 'master-admin',
            fullName: 'Master Admin',
            email: 'whitelineborder@gmail.com',
            role: 'Admin',
            status: 'Active',
            joinedDate: 'Jan 01, 2025',
            password: 'Sindhu@0201',
          };
          setDoc(doc(db, 'staff_members', 'master-admin'), cleanObjectForFirestore(masterRecord)).catch(() => {});
        }

        const filteredItems = items.filter((item) => !legacyEmails.includes(item.email?.trim().toLowerCase()));
        setStaffList(filteredItems);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'staff_members');
    });

    // Realtime listener: Call Records
    const unsubscribeCalls = onSnapshot(collection(db, 'call_records'), (snapshot) => {
      const items: CallRecord[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as CallRecord);
      });

      if (items.length === 0) {
        // Preseed call records if empty
        const batch = writeBatch(db);
        DEFAULT_PRESEED_CALLS.forEach((call) => {
          const docRef = doc(db, 'call_records', call.id);
          batch.set(docRef, cleanObjectForFirestore(call));
        });
        batch.commit().catch((err) => handleFirestoreError(err, OperationType.WRITE, 'call_records'));
      } else {
        setCallList(items);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'call_records');
    });

    // Realtime listener: Picklist Services
    const unsubscribeServices = onSnapshot(collection(db, 'picklist_services'), (snapshot) => {
      const items: ServiceItem[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as ServiceItem);
      });

      if (items.length === 0) {
        // Preseed picklist services if empty
        const batch = writeBatch(db);
        DEFAULT_PRESEED_SERVICES.forEach((srv) => {
          const docRef = doc(db, 'picklist_services', srv.id);
          batch.set(docRef, cleanObjectForFirestore(srv));
        });
        batch.commit().catch((err) => handleFirestoreError(err, OperationType.WRITE, 'picklist_services'));
      } else {
        setServices(items);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'picklist_services');
    });

    // Realtime listener: Closed Leads
    const unsubscribeClosed = onSnapshot(collection(db, 'closed_leads'), (snapshot) => {
      const items: ClosedLead[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as ClosedLead);
      });
      setClosedLeads(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'closed_leads');
    });

    return () => {
      unsubscribeStaff();
      unsubscribeCalls();
      unsubscribeServices();
      unsubscribeClosed();
    };
  }, []);

  const handleLoginSuccess = (email: string, fullName: string, role: string) => {
    setIsAuthenticated(true);
    setAdminEmail(email);
    setCurrentUserRole(role);
    setCurrentUserFullName(fullName);
    localStorage.setItem('staff_admin_auth', 'true');
    localStorage.setItem('staff_admin_email', email);
    localStorage.setItem('staff_user_role', role);
    localStorage.setItem('staff_user_fullname', fullName);

    // If a User logs in, make sure we direct them to 'analytics' (User Dashboard)
    if (role === 'User') {
      setActiveTab('analytics');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAdminEmail('');
    setCurrentUserRole('Admin');
    setCurrentUserFullName('Administrator');
    localStorage.removeItem('staff_admin_auth');
    localStorage.removeItem('staff_admin_email');
    localStorage.removeItem('staff_user_role');
    localStorage.removeItem('staff_user_fullname');
  };

  // Staff Handlers
  const handleAddStaffClick = () => {
    setEditingMember(null);
    setIsStaffFormOpen(true);
  };

  const handleEditStaffClick = (member: StaffMember) => {
    setEditingMember(member);
    setIsStaffFormOpen(true);
  };

  const handleDeleteStaff = (id: string) => {
    deleteDoc(doc(db, 'staff_members', id))
      .catch((err) => handleFirestoreError(err, OperationType.DELETE, `staff_members/${id}`));
  };

  const handleSaveStaff = (memberData: Omit<StaffMember, 'id' | 'joinedDate'> & { id?: string }) => {
    const id = memberData.id || `staff-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    let joinedDate = '';
    
    if (memberData.id) {
      const existingMember = staffList.find((m) => m.id === memberData.id);
      joinedDate = existingMember ? existingMember.joinedDate : '';
    } else {
      const formatMonthMap: { [key: number]: string } = {
        0: 'Jan', 1: 'Feb', 2: 'Mar', 3: 'Apr', 4: 'May', 5: 'Jun',
        6: 'Jul', 7: 'Aug', 8: 'Sep', 9: 'Oct', 10: 'Nov', 11: 'Dec'
      };
      const now = new Date();
      const monthStr = formatMonthMap[now.getMonth()];
      const dayStr = String(now.getDate()).padStart(2, '0');
      const yearStr = now.getFullYear();
      joinedDate = `${monthStr} ${dayStr}, ${yearStr}`;
    }

    const updatedMember: StaffMember = {
      id,
      fullName: memberData.fullName,
      email: memberData.email,
      role: memberData.role,
      status: memberData.status,
      joinedDate,
      password: memberData.password || '',
    };

    setDoc(doc(db, 'staff_members', id), cleanObjectForFirestore(updatedMember))
      .then(() => {
        setIsStaffFormOpen(false);
        setEditingMember(null);
      })
      .catch((err) => handleFirestoreError(err, OperationType.WRITE, `staff_members/${id}`));
  };

  // Call Handlers
  const handleAddCallClick = () => {
    setEditingCall(null);
    setIsCallFormOpen(true);
  };

  const handleEditCallClick = (record: CallRecord) => {
    setEditingCall(record);
    setIsCallFormOpen(true);
  };

  const handleDeleteCall = (id: string) => {
    deleteDoc(doc(db, 'call_records', id))
      .catch((err) => handleFirestoreError(err, OperationType.DELETE, `call_records/${id}`));
  };

  const handleSaveCall = (callData: Omit<CallRecord, 'id' | 'createdDate'> & { id?: string }) => {
    const id = callData.id || `call-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    let createdDate = '';

    if (callData.id) {
      const existingCall = callList.find((c) => c.id === callData.id);
      createdDate = existingCall ? existingCall.createdDate : '';
    } else {
      const formatMonthMap: { [key: number]: string } = {
        0: 'Jan', 1: 'Feb', 2: 'Mar', 3: 'Apr', 4: 'May', 5: 'Jun',
        6: 'Jul', 7: 'Aug', 8: 'Sep', 9: 'Oct', 10: 'Nov', 11: 'Dec'
      };
      const now = new Date();
      const monthStr = formatMonthMap[now.getMonth()];
      const dayStr = String(now.getDate()).padStart(2, '0');
      const yearStr = now.getFullYear();
      createdDate = `${monthStr} ${dayStr}, ${yearStr}`;
    }

    const updatedCall: CallRecord = {
      id,
      clientName: callData.clientName,
      clientNumber: callData.clientNumber,
      callStatus: callData.callStatus,
      followupDate: callData.followupDate || '',
      interestedService: callData.interestedService || '',
      loggedBy: callData.loggedBy || '',
      createdDate,
      notes: callData.notes || '',
    };

    setDoc(doc(db, 'call_records', id), cleanObjectForFirestore(updatedCall))
      .then(() => {
        setIsCallFormOpen(false);
        setEditingCall(null);
      })
      .catch((err) => handleFirestoreError(err, OperationType.WRITE, `call_records/${id}`));
  };

  // Service/Picklist Handlers
  const handleSaveService = (serviceData: { id?: string; name: string; status: 'Active' | 'Inactive' }) => {
    const id = serviceData.id || `srv-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    const updatedService: ServiceItem = {
      id,
      name: serviceData.name,
      status: serviceData.status,
    };

    setDoc(doc(db, 'picklist_services', id), cleanObjectForFirestore(updatedService))
      .catch((err) => handleFirestoreError(err, OperationType.WRITE, `picklist_services/${id}`));
  };

  const handleDeleteService = (id: string) => {
    deleteDoc(doc(db, 'picklist_services', id))
      .catch((err) => handleFirestoreError(err, OperationType.DELETE, `picklist_services/${id}`));
  };

  // Closed Leads Handlers
  const handleCloseLead = (leadData: {
    callRecordId: string;
    clientName: string;
    clientNumber: string;
    takenService: string;
    amountPaid: number;
    paidBy: string;
    panelNameUrl?: string;
    panelUsername?: string;
    panelPassword?: string;
  }) => {
    // 1. Create a ClosedLead record
    const formatMonthMap: { [key: number]: string } = {
      0: 'Jan', 1: 'Feb', 2: 'Mar', 3: 'Apr', 4: 'May', 5: 'Jun',
      6: 'Jul', 7: 'Aug', 8: 'Sep', 9: 'Oct', 10: 'Nov', 11: 'Dec'
    };
    const now = new Date();
    const monthStr = formatMonthMap[now.getMonth()];
    const dayStr = String(now.getDate()).padStart(2, '0');
    const yearStr = now.getFullYear();
    const formattedDate = `${monthStr} ${dayStr}, ${yearStr}`;

    const matchingCall = callList.find((c) => c.id === leadData.callRecordId);
    const originalLogger = matchingCall ? matchingCall.loggedBy : currentUserFullName;

    const leadId = `closed-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    const newLead: ClosedLead = {
      id: leadId,
      callRecordId: leadData.callRecordId,
      clientName: leadData.clientName,
      clientNumber: leadData.clientNumber,
      takenService: leadData.takenService,
      amountPaid: leadData.amountPaid,
      paidBy: leadData.paidBy,
      closedDate: formattedDate,
      closedBy: originalLogger || '',
      notes: '',
      panelNameUrl: leadData.panelNameUrl || '',
      panelUsername: leadData.panelUsername || '',
      panelPassword: leadData.panelPassword || '',
    };

    // 2. Mark the corresponding CallRecord as 'Closed' synchronously using a batch
    const batch = writeBatch(db);
    batch.set(doc(db, 'closed_leads', leadId), cleanObjectForFirestore(newLead));
    if (matchingCall) {
      batch.set(doc(db, 'call_records', leadData.callRecordId), cleanObjectForFirestore({
        ...matchingCall,
        callStatus: 'Closed' as CallStatus,
      }));
    }
    batch.commit()
      .catch((err) => handleFirestoreError(err, OperationType.WRITE, 'closed_leads/call_records_batch'));
  };

  const handleSaveClosedLead = (leadData: Omit<ClosedLead, 'closedDate'> & { id?: string }) => {
    const id = leadData.id || `closed-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    let closedDate = '';

    if (leadData.id) {
      const existingLead = closedLeads.find((c) => c.id === leadData.id);
      closedDate = existingLead ? existingLead.closedDate : '';
    } else {
      const formatMonthMap: { [key: number]: string } = {
        0: 'Jan', 1: 'Feb', 2: 'Mar', 3: 'Apr', 4: 'May', 5: 'Jun',
        6: 'Jul', 7: 'Aug', 8: 'Sep', 9: 'Oct', 10: 'Nov', 11: 'Dec'
      };
      const now = new Date();
      const monthStr = formatMonthMap[now.getMonth()];
      const dayStr = String(now.getDate()).padStart(2, '0');
      const yearStr = now.getFullYear();
      closedDate = `${monthStr} ${dayStr}, ${yearStr}`;
    }

    const updatedLead: ClosedLead = {
      id,
      callRecordId: leadData.callRecordId || '',
      clientName: leadData.clientName,
      clientNumber: leadData.clientNumber,
      takenService: leadData.takenService,
      amountPaid: leadData.amountPaid,
      paidBy: leadData.paidBy,
      closedDate,
      closedBy: leadData.closedBy || currentUserFullName || '',
      notes: leadData.notes || '',
      panelNameUrl: leadData.panelNameUrl || '',
      panelUsername: leadData.panelUsername || '',
      panelPassword: leadData.panelPassword || '',
    };

    setDoc(doc(db, 'closed_leads', id), cleanObjectForFirestore(updatedLead))
      .catch((err) => handleFirestoreError(err, OperationType.WRITE, `closed_leads/${id}`));
  };

  const handleDeleteClosedLead = (id: string) => {
    deleteDoc(doc(db, 'closed_leads', id))
      .catch((err) => handleFirestoreError(err, OperationType.DELETE, `closed_leads/${id}`));
  };

  return (
    <div className="bg-slate-50 min-h-screen font-sans antialiased text-slate-800">
      {isAuthenticated ? (
        <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
          {/* Mobile Top Bar */}
          <div className="md:hidden flex items-center justify-between bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-40 shadow-xs" id="mobile-top-bar">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-sm">
                S
              </div>
              <div>
                <span className="font-bold text-slate-900 tracking-tight text-xs block">System Console</span>
              </div>
            </div>
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
              id="btn-mobile-menu"
              title="Open Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          {/* Left Sidebar Layout */}
          <aside
            className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform md:transform-none transition-transform duration-200 ease-in-out flex flex-col justify-between ${
              isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
            }`}
            id="console-sidebar"
          >
            <div className="flex flex-col h-full">
              {/* Sidebar Branding Header */}
              <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8.5 h-8.5 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-base shadow-sm">
                    S
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 tracking-tight text-sm block">System Console</span>
                    <span className="text-[10px] text-emerald-600 font-semibold tracking-wide uppercase flex items-center gap-1 mt-0.5">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Secure Session
                    </span>
                  </div>
                </div>

                {/* Mobile Sidebar Close Button */}
                <button
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="md:hidden p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 cursor-pointer"
                  id="btn-mobile-close"
                  title="Close Menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sidebar Navigation - Stacked List */}
              <nav className="flex-1 px-3 py-6 space-y-1" id="console-navigation-tabs">
                <button
                  onClick={() => {
                    setActiveTab('analytics');
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-3 cursor-pointer ${
                    activeTab === 'analytics'
                      ? 'bg-slate-900 text-white shadow-sm border border-slate-900'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                  }`}
                  id="tab-toggle-analytics"
                >
                  <LayoutDashboard className="w-4 h-4 shrink-0" />
                  <span>{currentUserRole === 'Admin' ? 'Dashboard Analytics' : 'User Dashboard'}</span>
                </button>

                {currentUserRole === 'Admin' && (
                  <button
                    onClick={() => {
                      setActiveTab('staff');
                      setIsMobileSidebarOpen(false);
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-3 cursor-pointer ${
                      activeTab === 'staff'
                        ? 'bg-slate-900 text-white shadow-sm border border-slate-900'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                    }`}
                    id="tab-toggle-staff"
                  >
                    <Users className="w-4 h-4 shrink-0" />
                    <span>Staff Directory</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setActiveTab('calls');
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-3 cursor-pointer ${
                    activeTab === 'calls'
                      ? 'bg-slate-900 text-white shadow-sm border border-slate-900'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                  }`}
                  id="tab-toggle-calls"
                >
                  <PhoneCall className="w-4 h-4 shrink-0" />
                  <span>Call Management</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('closed_leads');
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-3 cursor-pointer ${
                    activeTab === 'closed_leads'
                      ? 'bg-slate-900 text-white shadow-sm border border-slate-900'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                  }`}
                  id="tab-toggle-closed-leads"
                >
                  <UserCheck className="w-4 h-4 shrink-0" />
                  <span>Closed Leads</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('lookup');
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-3 cursor-pointer ${
                    activeTab === 'lookup'
                      ? 'bg-slate-900 text-white shadow-sm border border-slate-900'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                  }`}
                  id="tab-toggle-lookup"
                >
                  <Search className="w-4 h-4 shrink-0" />
                  <span>Lookup Module</span>
                </button>

                {currentUserRole === 'Admin' && (
                  <>
                    <button
                      onClick={() => {
                        setActiveTab('picklist');
                        setIsMobileSidebarOpen(false);
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-3 cursor-pointer ${
                        activeTab === 'picklist'
                          ? 'bg-slate-900 text-white shadow-sm border border-slate-900'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                      }`}
                      id="tab-toggle-picklist"
                    >
                      <Settings className="w-4 h-4 shrink-0" />
                      <span>Picklist Module</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('turnover');
                        setIsMobileSidebarOpen(false);
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-3 cursor-pointer ${
                        activeTab === 'turnover'
                          ? 'bg-slate-900 text-white shadow-sm border border-slate-900'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                      }`}
                      id="tab-toggle-turnover"
                    >
                      <TrendingUp className="w-4 h-4 shrink-0" />
                      <span>Turnover Matrix</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('smtp');
                        setIsMobileSidebarOpen(false);
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-3 cursor-pointer ${
                        activeTab === 'smtp'
                          ? 'bg-slate-900 text-white shadow-sm border border-slate-900'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                      }`}
                      id="tab-toggle-smtp"
                    >
                      <Mail className="w-4 h-4 shrink-0" />
                      <span>SMTP Configuration</span>
                    </button>
                  </>
                )}
              </nav>

              {/* Sidebar Footer - User Profile Context & Sign Out Button */}
              <div className="p-4 border-t border-slate-200 bg-slate-50/50 shrink-0">
                <div className="mb-4">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">Current User</span>
                  <span className="text-xs font-bold text-slate-800 block truncate mt-0.5">{currentUserFullName}</span>
                  <span className="text-[10px] text-slate-500 font-medium block truncate uppercase tracking-wider text-indigo-600 font-sans mt-0.5">
                    {currentUserRole} Account
                  </span>
                  <span className="text-[10px] text-slate-550 font-mono block truncate mt-0.5 max-w-full" title={adminEmail}>
                    {adminEmail}
                  </span>
                </div>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMobileSidebarOpen(false);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 hover:text-red-600 hover:bg-red-50 hover:border-red-100 transition-all text-xs font-semibold cursor-pointer shadow-2xs"
                  id="btn-global-logout"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </aside>

          {/* Backdrop on Mobile */}
          {isMobileSidebarOpen && (
            <div
              className="fixed inset-0 bg-slate-950/40 z-40 md:hidden"
              onClick={() => setIsMobileSidebarOpen(false)}
              id="sidebar-backdrop"
            />
          )}

          {/* Active Workstage viewport with desktop padding adjustment */}
          <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <AnimatePresence mode="wait">
                {activeTab === 'analytics' ? (
                  <div key="analytics-viewport" className="animate-fade-in">
                    <AnalyticsDashboard
                      currentEmail={adminEmail}
                      staffList={staffList}
                      callList={callList}
                      closedLeads={closedLeads}
                      currentUserRole={currentUserRole}
                      currentUserFullName={currentUserFullName}
                    />
                  </div>
                ) : activeTab === 'staff' ? (
                  <div key="staff-viewport" className="animate-fade-in">
                    <StaffManagement
                      staffList={staffList}
                      onAddStaff={handleAddStaffClick}
                      onEditStaff={handleEditStaffClick}
                      onDeleteStaff={handleDeleteStaff}
                    />
                  </div>
                ) : activeTab === 'picklist' ? (
                  <div key="picklist-viewport" className="animate-fade-in">
                    <PicklistManagement
                      services={services}
                      onSaveService={handleSaveService}
                      onDeleteService={handleDeleteService}
                    />
                  </div>
                ) : activeTab === 'closed_leads' ? (
                  <div key="closed-leads-viewport" className="animate-fade-in">
                    <ClosedLeads
                      closedLeads={closedLeads}
                      services={services}
                      onSaveClosedLead={handleSaveClosedLead}
                      onDeleteClosedLead={handleDeleteClosedLead}
                      currentUserRole={currentUserRole}
                      currentUserFullName={currentUserFullName}
                      staffList={staffList}
                    />
                  </div>
                ) : activeTab === 'turnover' && currentUserRole === 'Admin' ? (
                  <div key="turnover-viewport" className="animate-fade-in">
                    <Turnover
                      closedLeads={closedLeads}
                      staffList={staffList}
                    />
                  </div>
                ) : activeTab === 'smtp' && currentUserRole === 'Admin' ? (
                  <div key="smtp-viewport" className="animate-fade-in">
                    <SmtpConfiguration />
                  </div>
                ) : activeTab === 'lookup' ? (
                  <div key="lookup-viewport" className="animate-fade-in">
                    <ClientLookup
                      callList={callList}
                      closedLeads={closedLeads}
                      services={services}
                      onCloseLead={handleCloseLead}
                      onSaveCall={handleSaveCall}
                      currentUserRole={currentUserRole}
                      currentUserFullName={currentUserFullName}
                    />
                  </div>
                ) : (
                  <div key="calls-viewport" className="animate-fade-in">
                    
                    {/* Module Title Block */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6" id="calls-title-wrapper">
                      <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                          Outbound Call Management
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                          Track daily leads, log outbound conversation feedback, schedule callback timelines, and assign client interests.
                        </p>
                      </div>
                    </div>

                    <CallManagement
                      currentEmail={adminEmail}
                      currentUserRole={currentUserRole}
                      currentUserFullName={currentUserFullName}
                      callList={callList}
                      staffList={staffList}
                      services={services}
                      onAddCall={handleAddCallClick}
                      onEditCall={handleEditCallClick}
                      onDeleteCall={handleDeleteCall}
                      onSaveCall={handleSaveCall}
                      onCloseLead={handleCloseLead}
                    />
                  </div>
                )}
              </AnimatePresence>
            </main>
          </div>
        </div>
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} staffList={staffList} />
      )}

      {/* Slide-over panels with premium AnimatePresence */}
      <AnimatePresence>
        {/* Onboarding and editing staff Form panel */}
        {isStaffFormOpen && (
          <StaffForm
            onClose={() => {
              setIsStaffFormOpen(false);
              setEditingMember(null);
            }}
            onSave={handleSaveStaff}
            editingMember={editingMember}
            existingEmails={staffList.map((m) => m.email)}
          />
        )}

        {/* Adding and editing calls Form panel */}
        {isCallFormOpen && (
          <CallForm
            onClose={() => {
              setIsCallFormOpen(false);
              setEditingCall(null);
            }}
            onSave={handleSaveCall}
            editingCall={editingCall}
            staffList={staffList}
            currentAdminEmail={adminEmail}
            activeServices={services.filter((s) => s.status === 'Active')}
            currentUserRole={currentUserRole}
            currentUserFullName={currentUserFullName}
            existingCalls={callList}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
