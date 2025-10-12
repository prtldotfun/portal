use anchor_lang::prelude::*;

#[error_code]
pub enum PortalError {
    #[msg("Unauthorized: signer is not the bridge authority")]
    Unauthorized,

    #[msg("Chain already registered in the bridge")]
    ChainAlreadyRegistered,

    #[msg("Chain not found in the registry")]
    ChainNotFound,

    #[msg("Chain is currently inactive")]
    ChainInactive,

    #[msg("Maximum number of supported chains reached")]
    MaxChainsReached,

    #[msg("Wrap amount is below the minimum threshold")]
    AmountBelowMinimum,

    #[msg("Insufficient balance for unwrap operation")]
    InsufficientBalance,

    #[msg("Fee exceeds the maximum allowed basis points")]
    FeeTooHigh,

    #[msg("Overflow occurred during arithmetic operation")]
    ArithmeticOverflow,
}
