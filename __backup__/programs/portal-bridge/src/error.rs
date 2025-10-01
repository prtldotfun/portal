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

    #[msg("Wrapper token already exists for this chain and asset")]
    WrapperAlreadyExists,

    #[msg("Wrapper mint not found")]
    WrapperMintNotFound,

    #[msg("Wrap amount is below the minimum threshold")]
    AmountBelowMinimum,

    #[msg("Wrap amount exceeds the maximum allowed")]
    AmountExceedsMaximum,

    #[msg("Insufficient balance for unwrap operation")]
    InsufficientBalance,

    #[msg("Intent has already been settled")]
    IntentAlreadySettled,

    #[msg("Intent has already been cancelled")]
    IntentAlreadyCancelled,

    #[msg("Intent has expired and can no longer be settled")]
    IntentExpired,

    #[msg("Intent is still pending and cannot be cancelled yet")]
    IntentStillPending,

    #[msg("Agent is already registered")]
    AgentAlreadyRegistered,

    #[msg("Agent profile not found")]
    AgentNotFound,

    #[msg("Agent is currently suspended")]
    AgentSuspended,

    #[msg("Fee exceeds the maximum allowed basis points")]
    FeeTooHigh,

    #[msg("Invalid chain identifier format")]
    InvalidChainId,

    #[msg("Invalid token address format")]
    InvalidTokenAddress,

    #[msg("Overflow occurred during arithmetic operation")]
    ArithmeticOverflow,

    #[msg("String length exceeds the maximum allowed")]
    StringTooLong,

    #[msg("Bridge is currently paused")]
    BridgePaused,

    #[msg("Destination address cannot be empty")]
    EmptyDestination,

    #[msg("Token decimals mismatch between chains")]
    DecimalsMismatch,

    #[msg("Relayer signature verification failed")]
    RelayerVerificationFailed,
}
