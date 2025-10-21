use anchor_lang::prelude::*;

use crate::constants::{MAX_CHAIN_NAME_LEN, MAX_CHAINS};
use crate::error::PortalError;

#[account]
#[derive(InitSpace)]
pub struct ChainRegistry {
    pub authority: Pubkey,
    pub chain_count: u16,
    #[max_len(MAX_CHAINS)]
    pub chains: Vec<ChainEntry>,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct ChainEntry {
    pub chain_id: u16,
    #[max_len(MAX_CHAIN_NAME_LEN)]
    pub name: String,
    pub active: bool,
    pub confirmations_required: u16,
    pub bridge_contract: [u8; 32],
    pub registered_at: i64,
    pub total_volume: u64,
}

impl ChainRegistry {
    pub fn find_chain(&self, chain_id: u16) -> Option<&ChainEntry> {
        self.chains.iter().find(|c| c.chain_id == chain_id)
    }

    pub fn find_chain_mut(&mut self, chain_id: u16) -> Option<&mut ChainEntry> {
        self.chains.iter_mut().find(|c| c.chain_id == chain_id)
    }

    pub fn has_chain(&self, chain_id: u16) -> bool {
        self.chains.iter().any(|c| c.chain_id == chain_id)
    }

    pub fn is_chain_active(&self, chain_id: u16) -> Result<bool> {
        let chain = self
            .find_chain(chain_id)
            .ok_or(PortalError::ChainNotFound)?;
        Ok(chain.active)
    }

    pub fn register_chain(
        &mut self,
        chain_id: u16,
        name: String,
        confirmations: u16,
        bridge_contract: [u8; 32],
        timestamp: i64,
    ) -> Result<()> {
        require!(!self.has_chain(chain_id), PortalError::ChainAlreadyRegistered);
        require!(
            (self.chain_count as usize) < MAX_CHAINS,
            PortalError::MaxChainsReached
        );

        self.chains.push(ChainEntry {
            chain_id,
            name,
            active: true,
            confirmations_required: confirmations,
            bridge_contract,
            registered_at: timestamp,
            total_volume: 0,
        });
        self.chain_count = self
            .chain_count
            .checked_add(1)
            .ok_or(PortalError::ArithmeticOverflow)?;

        Ok(())
    }

    pub fn set_chain_status(&mut self, chain_id: u16, active: bool) -> Result<()> {
        let chain = self
            .find_chain_mut(chain_id)
            .ok_or(PortalError::ChainNotFound)?;
        chain.active = active;
        Ok(())
    }

    pub fn add_volume(&mut self, chain_id: u16, amount: u64) -> Result<()> {
        let chain = self
            .find_chain_mut(chain_id)
            .ok_or(PortalError::ChainNotFound)?;
        chain.total_volume = chain
            .total_volume
            .checked_add(amount)
            .ok_or(PortalError::ArithmeticOverflow)?;
        Ok(())
    }
}
