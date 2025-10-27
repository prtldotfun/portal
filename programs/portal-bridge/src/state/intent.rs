use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum IntentStatus {
    Pending,
    Settled,
    Cancelled,
    Expired,
}

#[account]
#[derive(InitSpace)]
pub struct IntentRecord {
    pub intent_id: u64,
    pub agent: Pubkey,
    pub source_chain_id: u16,
    pub destination_chain_id: u16,
    pub wrapper_mint: Pubkey,
    pub amount: u64,
    pub fee_amount: u64,
    pub net_amount: u64,
    pub destination_address: [u8; 32],
    pub status: IntentStatus,
    pub created_at: i64,
    pub settled_at: i64,
    pub settlement_tx_hash: [u8; 32],
    pub relayer: Pubkey,
    pub expiry_slot: u64,
    pub bump: u8,
}

impl IntentRecord {
    pub fn is_pending(&self) -> bool {
        self.status == IntentStatus::Pending
    }

    pub fn is_expired(&self, current_slot: u64) -> bool {
        current_slot > self.expiry_slot
    }

    pub fn can_settle(&self, current_slot: u64) -> bool {
        self.is_pending() && !self.is_expired(current_slot)
    }

    pub fn can_cancel(&self, current_slot: u64) -> bool {
        self.is_pending() && self.is_expired(current_slot)
    }

    pub fn settle(
        &mut self,
        relayer: Pubkey,
        settlement_tx_hash: [u8; 32],
        timestamp: i64,
    ) -> Result<()> {
        require!(self.is_pending(), crate::error::PortalError::IntentAlreadySettled);
        self.status = IntentStatus::Settled;
        self.relayer = relayer;
        self.settlement_tx_hash = settlement_tx_hash;
        self.settled_at = timestamp;
        Ok(())
    }

    pub fn cancel(&mut self, current_slot: u64) -> Result<()> {
        require!(self.is_pending(), crate::error::PortalError::IntentAlreadyCancelled);
        require!(
            self.is_expired(current_slot),
            crate::error::PortalError::IntentStillPending
        );
        self.status = IntentStatus::Cancelled;
        Ok(())
    }

    pub fn refund_amount(&self) -> u64 {
        self.amount
    }
}
