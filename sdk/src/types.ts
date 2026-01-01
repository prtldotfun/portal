import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

export interface PortalClientConfig {
    rpcUrl: string;
    programId?: PublicKey;
    commitment?: "confirmed" | "finalized" | "processed";
}

export interface BridgeConfig {
    authority: PublicKey;
    feeBps: number;
    totalWrapped: BN;
    totalUnwrapped: BN;
    totalIntents: BN;
    activeIntents: BN;
    registeredChains: number;
    registeredWrappers: number;
    registeredAgents: number;
    paused: boolean;
    createdAt: BN;
    updatedAt: BN;
    treasury: PublicKey;
    relayer: PublicKey;
    bump: number;
}

export interface ChainEntry {
    chainId: number;
    name: string;
    active: boolean;
    confirmationsRequired: number;
    bridgeContract: Uint8Array;
    registeredAt: BN;
    totalVolume: BN;
}

export interface ChainRegistry {
    authority: PublicKey;
    chainCount: number;
    chains: ChainEntry[];
    bump: number;
}

export interface WrapperMeta {
    mint: PublicKey;
    sourceChainId: number;
    sourceTokenAddress: Uint8Array;
    symbol: string;
    name: string;
    decimals: number;
    sourceDecimals: number;
    totalSupply: BN;
    totalMinted: BN;
    totalBurned: BN;
    active: boolean;
    createdAt: BN;
    updatedAt: BN;
    metadataUri: string;
    bump: number;
    mintBump: number;
}

export type IntentStatus = "pending" | "settled" | "cancelled" | "expired";

export interface IntentRecord {
    intentId: BN;
    agent: PublicKey;
    sourceChainId: number;
    destinationChainId: number;
    wrapperMint: PublicKey;
    amount: BN;
    feeAmount: BN;
    netAmount: BN;
    destinationAddress: Uint8Array;
    status: IntentStatus;
    createdAt: BN;
    settledAt: BN;
    settlementTxHash: Uint8Array;
    relayer: PublicKey;
    expirySlot: BN;
    bump: number;
}

export type AgentStatus = "active" | "suspended";

export interface AgentProfile {
    owner: PublicKey;
    alias: string;
    status: AgentStatus;
    totalWraps: BN;
    totalUnwraps: BN;
    totalIntents: BN;
    totalVolume: BN;
    registeredAt: BN;
    lastActivity: BN;
    bump: number;
}

export interface SupportedChain {
    chainId: number;
    name: string;
    nativeCurrency: string;
    explorerUrl: string;
    rpcUrl: string;
    bridgeContract: string;
}

export interface WrapResult {
    signature: string;
    wrapperMint: PublicKey;
    amount: BN;
    adjustedAmount: BN;
    agent: PublicKey;
}

export interface UnwrapResult {
    signature: string;
    wrapperMint: PublicKey;
    amount: BN;
    feeAmount: BN;
    destinationChainId: number;
    destinationAddress: Uint8Array;
}

export interface IntentResult {
    signature: string;
    intentId: BN;
    wrapperMint: PublicKey;
    amount: BN;
    netAmount: BN;
    feeAmount: BN;
    destinationChainId: number;
    destinationAddress: Uint8Array;
    expirySlot: BN;
}

export interface SettlementResult {
    signature: string;
    intentId: BN;
    settlementTxHash: Uint8Array;
    relayer: PublicKey;
}

export interface CreateWrapperConfig {
    sourceChainId: number;
    sourceTokenAddress: Uint8Array;
    symbol: string;
    name: string;
    decimals: number;
    sourceDecimals: number;
    metadataUri: string;
}

export interface RegisterChainConfig {
    chainId: number;
    name: string;
    confirmationsRequired: number;
    bridgeContract: Uint8Array;
}

export interface InitializeConfig {
    feeBps: number;
    treasury: PublicKey;
    relayer: PublicKey;
}

export interface WrapConfig {
    wrapperMint: PublicKey;
    agentOwner: PublicKey;
    amount: BN;
    sourceTxHash: Uint8Array;
}

export interface UnwrapConfig {
    wrapperMint: PublicKey;
    amount: BN;
    destinationChainId: number;
    destinationAddress: Uint8Array;
}

export interface SubmitIntentConfig {
    wrapperMint: PublicKey;
    amount: BN;
    destinationChainId: number;
    destinationAddress: Uint8Array;
}

export interface SettleIntentConfig {
    intentId: BN;
    settlementTxHash: Uint8Array;
}
