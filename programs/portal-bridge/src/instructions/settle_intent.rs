use anchor_lang::prelude::*;

use crate::constants::*;
use crate::error::PortalError;
use crate::events::IntentSettled;
use crate::state::{BridgeConfig, IntentRecord};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct SettleIntentParams {
    pub settlement_tx_hash: [u8; 32],
}

#[derive(Accounts)]
pub struct SettleIntent<'info> {
    #[account(mut)]
    pub relayer: Signer<'info>,

    #[account(
        mut,
        seeds = [BRIDGE_CONFIG_SEED],
        bump = bridge_config.bump,
        constraint = bridge_config.is_relayer(&relayer.key()) @ PortalError::Unauthorized
    )]
    pub bridge_config: Account<'info, BridgeConfig>,

    #[account(
        mut,
        seeds = [
            INTENT_SEED,
            intent_record.intent_id.to_le_bytes().as_ref()
        ],
        bump = intent_record.bump
    )]
    pub intent_record: Account<'info, IntentRecord>,
}

pub fn handler(ctx: Context<SettleIntent>, params: SettleIntentParams) -> Result<()> {
    require!(
        !ctx.accounts.bridge_config.paused,
        PortalError::BridgePaused
    );

    let clock = Clock::get()?;
    let slot = Clock::get()?.slot;

    let intent = &mut ctx.accounts.intent_record;
    require!(intent.can_settle(slot), PortalError::IntentExpired);

    intent.settle(
        ctx.accounts.relayer.key(),
        params.settlement_tx_hash,
        clock.unix_timestamp,
    )?;

    let config = &mut ctx.accounts.bridge_config;
    config.decrement_active_intents()?;
    config.updated_at = clock.unix_timestamp;

    emit!(IntentSettled {
        intent_id: intent.intent_id,
        relayer: ctx.accounts.relayer.key(),
        settlement_tx_hash: params.settlement_tx_hash,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
