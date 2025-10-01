use anchor_lang::prelude::*;

use crate::constants::*;
use crate::error::PortalError;
use crate::events::BridgeInitialized;
use crate::state::{BridgeConfig, ChainRegistry};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitializeParams {
    pub fee_bps: u16,
    pub treasury: Pubkey,
    pub relayer: Pubkey,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + BridgeConfig::INIT_SPACE,
        seeds = [BRIDGE_CONFIG_SEED],
        bump
    )]
    pub bridge_config: Account<'info, BridgeConfig>,

    #[account(
        init,
        payer = authority,
        space = 8 + ChainRegistry::INIT_SPACE,
        seeds = [CHAIN_REGISTRY_SEED],
        bump
    )]
    pub chain_registry: Account<'info, ChainRegistry>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Initialize>, params: InitializeParams) -> Result<()> {
    require!(params.fee_bps <= MAX_FEE_BPS, PortalError::FeeTooHigh);

    let clock = Clock::get()?;
    let config = &mut ctx.accounts.bridge_config;

    config.authority = ctx.accounts.authority.key();
    config.fee_bps = params.fee_bps;
    config.total_wrapped = 0;
    config.total_unwrapped = 0;
    config.total_intents = 0;
    config.active_intents = 0;
    config.registered_chains = 0;
    config.registered_wrappers = 0;
    config.registered_agents = 0;
    config.paused = false;
    config.created_at = clock.unix_timestamp;
    config.updated_at = clock.unix_timestamp;
    config.treasury = params.treasury;
    config.relayer = params.relayer;
    config.bump = ctx.bumps.bridge_config;

    let registry = &mut ctx.accounts.chain_registry;
    registry.authority = ctx.accounts.authority.key();
    registry.chain_count = 0;
    registry.chains = Vec::new();
    registry.bump = ctx.bumps.chain_registry;

    emit!(BridgeInitialized {
        authority: ctx.accounts.authority.key(),
        fee_bps: params.fee_bps,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
