import type { Ionicons } from '@expo/vector-icons';

import type { ActivityKind } from '@/types';

export const ACTIVITY_ICONS: Record<ActivityKind, keyof typeof Ionicons.glyphMap> = {
  lead_created: 'person-add-outline',
  stage_changed: 'swap-horizontal-outline',
  lead_updated: 'create-outline',
  followup_scheduled: 'alarm-outline',
  followup_completed: 'checkmark-done-outline',
  followup_rescheduled: 'refresh-outline',
  visit_scheduled: 'calendar-outline',
  visit_updated: 'calendar-outline',
  note: 'document-text-outline',
};
