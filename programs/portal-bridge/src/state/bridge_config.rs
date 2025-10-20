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

    pub fn is_relayer(&self, signer: &Pubkey) -> bool {
        self.relayer == *signer
    }

    pub fn can_register_chain(&self) -> bool {
        (self.registered_chains as usize) < MAX_CHAINS && !self.paused
    }

    pub fn calculate_fee(&self, amount: u64) -> Option<u64> {
        amount
            .checked_mul(self.fee_bps as u64)?
            .checked_div(10_000)
    }

    pub fn increment_wrapped(&mut self, amount: u64) -> Result<()> {
        self.total_wrapped = self
            .total_wrapped
            .checked_add(amount)
            .ok_or(error!(crate::error::PortalError::ArithmeticOverflow))?;
        Ok(())
    }

    pub fn increment_unwrapped(&mut self, amount: u64) -> Result<()> {
        self.total_unwrapped = self
            .total_unwrapped
            .checked_add(amount)
            .ok_or(error!(crate::error::PortalError::ArithmeticOverflow))?;
        Ok(())
    }

    pub fn increment_intents(&mut self) -> Result<u64> {
        let intent_id = self.total_intents;
        self.total_intents = self
            .total_intents
            .checked_add(1)
            .ok_or(error!(crate::error::PortalError::ArithmeticOverflow))?;
        self.active_intents = self
            .active_intents
            .checked_add(1)
            .ok_or(error!(crate::error::PortalError::ArithmeticOverflow))?;
        Ok(intent_id)
    }

    pub fn decrement_active_intents(&mut self) -> Result<()> {
        self.active_intents = self
            .active_intents
            .checked_sub(1)
            .ok_or(error!(crate::error::PortalError::ArithmeticOverflow))?;
        Ok(())
    }
}
