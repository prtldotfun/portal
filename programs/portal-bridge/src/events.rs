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
pub struct WrapperCreated {
    pub wrapper_mint: Pubkey,
    pub source_chain_id: u16,
    pub source_token_address: [u8; 32],
    pub symbol: String,
    pub decimals: u8,
    pub timestamp: i64,
}
