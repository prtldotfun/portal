use anchor_lang::prelude::*;

use crate::constants::MAX_AGENT_ALIAS_LEN;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum AgentStatus {
    Active,
    Suspended,
}

#[account]
#[derive(InitSpace)]
pub struct AgentProfile {
    pub owner: Pubkey,
    #[max_len(MAX_AGENT_ALIAS_LEN)]
    pub alias: String,
    pub status: AgentStatus,
    pub total_wraps: u64,
    pub total_unwraps: u64,
    pub total_intents: u64,
    pub total_volume: u64,
    pub registered_at: i64,
    pub last_activity: i64,
    pub bump: u8,
}

impl AgentProfile {
    pub fn is_active(&self) -> bool {
        self.status == AgentStatus::Active
    }

    pub fn record_wrap(&mut self, amount: u64, timestamp: i64) -> Result<()> {
        self.total_wraps = self
            .total_wraps
            .checked_add(1)
            .ok_or(error!(crate::error::PortalError::ArithmeticOverflow))?;
        self.total_volume = self
            .total_volume
            .checked_add(amount)
            .ok_or(error!(crate::error::PortalError::ArithmeticOverflow))?;
        self.last_activity = timestamp;
        Ok(())
    }

    pub fn record_unwrap(&mut self, amount: u64, timestamp: i64) -> Result<()> {
        self.total_unwraps = self
            .total_unwraps
            .checked_add(1)
            .ok_or(error!(crate::error::PortalError::ArithmeticOverflow))?;
        self.total_volume = self
            .total_volume
            .checked_add(amount)
            .ok_or(error!(crate::error::PortalError::ArithmeticOverflow))?;
        self.last_activity = timestamp;
        Ok(())
    }

    pub fn record_intent(&mut self, amount: u64, timestamp: i64) -> Result<()> {
        self.total_intents = self
            .total_intents
            .checked_add(1)
            .ok_or(error!(crate::error::PortalError::ArithmeticOverflow))?;
        self.total_volume = self
            .total_volume
            .checked_add(amount)
            .ok_or(error!(crate::error::PortalError::ArithmeticOverflow))?;
        self.last_activity = timestamp;
        Ok(())
    }

    pub fn update_alias(&mut self, new_alias: String) {
        self.alias = new_alias;
    }
}
