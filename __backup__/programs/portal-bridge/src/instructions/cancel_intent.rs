use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount};

use crate::constants::*;
use crate::error::PortalError;
use crate::events::IntentCancelled;
use crate::state::{BridgeConfig, IntentRecord, WrapperMeta};

#[derive(Accounts)]
pub struct CancelIntent<'info> {
    #[account(mut)]
    pub agent: Signer<'info>,

    #[account(
        mut,
        seeds = [BRIDGE_CONFIG_SEED],
        bump = bridge_config.bump
    )]
    pub bridge_config: Account<'info, BridgeConfig>,

    #[account(
        mut,
        seeds = [
            INTENT_SEED,
            intent_record.intent_id.to_le_bytes().as_ref()
        ],
        bump = intent_record.bump,
        constraint = intent_record.agent == agent.key() @ PortalError::Unauthorized
    )]
    pub intent_record: Account<'info, IntentRecord>,

    #[account(
        mut,
        seeds = [
            WRAPPER_MINT_SEED,
            wrapper_meta.source_chain_id.to_le_bytes().as_ref(),
            wrapper_meta.source_token_address.as_ref()
        ],
        bump = wrapper_meta.mint_bump,
        constraint = intent_record.wrapper_mint == wrapper_mint.key()
    )]
    pub wrapper_mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [WRAPPER_META_SEED, wrapper_mint.key().as_ref()],
        bump = wrapper_meta.bump
    )]
    pub wrapper_meta: Account<'info, WrapperMeta>,

    #[account(
        mut,
        associated_token::mint = wrapper_mint,
        associated_token::authority = agent,
    )]
    pub agent_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<CancelIntent>) -> Result<()> {
    let slot = Clock::get()?.slot;
    let clock = Clock::get()?;

    let intent = &mut ctx.accounts.intent_record;
    intent.cancel(slot)?;

    let refund = intent.refund_amount();

    let config = &ctx.accounts.bridge_config;
    let config_seeds = &[BRIDGE_CONFIG_SEED, &[config.bump]];
    let signer_seeds = &[&config_seeds[..]];

    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        MintTo {
            mint: ctx.accounts.wrapper_mint.to_account_info(),
            to: ctx.accounts.agent_token_account.to_account_info(),
            authority: ctx.accounts.bridge_config.to_account_info(),
        },
        signer_seeds,
    );
    token::mint_to(cpi_ctx, refund)?;

    let meta = &mut ctx.accounts.wrapper_meta;
    meta.record_mint(refund)?;
    meta.updated_at = clock.unix_timestamp;

    let config = &mut ctx.accounts.bridge_config;
    config.decrement_active_intents()?;
    config.updated_at = clock.unix_timestamp;

    emit!(IntentCancelled {
        intent_id: intent.intent_id,
        agent: ctx.accounts.agent.key(),
        refund_amount: refund,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
