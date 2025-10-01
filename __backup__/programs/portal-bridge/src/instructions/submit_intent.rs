use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, Token, TokenAccount};

use crate::constants::*;
use crate::error::PortalError;
use crate::events::IntentSubmitted;
use crate::state::{AgentProfile, BridgeConfig, ChainRegistry, IntentRecord, IntentStatus, WrapperMeta};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct SubmitIntentParams {
    pub amount: u64,
    pub destination_chain_id: u16,
    pub destination_address: [u8; 32],
}

#[derive(Accounts)]
#[instruction(params: SubmitIntentParams)]
pub struct SubmitIntent<'info> {
    #[account(mut)]
    pub agent: Signer<'info>,

    #[account(
        mut,
        seeds = [BRIDGE_CONFIG_SEED],
        bump = bridge_config.bump
    )]
    pub bridge_config: Account<'info, BridgeConfig>,

    #[account(
        seeds = [CHAIN_REGISTRY_SEED],
        bump = chain_registry.bump
    )]
    pub chain_registry: Account<'info, ChainRegistry>,

    #[account(
        mut,
        seeds = [
            WRAPPER_MINT_SEED,
            wrapper_meta.source_chain_id.to_le_bytes().as_ref(),
            wrapper_meta.source_token_address.as_ref()
        ],
        bump = wrapper_meta.mint_bump
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
        seeds = [AGENT_SEED, agent.key().as_ref()],
        bump = agent_profile.bump
    )]
    pub agent_profile: Account<'info, AgentProfile>,

    #[account(
        init,
        payer = agent,
        space = 8 + IntentRecord::INIT_SPACE,
        seeds = [
            INTENT_SEED,
            bridge_config.total_intents.to_le_bytes().as_ref()
        ],
        bump
    )]
    pub intent_record: Account<'info, IntentRecord>,

    #[account(
        mut,
        associated_token::mint = wrapper_mint,
        associated_token::authority = agent,
    )]
    pub agent_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<SubmitIntent>, params: SubmitIntentParams) -> Result<()> {
    require!(params.amount >= MIN_WRAP_AMOUNT, PortalError::AmountBelowMinimum);
    require!(
        params.amount <= MAX_INTENT_AMOUNT,
        PortalError::AmountExceedsMaximum
    );
    require!(
        !ctx.accounts.bridge_config.paused,
        PortalError::BridgePaused
    );
    require!(
        params.destination_address != [0u8; 32],
        PortalError::EmptyDestination
    );

    let agent_profile = &ctx.accounts.agent_profile;
    require!(agent_profile.is_active(), PortalError::AgentSuspended);

    let meta = &ctx.accounts.wrapper_meta;
    require!(meta.active, PortalError::WrapperMintNotFound);

    let chain_active = ctx
        .accounts
        .chain_registry
        .is_chain_active(params.destination_chain_id)?;
    require!(chain_active, PortalError::ChainInactive);

    let agent_balance = ctx.accounts.agent_token_account.amount;
    require!(agent_balance >= params.amount, PortalError::InsufficientBalance);

    let config = &ctx.accounts.bridge_config;
    let fee_amount = config
        .calculate_fee(params.amount)
        .ok_or(PortalError::ArithmeticOverflow)?;
    let net_amount = params
        .amount
        .checked_sub(fee_amount)
        .ok_or(PortalError::ArithmeticOverflow)?;

    let burn_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Burn {
            mint: ctx.accounts.wrapper_mint.to_account_info(),
            from: ctx.accounts.agent_token_account.to_account_info(),
            authority: ctx.accounts.agent.to_account_info(),
        },
    );
    token::burn(burn_ctx, params.amount)?;

    let clock = Clock::get()?;
    let slot = Clock::get()?.slot;

    let config = &mut ctx.accounts.bridge_config;
    let intent_id = config.increment_intents()?;
    config.updated_at = clock.unix_timestamp;

    let meta = &mut ctx.accounts.wrapper_meta;
    meta.record_burn(params.amount)?;
    meta.updated_at = clock.unix_timestamp;

    let intent = &mut ctx.accounts.intent_record;
    intent.intent_id = intent_id;
    intent.agent = ctx.accounts.agent.key();
    intent.source_chain_id = meta.source_chain_id;
    intent.destination_chain_id = params.destination_chain_id;
    intent.wrapper_mint = ctx.accounts.wrapper_mint.key();
    intent.amount = params.amount;
    intent.fee_amount = fee_amount;
    intent.net_amount = net_amount;
    intent.destination_address = params.destination_address;
    intent.status = IntentStatus::Pending;
    intent.created_at = clock.unix_timestamp;
    intent.settled_at = 0;
    intent.settlement_tx_hash = [0u8; 32];
    intent.relayer = Pubkey::default();
    intent.expiry_slot = slot
        .checked_add(INTENT_EXPIRY_SLOTS)
        .ok_or(PortalError::ArithmeticOverflow)?;
    intent.bump = ctx.bumps.intent_record;

    let agent = &mut ctx.accounts.agent_profile;
    agent.record_intent(params.amount, clock.unix_timestamp)?;

    emit!(IntentSubmitted {
        intent_id,
        agent: ctx.accounts.agent.key(),
        source_chain_id: meta.source_chain_id,
        destination_chain_id: params.destination_chain_id,
        amount: params.amount,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
