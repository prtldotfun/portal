use anchor_lang::prelude::*;

use crate::constants::*;
use crate::error::PortalError;
use crate::events::BridgeConfigUpdated;
use crate::state::BridgeConfig;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdateBridgeConfigParams {
    pub fee_bps: Option<u16>,
    pub paused: Option<bool>,
    pub treasury: Option<Pubkey>,
    pub relayer: Option<Pubkey>,
}

#[derive(Accounts)]
pub struct UpdateBridgeConfig<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [BRIDGE_CONFIG_SEED],
        bump = bridge_config.bump,
        constraint = bridge_config.is_authority(&authority.key()) @ PortalError::Unauthorized
    )]
    pub bridge_config: Account<'info, BridgeConfig>,
}

pub fn handler(ctx: Context<UpdateBridgeConfig>, params: UpdateBridgeConfigParams) -> Result<()> {
    let config = &mut ctx.accounts.bridge_config;
    let clock = Clock::get()?;

    if let Some(fee_bps) = params.fee_bps {
        require!(fee_bps <= MAX_FEE_BPS, PortalError::FeeTooHigh);
        config.fee_bps = fee_bps;
    }

    if let Some(paused) = params.paused {
        config.paused = paused;
    }

    if let Some(treasury) = params.treasury {
        config.treasury = treasury;
    }

    if let Some(relayer) = params.relayer {
        config.relayer = relayer;
    }

    config.updated_at = clock.unix_timestamp;

    emit!(BridgeConfigUpdated {
        authority: ctx.accounts.authority.key(),
        fee_bps: config.fee_bps,
        paused: config.paused,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
