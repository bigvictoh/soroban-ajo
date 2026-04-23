use soroban_sdk::{Address, Env, String};
use crate::storage;
use crate::types::{
    EmergencyRequest, EmergencyStatus, EmergencyVote,
    EMERGENCY_APPROVAL_THRESHOLD, EMERGENCY_VOTING_PERIOD,
};
use crate::errors::AjoError;
use crate::events;
use crate::utils;

/// Request an emergency withdrawal from the group pool.
pub fn request_emergency(
    env: &Env,
    group_id: u64,
    requester: Address,
    amount: i128,
    reason: String,
    repay_period: u64,
) -> Result<u64, AjoError> {
    requester.require_auth();

    let group = storage::get_group(env, group_id).ok_or(AjoError::GroupNotFound)?;
    if !group.members.contains(&requester) {
        return Err(AjoError::NotMember);
    }

    let now = utils::get_current_timestamp(env);
    let req_id = storage::get_next_emergency_id(env);

    let req = EmergencyRequest {
        id: req_id,
        group_id,
        requester: requester.clone(),
        amount,
        reason,
        status: EmergencyStatus::Pending,
        votes_for: 0,
        votes_against: 0,
        voting_deadline: now + EMERGENCY_VOTING_PERIOD,
        created_at: now,
        disbursed_at: 0,
        amount_repaid: 0,
        repay_by: 0,
    };

    storage::store_emergency(env, req_id, &req);

    let mut ids = storage::get_group_emergency_ids(env, group_id);
    ids.push_back(req_id);
    storage::store_group_emergency_ids(env, group_id, &ids);

    events::emit_emergency_requested(env, req_id, group_id, &requester, amount);

    Ok(req_id)
}

/// Vote on an emergency request.
pub fn vote_on_emergency(
    env: &Env,
    req_id: u64,
    voter: Address,
    in_favor: bool,
) -> Result<(), AjoError> {
    voter.require_auth();

    let mut req = storage::get_emergency(env, req_id).ok_or(AjoError::EmergencyRequestNotFound)?;

    if req.status != EmergencyStatus::Pending {
        return Err(AjoError::EmergencyAlreadyProcessed);
    }

    let now = utils::get_current_timestamp(env);
    if now > req.voting_deadline {
        return Err(AjoError::VotingPeriodEnded);
    }

    let group = storage::get_group(env, req.group_id).ok_or(AjoError::GroupNotFound)?;
    if !group.members.contains(&voter) {
        return Err(AjoError::NotMember);
    }

    if storage::has_voted_on_emergency(env, req_id, &voter) {
        return Err(AjoError::AlreadyVoted);
    }

    let vote = EmergencyVote { request_id: req_id, voter: voter.clone(), in_favor, timestamp: now };
    storage::store_emergency_vote(env, req_id, &voter, &vote);

    if in_favor {
        req.votes_for += 1;
    } else {
        req.votes_against += 1;
    }

    let total_members = group.members.len();
    let votes_for_pct = (req.votes_for * 100) / total_members;
    if votes_for_pct >= EMERGENCY_APPROVAL_THRESHOLD {
        req.status = EmergencyStatus::Approved;
    }

    storage::store_emergency(env, req_id, &req);
    events::emit_emergency_vote(env, req_id, &voter, in_favor);

    Ok(())
}

/// Disburse an approved emergency request.
pub fn disburse_emergency(env: &Env, req_id: u64, repay_period: u64) -> Result<(), AjoError> {
    let mut req = storage::get_emergency(env, req_id).ok_or(AjoError::EmergencyRequestNotFound)?;

    if req.status != EmergencyStatus::Approved {
        return Err(AjoError::EmergencyAlreadyProcessed);
    }

    let now = utils::get_current_timestamp(env);
    let group = storage::get_group(env, req.group_id).ok_or(AjoError::GroupNotFound)?;

    crate::token::transfer_token(
        env,
        &group.token_address,
        &env.current_contract_address(),
        &req.requester,
        req.amount,
    )?;

    req.status = EmergencyStatus::Disbursed;
    req.disbursed_at = now;
    req.repay_by = now + repay_period;

    storage::store_emergency(env, req_id, &req);
    events::emit_emergency_disbursed(env, req_id, req.group_id, &req.requester, req.amount);

    Ok(())
}

/// Repay an emergency withdrawal.
pub fn repay_emergency(
    env: &Env,
    req_id: u64,
    requester: Address,
    amount: i128,
) -> Result<(), AjoError> {
    requester.require_auth();

    let mut req = storage::get_emergency(env, req_id).ok_or(AjoError::EmergencyRequestNotFound)?;

    if req.status != EmergencyStatus::Disbursed {
        return Err(AjoError::EmergencyNotDisbursed);
    }

    let outstanding = req.amount - req.amount_repaid;
    if amount > outstanding {
        return Err(AjoError::RepaymentExceedsBalance);
    }

    let group = storage::get_group(env, req.group_id).ok_or(AjoError::GroupNotFound)?;

    crate::token::transfer_token(
        env,
        &group.token_address,
        &requester,
        &env.current_contract_address(),
        amount,
    )?;

    req.amount_repaid += amount;
    if req.amount_repaid >= req.amount {
        req.status = EmergencyStatus::Repaid;
    }

    storage::store_emergency(env, req_id, &req);
    events::emit_emergency_repayment(env, req_id, &requester, amount);

    Ok(())
}

/// Get an emergency request by ID.
pub fn get_emergency_request(env: &Env, req_id: u64) -> Result<EmergencyRequest, AjoError> {
    storage::get_emergency(env, req_id).ok_or(AjoError::EmergencyRequestNotFound)
}

/// Get all emergency request IDs for a group.
pub fn get_group_emergencies(env: &Env, group_id: u64) -> soroban_sdk::Vec<u64> {
    storage::get_group_emergency_ids(env, group_id)
}
