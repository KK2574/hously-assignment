import { Redirect } from 'expo-router';
import React from 'react';

import { useAuth } from '@/context/AuthContext';

/**
 * Catch-all for routes that do not exist for the current session.
 *
 * The root layout hides the app screens while signed out (and the auth screens while signed in).
 * When the session changes, the router can still be pointing at a screen that was just hidden —
 * e.g. "/" right after logout — which would otherwise show "Unmatched Route".
 * Send the user to the right place instead.
 */
export default function NotFound() {
  const { isAuthenticated } = useAuth();
  return <Redirect href={isAuthenticated ? '/' : '/login'} />;
}
