use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, Token, TokenAccount, Transfer};

use crate::constants::*;
use crate::error::PortalError;
use crate::events::TokensUnwrapped;
use crate::state::{AgentProfile, BridgeConfig, ChainRegistry, WrapperMeta};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UnwrapParams {
    pub amount: u64,
    pub destination_chain_id: u16,
    pub destination_address: [u8; 32],
}

#[derive(Accounts)]
#[instruction(params: UnwrapParams)]
pub struct UnwrapTokens<'info> {
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
        mut,
        associated_token::mint = wrapper_mint,
        associated_token::authority = agent,
    )]
    pub agent_token_account: Account<'info, TokenAccount>,

    /// CHECK: treasury receives fees
    #[account(mut, constraint = treasury.key() == bridge_config.treasury)]
    pub treasury: UncheckedAccount<'info>,

    #[account(
        mut,
        associated_token::mint = wrapper_mint,
        associated_token::authority = treasury,
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<UnwrapTokens>, params: UnwrapParams) -> Result<()> {
    require!(params.amount >= MIN_WRAP_AMOUNT, PortalError::AmountBelowMinimum);
    require!(
        !ctx.accounts.bridge_config.paused,
        PortalError::BridgePaused
    );
    require!(
        params.destination_address != [0u8; 32],
        PortalError::EmptyDestination
    );

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

    let burn_amount = params
        .amount
        .checked_sub(fee_amount)
        .ok_or(PortalError::ArithmeticOverflow)?;

    if fee_amount > 0 {
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.agent_token_account.to_account_info(),
                to: ctx.accounts.treasury_token_account.to_account_info(),
                authority: ctx.accounts.agent.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, fee_amount)?;
    }

    let burn_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Burn {
            mint: ctx.accounts.wrapper_mint.to_account_info(),
            from: ctx.accounts.agent_token_account.to_account_info(),
            authority: ctx.accounts.agent.to_account_info(),
        },
    );
    token::burn(burn_ctx, burn_amount)?;

    let clock = Clock::get()?;

    let meta = &mut ctx.accounts.wrapper_meta;
    meta.record_burn(burn_amount)?;
    meta.updated_at = clock.unix_timestamp;

    let config = &mut ctx.accounts.bridge_config;
    config.increment_unwrapped(burn_amount)?;
    config.updated_at = clock.unix_timestamp;

    let agent_profile = &mut ctx.accounts.agent_profile;
    require!(agent_profile.is_active(), PortalError::AgentSuspended);
    agent_profile.record_unwrap(params.amount, clock.unix_timestamp)?;

    emit!(TokensUnwrapped {
        agent: ctx.accounts.agent.key(),
        wrapper_mint: ctx.accounts.wrapper_mint.key(),
        amount: params.amount,
        destination_chain_id: params.destination_chain_id,
        destination_address: params.destination_address,
        fee_amount,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
