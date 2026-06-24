/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface StaffMember {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: 'Active' | 'Suspended';
  joinedDate: string;
  password?: string;
}

export type StaffFilterStatus = 'All' | 'Active' | 'Suspended';

export interface DashboardMetrics {
  total: number;
  active: number;
  suspended: number;
}

export type CallStatus = 'Interested' | 'Call Back' | 'Not Answered' | 'Busy' | 'Not Reachable' | 'Closed';

export interface CallRecord {
  id: string;
  clientName: string;
  clientNumber: string;
  callStatus: CallStatus;
  followupDate?: string;
  interestedService?: string;
  loggedBy: string;
  createdDate: string;
  notes?: string;
}

export interface ClosedLead {
  id: string;
  callRecordId: string;
  clientName: string;
  clientNumber: string;
  takenService: string;
  amountPaid: number;
  paidBy: string;
  closedDate: string;
  notes?: string;
  closedBy?: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  status: 'Active' | 'Inactive';
}

export interface SmtpConfig {
  host: string;
  port: number;
  senderEmail: string;
  senderName: string;
  username: string;
  password?: string;
  encryption: 'TLS' | 'SSL' | 'None';
  isEnabled: boolean;
}

export interface SentEmail {
  id: string;
  to: string;
  subject: string;
  body: string;
  sentAt: string;
  status: 'Delivered' | 'Failed';
  resetLink?: string;
  resetToken?: string;
}



