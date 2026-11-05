import { api } from './api';
import type {
  Activity,
  AppNotification,
  AuthResponse,
  DashboardSummary,
  FollowUp,
  FollowUpFilters,
  FollowUpInput,
  Lead,
  LeadFilters,
  LeadInput,
  LeadStage,
  Paginated,
  Property,
  PropertyFilters,
  PropertyInput,
  RegisterInput,
  SiteVisit,
  SiteVisitFilters,
  SiteVisitInput,
  SiteVisitUpdate,
  UpdateProfileInput,
  User,
} from '@/types';

export { api, getErrorMessage, setUnauthorizedHandler } from './api';
export { clearToken, getToken, loadToken, saveToken } from './tokenStorage';

export const authService = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email: email.trim(), password }).then((r) => r.data),
  register: (input: RegisterInput) => api.post<AuthResponse>('/auth/register', input).then((r) => r.data),
  forgotPassword: (email: string) =>
    api.post<{ message: string; devHint?: string }>('/auth/forgot-password', { email: email.trim() }).then((r) => r.data),
  resetPassword: (email: string, otp: string, newPassword: string) =>
    api.post<{ message: string }>('/auth/reset-password', { email: email.trim(), otp, newPassword }).then((r) => r.data),
  me: () => api.get<User>('/auth/me').then((r) => r.data),
  updateProfile: (input: UpdateProfileInput) => api.patch<User>('/auth/me', input).then((r) => r.data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<{ message: string }>('/auth/change-password', { currentPassword, newPassword }).then((r) => r.data),
};

export const dashboardService = {
  summary: () => api.get<DashboardSummary>('/dashboard').then((r) => r.data),
};

export const propertyService = {
  list: (filters: PropertyFilters = {}) => api.get<Paginated<Property>>('/properties', { params: filters }).then((r) => r.data),
  get: (id: string) => api.get<Property>(`/properties/${id}`).then((r) => r.data),
  create: (input: PropertyInput) => api.post<Property>('/properties', input).then((r) => r.data),
  update: (id: string, input: Partial<PropertyInput>) => api.put<Property>(`/properties/${id}`, input).then((r) => r.data),
  remove: (id: string) => api.delete(`/properties/${id}`).then(() => undefined),
};

export const leadService = {
  list: (filters: LeadFilters = {}) => api.get<Paginated<Lead>>('/leads', { params: filters }).then((r) => r.data),
  get: (id: string) => api.get<Lead>(`/leads/${id}`).then((r) => r.data),
  create: (input: LeadInput) => api.post<Lead>('/leads', input).then((r) => r.data),
  update: (id: string, input: Partial<LeadInput>) => api.put<Lead>(`/leads/${id}`, input).then((r) => r.data),
  simulate: () => api.post<Lead>('/leads/simulate').then((r) => r.data),
  updateStage: (id: string, stage: LeadStage) => api.patch<Lead>(`/leads/${id}/stage`, { stage }).then((r) => r.data),
  remove: (id: string) => api.delete(`/leads/${id}`).then(() => undefined),
  activities: (id: string) => api.get<Activity[]>(`/leads/${id}/activities`).then((r) => r.data),
  addNote: (id: string, note: string) => api.post<Activity>(`/leads/${id}/notes`, { note }).then((r) => r.data),
};

export const followUpService = {
  list: (filters: FollowUpFilters = {}) => api.get<FollowUp[]>('/followups', { params: filters }).then((r) => r.data),
  get: (id: string) => api.get<FollowUp>(`/followups/${id}`).then((r) => r.data),
  create: (input: FollowUpInput) => api.post<FollowUp>('/followups', input).then((r) => r.data),
  update: (id: string, input: Partial<Omit<FollowUpInput, 'leadId'>>) => api.put<FollowUp>(`/followups/${id}`, input).then((r) => r.data),
  complete: (id: string, note?: string) => api.post<FollowUp>(`/followups/${id}/complete`, { note }).then((r) => r.data),
  reschedule: (id: string, scheduledAt: string, note?: string) =>
    api.post<FollowUp>(`/followups/${id}/reschedule`, { scheduledAt, note }).then((r) => r.data),
  remove: (id: string) => api.delete(`/followups/${id}`).then(() => undefined),
};

export const siteVisitService = {
  list: (filters: SiteVisitFilters = {}) => api.get<SiteVisit[]>('/visits', { params: filters }).then((r) => r.data),
  get: (id: string) => api.get<SiteVisit>(`/visits/${id}`).then((r) => r.data),
  create: (input: SiteVisitInput) => api.post<SiteVisit>('/visits', input).then((r) => r.data),
  update: (id: string, input: SiteVisitUpdate) => api.put<SiteVisit>(`/visits/${id}`, input).then((r) => r.data),
  remove: (id: string) => api.delete(`/visits/${id}`).then(() => undefined),
};

export const notificationService = {
  list: (unreadOnly = false) =>
    api
      .get<{ data: AppNotification[]; unreadCount: number }>('/notifications', { params: { unread: unreadOnly ? 'true' : undefined } })
      .then((r) => r.data),
  markRead: (id: string, read = true) => api.patch<AppNotification>(`/notifications/${id}`, { read }).then((r) => r.data),
  markAllRead: () => api.post('/notifications/read-all').then(() => undefined),
  remove: (id: string) => api.delete(`/notifications/${id}`).then(() => undefined),
};
