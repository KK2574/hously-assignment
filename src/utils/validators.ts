import { z } from 'zod';

import {
  EXECUTIVES,
  FOLLOWUP_TYPES,
  LEAD_PRIORITIES,
  LEAD_SOURCES,
  LEAD_STAGES,
  LISTING_TYPES,
  PASSWORD_MIN_LENGTH,
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
} from '@/constants';

// Form schemas. Numeric fields are kept as strings (that is what TextInput gives us);
// the screens convert them with parseNumber() before calling the service layer.

export const MOBILE_REGEX = /^(\+91[\s-]?)?[6-9]\d{9}$/;

const email = z.string().trim().min(1, 'Email is required').email('Enter a valid email address');
const password = z.string().min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
const mobile = z.string().trim().regex(MOBILE_REGEX, 'Enter a valid 10-digit mobile number');
const positiveNumber = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine((v) => Number(v.replace(/[,\s]/g, '')) > 0, `Enter a valid ${label.toLowerCase()}`);

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters'),
    email,
    phone: mobile,
    password,
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    otp: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code'),
    newPassword: password,
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: password,
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    message: 'New password must be different from the current one',
    path: ['newPassword'],
  });

export const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  phone: mobile,
});

export const propertySchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters'),
  type: z.enum(PROPERTY_TYPES),
  listingType: z.enum(LISTING_TYPES),
  location: z.string().trim().min(2, 'Location is required'),
  price: positiveNumber('Price'),
  bhk: z
    .string()
    .trim()
    .refine((v) => v === '' || (/^\d+$/.test(v) && Number(v) <= 20), 'BHK must be a whole number up to 20'),
  area: positiveNumber('Area'),
  description: z.string().trim().max(1000, 'Keep the description under 1000 characters'),
  status: z.enum(PROPERTY_STATUSES),
});

export const leadSchema = z.object({
  name: z.string().trim().min(2, 'Customer name must be at least 2 characters'),
  mobile,
  email: z
    .string()
    .trim()
    .refine((v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Enter a valid email address'),
  source: z.enum(LEAD_SOURCES),
  assignedTo: z.enum(EXECUTIVES),
  priority: z.enum(LEAD_PRIORITIES),
  stage: z.enum(LEAD_STAGES),
  remarks: z.string().trim().max(500, 'Keep remarks under 500 characters'),
});

export const followUpSchema = z.object({
  leadId: z.string().min(1, 'Select a lead'),
  type: z.enum(FOLLOWUP_TYPES),
  scheduledAt: z.date({ message: 'Pick a date and time' }),
  remarks: z.string().trim().max(500, 'Keep remarks under 500 characters'),
});

export const siteVisitSchema = z.object({
  leadId: z.string().min(1, 'Select a lead'),
  propertyId: z.string().min(1, 'Select a property'),
  scheduledAt: z.date({ message: 'Pick a date and time' }),
  remarks: z.string().trim().max(500, 'Keep remarks under 500 characters'),
});

export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
export type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordForm = z.infer<typeof changePasswordSchema>;
export type ProfileForm = z.infer<typeof profileSchema>;
export type PropertyForm = z.infer<typeof propertySchema>;
export type LeadForm = z.infer<typeof leadSchema>;
export type FollowUpForm = z.infer<typeof followUpSchema>;
export type SiteVisitForm = z.infer<typeof siteVisitSchema>;
