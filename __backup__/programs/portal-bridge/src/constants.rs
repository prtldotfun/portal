use anchor_lang::prelude::*;

#[constant]
pub const BRIDGE_CONFIG_SEED: &[u8] = b"bridge_config";

#[constant]
pub const CHAIN_REGISTRY_SEED: &[u8] = b"chain_registry";

#[constant]
pub const WRAPPER_MINT_SEED: &[u8] = b"wrapper_mint";

#[constant]
pub const WRAPPER_META_SEED: &[u8] = b"wrapper_meta";

#[constant]
pub const INTENT_SEED: &[u8] = b"intent";

#[constant]
pub const AGENT_SEED: &[u8] = b"agent";

#[constant]
pub const ESCROW_SEED: &[u8] = b"escrow";

pub const MAX_CHAIN_NAME_LEN: usize = 32;
pub const MAX_TOKEN_SYMBOL_LEN: usize = 16;
pub const MAX_TOKEN_NAME_LEN: usize = 64;
pub const MAX_AGENT_ALIAS_LEN: usize = 32;
pub const MAX_CHAINS: usize = 64;
pub const MAX_URI_LEN: usize = 200;

pub const BASIS_POINTS_DIVISOR: u64 = 10_000;
pub const MAX_FEE_BPS: u16 = 500;
pub const MIN_WRAP_AMOUNT: u64 = 1_000;
pub const INTENT_EXPIRY_SLOTS: u64 = 216_000;
pub const MAX_INTENT_AMOUNT: u64 = 1_000_000_000_000;
