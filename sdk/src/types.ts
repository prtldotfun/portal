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
