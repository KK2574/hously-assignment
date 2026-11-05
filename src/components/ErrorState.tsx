import React from 'react';

import { EmptyState } from './EmptyState';

interface Props {
  message?: string;
  onRetry?: () => void;
}

/** Full-area error with a retry button. Used when a screen's first load fails. */
export function ErrorState({ message = 'Something went wrong. Please try again.', onRetry }: Props) {
  return (
    <EmptyState
      icon="cloud-offline-outline"
      title="Couldn't load data"
      message={message}
      actionLabel={onRetry ? 'Try again' : undefined}
      onAction={onRetry}
    />
  );
}
