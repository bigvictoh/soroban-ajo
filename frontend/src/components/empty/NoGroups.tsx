/**
 * @file NoGroups.tsx
 * @description Specialized empty state for the groups dashboard.
 * Encourages users to create or join their first savings pool.
 */

import React from 'react';
import { EmptyState } from './EmptyState';

interface NoGroupsProps {
  /** Callback to open the group creation modal/page */
  onCreateGroup: () => void;
  /** Optional callback to browse existing public groups */
  onExploreGroups?: () => void;
}

/**
 * Rendered when a user has no active savings groups.
 * Provides clear calls to action for onboarding.
 */
export const NoGroups: React.FC<NoGroupsProps> = ({ onCreateGroup, onExploreGroups }) => {
  return (
    <EmptyState
      illustration="/illustrations/no-groups.svg"
      heading="No Savings Groups Yet"
      description="You haven't joined any savings groups. Start your financial journey by creating a group with friends or exploring public ones."
      size="lg"
      primaryAction={{
        label: "Create New Group",
        onClick: onCreateGroup,
      }}
      secondaryAction={onExploreGroups ? {
        label: "Explore Public Groups",
        onClick: onExploreGroups,
      } : undefined}
    />
  );
};
