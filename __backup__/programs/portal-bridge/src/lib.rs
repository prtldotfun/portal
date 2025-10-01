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

    pub fn create_wrapper(
        ctx: Context<CreateWrapper>,
        params: CreateWrapperParams,
    ) -> Result<()> {
        instructions::create_wrapper::handler(ctx, params)
    }

    pub fn wrap_tokens(ctx: Context<WrapTokens>, params: WrapParams) -> Result<()> {
        instructions::wrap::handler(ctx, params)
    }

    pub fn unwrap_tokens(ctx: Context<UnwrapTokens>, params: UnwrapParams) -> Result<()> {
        instructions::unwrap::handler(ctx, params)
    }

    pub fn submit_intent(ctx: Context<SubmitIntent>, params: SubmitIntentParams) -> Result<()> {
        instructions::submit_intent::handler(ctx, params)
    }

    pub fn settle_intent(ctx: Context<SettleIntent>, params: SettleIntentParams) -> Result<()> {
        instructions::settle_intent::handler(ctx, params)
    }

    pub fn register_agent(
        ctx: Context<RegisterAgent>,
        params: RegisterAgentParams,
    ) -> Result<()> {
        instructions::register_agent::handler(ctx, params)
    }

    pub fn update_agent(ctx: Context<UpdateAgent>, params: UpdateAgentParams) -> Result<()> {
        instructions::update_agent::handler(ctx, params)
    }

    pub fn update_bridge_config(
        ctx: Context<UpdateBridgeConfig>,
        params: UpdateBridgeConfigParams,
    ) -> Result<()> {
        instructions::update_config::handler(ctx, params)
    }

    pub fn cancel_intent(ctx: Context<CancelIntent>) -> Result<()> {
        instructions::cancel_intent::handler(ctx)
    }
}
