import type {
  FOLLOWUP_STATUSES,
  FOLLOWUP_TYPES,
  FOLLOWUP_VIEWS,
  LEAD_PRIORITIES,
  LEAD_SOURCES,
  LEAD_STAGES,
  LISTING_TYPES,
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  VISIT_STATUSES,
} from '@/constants';

export type PropertyType = (typeof PROPERTY_TYPES)[number];
export type ListingType = (typeof LISTING_TYPES)[number];
export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];
export type LeadSource = (typeof LEAD_SOURCES)[number];
export type LeadStage = (typeof LEAD_STAGES)[number];
export type LeadPriority = (typeof LEAD_PRIORITIES)[number];
export type FollowUpType = (typeof FOLLOWUP_TYPES)[number];
export type FollowUpStatus = (typeof FOLLOWUP_STATUSES)[number];
export type FollowUpView = (typeof FOLLOWUP_VIEWS)[number];
export type VisitStatus = (typeof VISIT_STATUSES)[number];

// ---------- Auth / user ----------

export interface NotificationPreferences {
  followUps: boolean;
  siteVisits: boolean;
  newLeads: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  avatarUrl?: string | null;
  preferences: NotificationPreferences;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface RegisterInput {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface UpdateProfileInput {
  name?: string;
  phone?: string;
  avatarUrl?: string | null;
  preferences?: Partial<NotificationPreferences>;
}

// ---------- Properties ----------

export interface Property {
  id: string;
  title: string;
  type: PropertyType;
  listingType: ListingType;
  location: string;
  price: number; // INR. For Rent this is the monthly rent.
  bhk: number | null; // null for plots / commercial
  area: number; // sq. ft.
  description: string;
  status: PropertyStatus;
  images: string[];
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PropertyInput = Omit<Property, 'id' | 'createdAt' | 'updatedAt'>;

export interface PropertyFilters {
  search?: string;
  type?: PropertyType;
  listingType?: ListingType;
  bhk?: number; // 4 => 4 and above
  status?: PropertyStatus;
  minPrice?: number;
  maxPrice?: number;
  featured?: boolean;
  page?: number;
  limit?: number;
}

// ---------- Leads ----------

export interface Lead {
  id: string;
  name: string;
  mobile: string;
  email: string;
  source: LeadSource;
  assignedTo: string;
  priority: LeadPriority;
  stage: LeadStage;
  remarks: string;
  createdAt: string;
  updatedAt: string;
}

export type LeadInput = Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>;

export interface LeadFilters {
  search?: string;
  stage?: LeadStage;
  source?: LeadSource;
  priority?: LeadPriority;
  assignedTo?: string;
  page?: number;
  limit?: number;
}

export type ActivityKind =
  | 'lead_created'
  | 'stage_changed'
  | 'lead_updated'
  | 'followup_scheduled'
  | 'followup_completed'
  | 'followup_rescheduled'
  | 'visit_scheduled'
  | 'visit_updated'
  | 'note';

export interface Activity {
  id: string;
  leadId: string;
  leadName?: string; // populated by the API for the dashboard feed
  kind: ActivityKind;
  title: string;
  description?: string;
  createdAt: string;
}

// ---------- Follow-ups ----------

export type FollowUpHistoryAction = 'Scheduled' | 'Updated' | 'Rescheduled' | 'Completed' | 'Missed';

export interface FollowUpHistoryEntry {
  id: string;
  action: FollowUpHistoryAction;
  note: string;
  at: string;
}

export interface FollowUp {
  id: string;
  leadId: string;
  leadName: string; // populated
  leadMobile?: string; // populated
  type: FollowUpType;
  scheduledAt: string; // ISO date-time
  remarks: string;
  status: FollowUpStatus;
  completedAt?: string | null;
  history: FollowUpHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpInput {
  leadId: string;
  type: FollowUpType;
  scheduledAt: string;
  remarks: string;
}

export interface FollowUpFilters {
  view?: FollowUpView;
  leadId?: string;
  status?: FollowUpStatus;
}

// ---------- Site visits ----------

export interface SiteVisit {
  id: string;
  leadId: string;
  leadName: string; // populated
  leadMobile?: string; // populated
  propertyId: string;
  propertyTitle: string; // populated
  propertyLocation?: string; // populated
  scheduledAt: string;
  status: VisitStatus;
  feedback: string;
  remarks: string;
  createdAt: string;
  updatedAt: string;
}

export interface SiteVisitInput {
  leadId: string;
  propertyId: string;
  scheduledAt: string;
  remarks?: string;
}

export interface SiteVisitUpdate {
  scheduledAt?: string;
  status?: VisitStatus;
  feedback?: string;
  remarks?: string;
}

export interface SiteVisitFilters {
  scope?: 'upcoming' | 'past' | 'all';
  leadId?: string;
  propertyId?: string;
  status?: VisitStatus;
}

// ---------- Notifications ----------

export type NotificationType = 'followup' | 'visit' | 'lead' | 'system';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  refId?: string;
  createdAt: string;
}

// ---------- Dashboard ----------

export interface DashboardSummary {
  totals: {
    properties: number;
    leads: number;
    activeLeads: number;
    followUpsToday: number;
    closedDeals: number;
    upcomingVisits: number;
    unreadNotifications: number;
  };
  leadsByStage: { stage: LeadStage; count: number }[];
  recentActivity: Activity[];
}

// ---------- API plumbing ----------

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}
