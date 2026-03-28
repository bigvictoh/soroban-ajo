/**
 * @file NoMembers.tsx
 * @description Specialized empty state for newly created groups without members.
 */

import React from 'react';
import { EmptyState } from './EmptyState';

interface NoMembersProps {
  /** Callback to share/copy the invitation link */
  onInvite: () => void;
}

/**
 * Rendered in the MemberList when the group only has the creator.
 * Highlights the social nature of Ajo and prompts for invitations.
 */
export const NoMembers: React.FC<NoMembersProps> = ({ onInvite }) => {
  return (
    <EmptyState
      illustration="/illustrations/no-members.svg"
      heading="Invite Your Circle"
      description="Savings groups work best with friends and community. Share your group's unique link to start your first savings cycle."
      size="md"
      primaryAction={{
        label: "Invite Members",
        onClick: onInvite,
      }}
    />
  );
};
