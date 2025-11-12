use anchor_lang::prelude::*;

use crate::constants::*;
use crate::error::PortalError;
use crate::events::ChainRegistered;
use crate::state::{BridgeConfig, ChainRegistry};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct RegisterChainParams {
    pub chain_id: u16,
    pub name: String,
    pub confirmations_required: u16,
    pub bridge_contract: [u8; 32],
}

#[derive(Accounts)]
#[instruction(params: RegisterChainParams)]
pub struct RegisterChain<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [BRIDGE_CONFIG_SEED],
        bump = bridge_config.bump,
        constraint = bridge_config.is_authority(&authority.key()) @ PortalError::Unauthorized
    )]
    pub bridge_config: Account<'info, BridgeConfig>,

    #[account(
        mut,
        seeds = [CHAIN_REGISTRY_SEED],
        bump = chain_registry.bump
    )]
    pub chain_registry: Account<'info, ChainRegistry>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RegisterChain>, params: RegisterChainParams) -> Result<()> {
    require!(params.chain_id > 0, PortalError::InvalidChainId);
    require!(
        params.name.len() <= MAX_CHAIN_NAME_LEN,
        PortalError::StringTooLong
    );
    require!(
        !ctx.accounts.bridge_config.paused,
        PortalError::BridgePaused
    );

    let clock = Clock::get()?;
    let registry = &mut ctx.accounts.chain_registry;

    registry.register_chain(
        params.chain_id,
        params.name.clone(),
        params.confirmations_required,
        params.bridge_contract,
        clock.unix_timestamp,
    )?;

    let config = &mut ctx.accounts.bridge_config;
    config.registered_chains = registry.chain_count;
    config.updated_at = clock.unix_timestamp;

    emit!(ChainRegistered {
        chain_id: params.chain_id,
        chain_name: params.name,
        authority: ctx.accounts.authority.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
