/**
 * @file NoTransactions.tsx
 * @description Specialized empty state for transaction history and financial logs.
 */

import React from 'react';
import { EmptyState } from './EmptyState';

interface NoTransactionsProps {
  /** Optional callback to initiate a contribution or transfer */
  onMakeContribution?: () => void;
}

/**
 * Rendered when there are no financial activities recorded for a group or user.
 */
export const NoTransactions: React.FC<NoTransactionsProps> = ({ onMakeContribution }) => {
  return (
    <EmptyState
      illustration="/illustrations/no-transactions.svg"
      heading="No Transactions Found"
      description="It looks like there's no activity here yet. Once you make a contribution or receive a payout, it will appear in this list."
      size="md"
      primaryAction={onMakeContribution ? {
        label: "Make a Contribution",
        onClick: onMakeContribution,
      } : undefined}
    />
  );
};
