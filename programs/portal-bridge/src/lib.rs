use anchor_lang::prelude::*;

pub mod constants;
pub mod error;
pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("PRT1xBridge1111111111111111111111111111111");

#[program]
pub mod portal_bridge {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, params: InitializeParams) -> Result<()> {
        instructions::initialize::handler(ctx, params)
    }

    pub fn register_chain(ctx: Context<RegisterChain>, params: RegisterChainParams) -> Result<()> {
        instructions::register_chain::handler(ctx, params)
    }
}
