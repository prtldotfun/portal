import {
    Connection,
    PublicKey,
    Keypair,
    Transaction,
    TransactionInstruction,
    sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import BN from "bn.js";

import { PORTAL_PROGRAM_ID } from "./constants";
import { PortalInstructions } from "./instructions";
import {
    deriveBridgeConfigPda,
    deriveChainRegistryPda,
    deriveWrapperMintPda,
    deriveWrapperMetaPda,
    deriveIntentPda,
    deriveAgentPda,
} from "./utils/pda";
import type {
    PortalClientConfig,
    BridgeConfig,
    WrapperMeta,
    AgentProfile,
    IntentRecord,
    ChainRegistry,
    WrapResult,
    UnwrapResult,
    IntentResult,
    SettlementResult,
    InitializeConfig,
    RegisterChainConfig,
    CreateWrapperConfig,
    WrapConfig,
    UnwrapConfig,
    SubmitIntentConfig,
    SettleIntentConfig,
} from "./types";
import { deserializeBridgeConfig } from "./utils/serialize";

export class PortalClient {
    readonly connection: Connection;
    readonly programId: PublicKey;
    private instructions: PortalInstructions;

    constructor(config: PortalClientConfig) {
        this.connection = new Connection(config.rpcUrl, config.commitment ?? "confirmed");
        this.programId = config.programId ?? PORTAL_PROGRAM_ID;
        this.instructions = new PortalInstructions(this.programId);
    }

    async getBridgeConfig(): Promise<BridgeConfig | null> {
        const [pda] = deriveBridgeConfigPda(this.programId);
        const accountInfo = await this.connection.getAccountInfo(pda);
        if (!accountInfo) return null;

        const decoded = deserializeBridgeConfig(accountInfo.data as Buffer);
        return {
            ...decoded,
            createdAt: new BN(0),
            updatedAt: new BN(0),
            treasury: PublicKey.default,
            relayer: PublicKey.default,
            bump: 0,
        };
    }

    async getChainRegistry(): Promise<ChainRegistry | null> {
        const [pda] = deriveChainRegistryPda(this.programId);
        const accountInfo = await this.connection.getAccountInfo(pda);
        if (!accountInfo) return null;

        return {
            authority: PublicKey.default,
            chainCount: 0,
            chains: [],
            bump: 0,
        };
    }

    async getWrapperMeta(wrapperMint: PublicKey): Promise<WrapperMeta | null> {
        const [pda] = deriveWrapperMetaPda(wrapperMint, this.programId);
        const accountInfo = await this.connection.getAccountInfo(pda);
        if (!accountInfo) return null;

        return {
            mint: wrapperMint,
            sourceChainId: 0,
            sourceTokenAddress: new Uint8Array(32),
            symbol: "",
            name: "",
            decimals: 0,
            sourceDecimals: 0,
            totalSupply: new BN(0),
            totalMinted: new BN(0),
            totalBurned: new BN(0),
            active: true,
            createdAt: new BN(0),
            updatedAt: new BN(0),
            metadataUri: "",
            bump: 0,
            mintBump: 0,
        };
    }

    async getAgentProfile(owner: PublicKey): Promise<AgentProfile | null> {
        const [pda] = deriveAgentPda(owner, this.programId);
        const accountInfo = await this.connection.getAccountInfo(pda);
        if (!accountInfo) return null;

        return {
            owner,
            alias: "",
            status: "active",
            totalWraps: new BN(0),
