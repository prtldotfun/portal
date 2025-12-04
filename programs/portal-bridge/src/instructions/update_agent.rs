use anchor_lang::prelude::*;

use crate::constants::*;
use crate::error::PortalError;
use crate::events::AgentUpdated;
use crate::state::AgentProfile;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdateAgentParams {
    pub alias: String,
}

#[derive(Accounts)]
pub struct UpdateAgent<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [AGENT_SEED, owner.key().as_ref()],
        bump = agent_profile.bump,
        constraint = agent_profile.owner == owner.key() @ PortalError::Unauthorized
    )]
    pub agent_profile: Account<'info, AgentProfile>,
}

pub fn handler(ctx: Context<UpdateAgent>, params: UpdateAgentParams) -> Result<()> {
    require!(
        params.alias.len() <= MAX_AGENT_ALIAS_LEN,
        PortalError::StringTooLong
    );

    let profile = &mut ctx.accounts.agent_profile;
    require!(profile.is_active(), PortalError::AgentSuspended);

    let clock = Clock::get()?;
    profile.update_alias(params.alias.clone());
    profile.last_activity = clock.unix_timestamp;

    emit!(AgentUpdated {
        agent: ctx.accounts.owner.key(),
        alias: params.alias,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
