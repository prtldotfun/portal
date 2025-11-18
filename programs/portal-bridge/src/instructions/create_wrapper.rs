use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};

use crate::constants::*;
use crate::error::PortalError;
use crate::events::WrapperCreated;
use crate::state::{BridgeConfig, ChainRegistry, WrapperMeta};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CreateWrapperParams {
    pub source_chain_id: u16,
    pub source_token_address: [u8; 32],
    pub symbol: String,
    pub name: String,
    pub decimals: u8,
    pub source_decimals: u8,
    pub metadata_uri: String,
}

#[derive(Accounts)]
#[instruction(params: CreateWrapperParams)]
pub struct CreateWrapper<'info> {
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
        seeds = [CHAIN_REGISTRY_SEED],
        bump = chain_registry.bump
    )]
    pub chain_registry: Account<'info, ChainRegistry>,

    #[account(
        init,
        payer = authority,
        mint::decimals = params.decimals,
        mint::authority = bridge_config,
        seeds = [
            WRAPPER_MINT_SEED,
            params.source_chain_id.to_le_bytes().as_ref(),
            params.source_token_address.as_ref()
        ],
        bump
    )]
    pub wrapper_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = authority,
        space = 8 + WrapperMeta::INIT_SPACE,
        seeds = [
            WRAPPER_META_SEED,
            wrapper_mint.key().as_ref()
        ],
        bump
    )]
    pub wrapper_meta: Account<'info, WrapperMeta>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<CreateWrapper>, params: CreateWrapperParams) -> Result<()> {
    require!(
        params.symbol.len() <= MAX_TOKEN_SYMBOL_LEN,
        PortalError::StringTooLong
    );
    require!(
        params.name.len() <= MAX_TOKEN_NAME_LEN,
        PortalError::StringTooLong
    );
    require!(
        params.metadata_uri.len() <= MAX_URI_LEN,
        PortalError::StringTooLong
    );
    require!(
        !ctx.accounts.bridge_config.paused,
        PortalError::BridgePaused
    );

    let registry = &ctx.accounts.chain_registry;
    let chain_active = registry.is_chain_active(params.source_chain_id)?;
    require!(chain_active, PortalError::ChainInactive);

    let clock = Clock::get()?;
    let meta = &mut ctx.accounts.wrapper_meta;

    meta.mint = ctx.accounts.wrapper_mint.key();
    meta.source_chain_id = params.source_chain_id;
    meta.source_token_address = params.source_token_address;
    meta.symbol = params.symbol.clone();
    meta.name = params.name;
    meta.decimals = params.decimals;
    meta.source_decimals = params.source_decimals;
    meta.total_supply = 0;
    meta.total_minted = 0;
    meta.total_burned = 0;
    meta.active = true;
    meta.created_at = clock.unix_timestamp;
    meta.updated_at = clock.unix_timestamp;
    meta.metadata_uri = params.metadata_uri;
    meta.bump = ctx.bumps.wrapper_meta;
    meta.mint_bump = ctx.bumps.wrapper_mint;

    let config = &mut ctx.accounts.bridge_config;
    config.registered_wrappers = config
        .registered_wrappers
        .checked_add(1)
        .ok_or(PortalError::ArithmeticOverflow)?;
    config.updated_at = clock.unix_timestamp;

    emit!(WrapperCreated {
        wrapper_mint: ctx.accounts.wrapper_mint.key(),
        source_chain_id: params.source_chain_id,
        source_token_address: params.source_token_address,
        symbol: params.symbol,
        decimals: params.decimals,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
