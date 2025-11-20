use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount};

use crate::constants::*;
use crate::error::PortalError;
use crate::events::TokensWrapped;
use crate::state::{AgentProfile, BridgeConfig, ChainRegistry, WrapperMeta};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct WrapParams {
    pub amount: u64,
    pub source_tx_hash: [u8; 32],
}

#[derive(Accounts)]
#[instruction(params: WrapParams)]
pub struct WrapTokens<'info> {
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
        seeds = [AGENT_SEED, agent_owner.key().as_ref()],
        bump = agent_profile.bump
    )]
    pub agent_profile: Account<'info, AgentProfile>,

    /// CHECK: the agent wallet receiving wrapped tokens
    pub agent_owner: UncheckedAccount<'info>,

    #[account(
        mut,
        associated_token::mint = wrapper_mint,
        associated_token::authority = agent_owner,
    )]
    pub agent_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<WrapTokens>, params: WrapParams) -> Result<()> {
    require!(params.amount >= MIN_WRAP_AMOUNT, PortalError::AmountBelowMinimum);
    require!(
        params.amount <= MAX_INTENT_AMOUNT,
        PortalError::AmountExceedsMaximum
    );
    require!(
        !ctx.accounts.bridge_config.paused,
        PortalError::BridgePaused
    );

    let meta = &ctx.accounts.wrapper_meta;
    require!(meta.active, PortalError::WrapperMintNotFound);

    let chain_active = ctx
        .accounts
        .chain_registry
        .is_chain_active(meta.source_chain_id)?;
    require!(chain_active, PortalError::ChainInactive);

    let adjusted_amount = meta
        .adjust_amount_to_local(params.amount)
        .ok_or(PortalError::ArithmeticOverflow)?;

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

    token::mint_to(cpi_ctx, adjusted_amount)?;

    let clock = Clock::get()?;

    let meta = &mut ctx.accounts.wrapper_meta;
    meta.record_mint(adjusted_amount)?;
    meta.updated_at = clock.unix_timestamp;

    let config = &mut ctx.accounts.bridge_config;
    config.increment_wrapped(adjusted_amount)?;
    config.updated_at = clock.unix_timestamp;

    let agent = &mut ctx.accounts.agent_profile;
    require!(agent.is_active(), PortalError::AgentSuspended);
    agent.record_wrap(adjusted_amount, clock.unix_timestamp)?;

    emit!(TokensWrapped {
        agent: ctx.accounts.agent_owner.key(),
        wrapper_mint: ctx.accounts.wrapper_mint.key(),
        amount: adjusted_amount,
        source_chain_id: meta.source_chain_id,
        source_tx_hash: params.source_tx_hash,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
