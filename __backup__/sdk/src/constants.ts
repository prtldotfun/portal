import { PublicKey } from "@solana/web3.js";

export const PORTAL_PROGRAM_ID = new PublicKey(
    "PRT1xBridge1111111111111111111111111111111"
);

export const BRIDGE_CONFIG_SEED = Buffer.from("bridge_config");
export const CHAIN_REGISTRY_SEED = Buffer.from("chain_registry");
export const WRAPPER_MINT_SEED = Buffer.from("wrapper_mint");
export const WRAPPER_META_SEED = Buffer.from("wrapper_meta");
export const INTENT_SEED = Buffer.from("intent");
export const AGENT_SEED = Buffer.from("agent");
export const ESCROW_SEED = Buffer.from("escrow");

export const MAX_CHAIN_NAME_LEN = 32;
export const MAX_TOKEN_SYMBOL_LEN = 16;
export const MAX_TOKEN_NAME_LEN = 64;
export const MAX_AGENT_ALIAS_LEN = 32;
export const MAX_CHAINS = 64;
export const MAX_URI_LEN = 200;

export const BASIS_POINTS_DIVISOR = 10_000;
export const MAX_FEE_BPS = 500;
export const MIN_WRAP_AMOUNT = 1_000;
export const INTENT_EXPIRY_SLOTS = 216_000;
export const MAX_INTENT_AMOUNT = 1_000_000_000_000;

export const SUPPORTED_CHAINS: Record<
    number,
    { name: string; nativeCurrency: string; explorerUrl: string }
> = {
    1: {
        name: "Ethereum",
        nativeCurrency: "ETH",
        explorerUrl: "https://etherscan.io",
    },
    56: {
        name: "BNB Chain",
        nativeCurrency: "BNB",
        explorerUrl: "https://bscscan.com",
    },
    137: {
        name: "Polygon",
        nativeCurrency: "MATIC",
        explorerUrl: "https://polygonscan.com",
    },
    42161: {
        name: "Arbitrum One",
        nativeCurrency: "ETH",
        explorerUrl: "https://arbiscan.io",
    },
    8453: {
        name: "Base",
        nativeCurrency: "ETH",
        explorerUrl: "https://basescan.org",
    },
    43114: {
        name: "Avalanche",
        nativeCurrency: "AVAX",
        explorerUrl: "https://snowscan.xyz",
    },
    10: {
        name: "Optimism",
        nativeCurrency: "ETH",
        explorerUrl: "https://optimistic.etherscan.io",
    },
};
