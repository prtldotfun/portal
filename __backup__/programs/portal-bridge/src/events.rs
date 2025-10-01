use anchor_lang::prelude::*;

#[event]
pub struct BridgeInitialized {
    pub authority: Pubkey,
    pub fee_bps: u16,
    pub timestamp: i64,
}

#[event]
pub struct ChainRegistered {
    pub chain_id: u16,
    pub chain_name: String,
    pub authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct ChainStatusUpdated {
    pub chain_id: u16,
    pub active: bool,
    pub timestamp: i64,
}

#[event]
pub struct WrapperCreated {
    pub wrapper_mint: Pubkey,
    pub source_chain_id: u16,
    pub source_token_address: [u8; 32],
    pub symbol: String,
    pub decimals: u8,
    pub timestamp: i64,
}

#[event]
pub struct TokensWrapped {
    pub agent: Pubkey,
    pub wrapper_mint: Pubkey,
    pub amount: u64,
    pub source_chain_id: u16,
    pub source_tx_hash: [u8; 32],
    pub timestamp: i64,
}

#[event]
pub struct TokensUnwrapped {
    pub agent: Pubkey,
    pub wrapper_mint: Pubkey,
    pub amount: u64,
    pub destination_chain_id: u16,
    pub destination_address: [u8; 32],
    pub fee_amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct IntentSubmitted {
    pub intent_id: u64,
    pub agent: Pubkey,
    pub source_chain_id: u16,
    pub destination_chain_id: u16,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct IntentSettled {
    pub intent_id: u64,
    pub relayer: Pubkey,
    pub settlement_tx_hash: [u8; 32],
    pub timestamp: i64,
}

#[event]
pub struct IntentCancelled {
    pub intent_id: u64,
    pub agent: Pubkey,
    pub refund_amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct AgentRegistered {
    pub agent: Pubkey,
    pub alias: String,
    pub timestamp: i64,
}

#[event]
pub struct AgentUpdated {
    pub agent: Pubkey,
    pub alias: String,
    pub timestamp: i64,
}

#[event]
pub struct BridgeConfigUpdated {
    pub authority: Pubkey,
    pub fee_bps: u16,
    pub paused: bool,
    pub timestamp: i64,
}
