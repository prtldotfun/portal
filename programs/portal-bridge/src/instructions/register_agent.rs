use anchor_lang::prelude::*;

use crate::constants::*;
use crate::error::PortalError;
use crate::events::AgentRegistered;
use crate::state::{AgentProfile, AgentStatus, BridgeConfig};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct RegisterAgentParams {
    pub alias: String,
}

#[derive(Accounts)]
pub struct RegisterAgent<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [BRIDGE_CONFIG_SEED],
        bump = bridge_config.bump
    )]
    pub bridge_config: Account<'info, BridgeConfig>,

    #[account(
        init,
        payer = owner,
        space = 8 + AgentProfile::INIT_SPACE,
        seeds = [AGENT_SEED, owner.key().as_ref()],
        bump
    )]
    pub agent_profile: Account<'info, AgentProfile>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RegisterAgent>, params: RegisterAgentParams) -> Result<()> {
    require!(
        params.alias.len() <= MAX_AGENT_ALIAS_LEN,
        PortalError::StringTooLong
    );
    require!(
        !ctx.accounts.bridge_config.paused,
        PortalError::BridgePaused
    );

    let clock = Clock::get()?;
    let profile = &mut ctx.accounts.agent_profile;

    profile.owner = ctx.accounts.owner.key();
    profile.alias = params.alias.clone();
    profile.status = AgentStatus::Active;
    profile.total_wraps = 0;
    profile.total_unwraps = 0;
    profile.total_intents = 0;
    profile.total_volume = 0;
    profile.registered_at = clock.unix_timestamp;
    profile.last_activity = clock.unix_timestamp;
    profile.bump = ctx.bumps.agent_profile;

    let config = &mut ctx.accounts.bridge_config;
    config.registered_agents = config
        .registered_agents
        .checked_add(1)
        .ok_or(PortalError::ArithmeticOverflow)?;
    config.updated_at = clock.unix_timestamp;

    emit!(AgentRegistered {
        agent: ctx.accounts.owner.key(),
        alias: params.alias,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
