/**
 * @file NoNotifications.tsx
 * @description Specialized empty state for the notification center.
 */

import React from 'react';
import { EmptyState } from './EmptyState';

interface NoNotificationsProps {
  /** Callback to close the notification panel or go back */
  onClose?: () => void;
}

/**
 * Rendered when there are no unread or archived notifications.
 */
export const NoNotifications: React.FC<NoNotificationsProps> = ({ onClose }) => {
  return (
    <EmptyState
      illustration="/illustrations/no-notifications.svg"
      heading="All Caught Up!"
      description="You don't have any notifications at the moment. We'll let you know when something important happens in your groups."
      size="sm"
      primaryAction={onClose ? {
        label: "Back to Dashboard",
        onClick: onClose,
      } : undefined}
    />
  );
};
