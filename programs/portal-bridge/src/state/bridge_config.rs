use anchor_lang::prelude::*;

use crate::constants::MAX_CHAINS;

#[account]
#[derive(InitSpace)]
pub struct BridgeConfig {
    pub authority: Pubkey,
    pub fee_bps: u16,
    pub total_wrapped: u64,
    pub total_unwrapped: u64,
    pub total_intents: u64,
    pub active_intents: u64,
    pub registered_chains: u16,
    pub registered_wrappers: u32,
    pub registered_agents: u32,
    pub paused: bool,
    pub created_at: i64,
    pub updated_at: i64,
    pub treasury: Pubkey,
    pub relayer: Pubkey,
    pub bump: u8,
}

impl BridgeConfig {
    pub fn is_authority(&self, signer: &Pubkey) -> bool {
        self.authority == *signer
    }
}
