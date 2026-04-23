use soroban_sdk::{Address, Env, String};
use crate::storage;
use crate::types::{
    LoanRequest, LoanStatus, LoanVote,
    LOAN_APPROVAL_THRESHOLD, LOAN_VOTING_PERIOD,
};
use crate::errors::AjoError;
use crate::events;
use crate::utils;

/// Request a loan from the group pool.
pub fn request_loan(
    env: &Env,
    group_id: u64,
    borrower: Address,
    amount: i128,
    interest_rate_bps: u32,
    repayment_period: u64,
) -> Result<u64, AjoError> {
    borrower.require_auth();

    let group = storage::get_group(env, group_id).ok_or(AjoError::GroupNotFound)?;
    if !group.members.contains(&borrower) {
        return Err(AjoError::NotMember);
    }

    let now = utils::get_current_timestamp(env);
    let loan_id = storage::get_next_loan_id(env);

    let loan = LoanRequest {
        id: loan_id,
        group_id,
        borrower: borrower.clone(),
        amount,
        interest_rate_bps,
        repayment_period,
        status: LoanStatus::Pending,
        votes_for: 0,
        votes_against: 0,
        voting_deadline: now + LOAN_VOTING_PERIOD,
        created_at: now,
        disbursed_at: 0,
        amount_repaid: 0,
        due_at: 0,
    };

    storage::store_loan(env, loan_id, &loan);

    let mut ids = storage::get_group_loan_ids(env, group_id);
    ids.push_back(loan_id);
    storage::store_group_loan_ids(env, group_id, &ids);

    events::emit_loan_requested(env, loan_id, group_id, &borrower, amount);

    Ok(loan_id)
}

/// Vote on a loan request.
pub fn vote_on_loan(
    env: &Env,
    loan_id: u64,
    voter: Address,
    in_favor: bool,
) -> Result<(), AjoError> {
    voter.require_auth();

    let mut loan = storage::get_loan(env, loan_id).ok_or(AjoError::LoanNotFound)?;

    if loan.status != LoanStatus::Pending {
        return Err(AjoError::LoanAlreadyProcessed);
    }

    let now = utils::get_current_timestamp(env);
    if now > loan.voting_deadline {
        return Err(AjoError::VotingPeriodEnded);
    }

    let group = storage::get_group(env, loan.group_id).ok_or(AjoError::GroupNotFound)?;
    if !group.members.contains(&voter) {
        return Err(AjoError::NotMember);
    }

    if storage::has_voted_on_loan(env, loan_id, &voter) {
        return Err(AjoError::AlreadyVoted);
    }

    let vote = LoanVote { loan_id, voter: voter.clone(), in_favor, timestamp: now };
    storage::store_loan_vote(env, loan_id, &voter, &vote);

    if in_favor {
        loan.votes_for += 1;
    } else {
        loan.votes_against += 1;
    }

    // Check if threshold reached
    let total_members = group.members.len();
    let votes_for_pct = (loan.votes_for * 100) / total_members;
    if votes_for_pct >= LOAN_APPROVAL_THRESHOLD {
        loan.status = LoanStatus::Approved;
    }

    storage::store_loan(env, loan_id, &loan);
    events::emit_loan_vote(env, loan_id, &voter, in_favor);

    Ok(())
}

/// Disburse an approved loan to the borrower.
pub fn disburse_loan(env: &Env, loan_id: u64) -> Result<(), AjoError> {
    let mut loan = storage::get_loan(env, loan_id).ok_or(AjoError::LoanNotFound)?;

    if loan.status != LoanStatus::Approved {
        return Err(AjoError::LoanAlreadyProcessed);
    }

    let now = utils::get_current_timestamp(env);
    let group = storage::get_group(env, loan.group_id).ok_or(AjoError::GroupNotFound)?;

    crate::token::transfer_token(
        env,
        &group.token_address,
        &env.current_contract_address(),
        &loan.borrower,
        loan.amount,
    )?;

    loan.status = LoanStatus::Active;
    loan.disbursed_at = now;
    loan.due_at = now + loan.repayment_period;

    storage::store_loan(env, loan_id, &loan);
    events::emit_loan_disbursed(env, loan_id, loan.group_id, &loan.borrower, loan.amount);

    Ok(())
}

/// Repay a loan (partial or full).
pub fn repay_loan(
    env: &Env,
    loan_id: u64,
    borrower: Address,
    amount: i128,
) -> Result<(), AjoError> {
    borrower.require_auth();

    let mut loan = storage::get_loan(env, loan_id).ok_or(AjoError::LoanNotFound)?;

    if loan.status != LoanStatus::Active {
        return Err(AjoError::LoanNotActive);
    }

    let group = storage::get_group(env, loan.group_id).ok_or(AjoError::GroupNotFound)?;

    // Calculate total owed with interest
    let interest = (loan.amount * loan.interest_rate_bps as i128) / 10000;
    let total_owed = loan.amount + interest - loan.amount_repaid;

    if amount > total_owed {
        return Err(AjoError::RepaymentExceedsBalance);
    }

    crate::token::transfer_token(
        env,
        &group.token_address,
        &borrower,
        &env.current_contract_address(),
        amount,
    )?;

    loan.amount_repaid += amount;

    if loan.amount_repaid >= loan.amount + interest {
        loan.status = LoanStatus::Repaid;
    }

    storage::store_loan(env, loan_id, &loan);
    events::emit_loan_repayment(env, loan_id, &borrower, amount);

    Ok(())
}

/// Get a loan request by ID.
pub fn get_loan(env: &Env, loan_id: u64) -> Result<LoanRequest, AjoError> {
    storage::get_loan(env, loan_id).ok_or(AjoError::LoanNotFound)
}

/// Get all loan IDs for a group.
pub fn get_group_loans(env: &Env, group_id: u64) -> soroban_sdk::Vec<u64> {
    storage::get_group_loan_ids(env, group_id)
}
