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
            totalUnwraps: new BN(0),
            totalIntents: new BN(0),
            totalVolume: new BN(0),
            registeredAt: new BN(0),
            lastActivity: new BN(0),
            bump: 0,
        };
    }

    async getIntentRecord(intentId: BN): Promise<IntentRecord | null> {
        const [pda] = deriveIntentPda(intentId, this.programId);
        const accountInfo = await this.connection.getAccountInfo(pda);
        if (!accountInfo) return null;

        return {
            intentId,
            agent: PublicKey.default,
            sourceChainId: 0,
            destinationChainId: 0,
            wrapperMint: PublicKey.default,
            amount: new BN(0),
            feeAmount: new BN(0),
            netAmount: new BN(0),
            destinationAddress: new Uint8Array(32),
            status: "pending",
            createdAt: new BN(0),
            settledAt: new BN(0),
            settlementTxHash: new Uint8Array(32),
            relayer: PublicKey.default,
            expirySlot: new BN(0),
            bump: 0,
        };
    }

    async initialize(
        authority: Keypair,
        config: InitializeConfig
    ): Promise<string> {
        const ix = this.instructions.initialize(authority.publicKey, config);
        const tx = new Transaction().add(ix);
        return sendAndConfirmTransaction(this.connection, tx, [authority]);
    }

    async registerChain(
        authority: Keypair,
        config: RegisterChainConfig
    ): Promise<string> {
        const ix = this.instructions.registerChain(authority.publicKey, config);
        const tx = new Transaction().add(ix);
        return sendAndConfirmTransaction(this.connection, tx, [authority]);
    }

    async createWrapper(
        authority: Keypair,
        config: CreateWrapperConfig
    ): Promise<PublicKey> {
        const ix = this.instructions.createWrapper(authority.publicKey, config);
        const tx = new Transaction().add(ix);
        await sendAndConfirmTransaction(this.connection, tx, [authority]);

        const [wrapperMint] = deriveWrapperMintPda(
            config.sourceChainId,
            config.sourceTokenAddress,
            this.programId
        );
        return wrapperMint;
    }

    async wrapTokens(relayer: Keypair, config: WrapConfig): Promise<WrapResult> {
        const agentAta = await getAssociatedTokenAddress(
            config.wrapperMint,
            config.agentOwner
        );

        const ataInfo = await this.connection.getAccountInfo(agentAta);
        const tx = new Transaction();

        if (!ataInfo) {
            tx.add(
                createAssociatedTokenAccountInstruction(
                    relayer.publicKey,
                    agentAta,
                    config.agentOwner,
                    config.wrapperMint
                )
            );
        }

        const ix = this.instructions.wrapTokens(
            relayer.publicKey,
            config.agentOwner,
            config
        );
        tx.add(ix);

        const signature = await sendAndConfirmTransaction(this.connection, tx, [
            relayer,
        ]);

        return {
            signature,
            wrapperMint: config.wrapperMint,
            amount: config.amount,
            adjustedAmount: config.amount,
            agent: config.agentOwner,
        };
    }

    async unwrapTokens(
        agent: Keypair,
        config: UnwrapConfig
    ): Promise<UnwrapResult> {
        const ix = this.instructions.unwrapTokens(agent.publicKey, config);
        const tx = new Transaction().add(ix);

        const signature = await sendAndConfirmTransaction(this.connection, tx, [
            agent,
        ]);

        return {
            signature,
            wrapperMint: config.wrapperMint,
            amount: config.amount,
            feeAmount: new BN(0),
            destinationChainId: config.destinationChainId,
            destinationAddress: config.destinationAddress,
        };
    }

    async submitIntent(
        agent: Keypair,
        config: SubmitIntentConfig
    ): Promise<IntentResult> {
        const bridgeConfig = await this.getBridgeConfig();
        const intentId = bridgeConfig?.totalIntents ?? new BN(0);

        const ix = this.instructions.submitIntent(
            agent.publicKey,
            config,
            intentId
        );
        const tx = new Transaction().add(ix);

        const signature = await sendAndConfirmTransaction(this.connection, tx, [
            agent,
        ]);

        return {
            signature,
            intentId,
            wrapperMint: config.wrapperMint,
            amount: config.amount,
            netAmount: config.amount,
            feeAmount: new BN(0),
            destinationChainId: config.destinationChainId,
            destinationAddress: config.destinationAddress,
            expirySlot: new BN(0),
        };
    }

    async settleIntent(
        relayer: Keypair,
        config: SettleIntentConfig
    ): Promise<SettlementResult> {
        const ix = this.instructions.settleIntent(relayer.publicKey, config);
        const tx = new Transaction().add(ix);

        const signature = await sendAndConfirmTransaction(this.connection, tx, [
            relayer,
        ]);

        return {
            signature,
            intentId: config.intentId,
            settlementTxHash: config.settlementTxHash,
            relayer: relayer.publicKey,
        };
    }

    async registerAgent(agent: Keypair, alias: string): Promise<string> {
        const ix = this.instructions.registerAgent(agent.publicKey, alias);
        const tx = new Transaction().add(ix);
        return sendAndConfirmTransaction(this.connection, tx, [agent]);
    }

    async updateAgent(agent: Keypair, alias: string): Promise<string> {
        const ix = this.instructions.updateAgent(agent.publicKey, alias);
        const tx = new Transaction().add(ix);
        return sendAndConfirmTransaction(this.connection, tx, [agent]);
    }

    async getAgentTokenBalance(
        agentOwner: PublicKey,
        wrapperMint: PublicKey
    ): Promise<BN> {
        const ata = await getAssociatedTokenAddress(wrapperMint, agentOwner);
        const accountInfo = await this.connection.getAccountInfo(ata);
        if (!accountInfo) return new BN(0);

        const balance = await this.connection.getTokenAccountBalance(ata);
        return new BN(balance.value.amount);
    }

    async getActiveIntents(agent: PublicKey): Promise<IntentRecord[]> {
        const intents: IntentRecord[] = [];
        const config = await this.getBridgeConfig();
        if (!config) return intents;

        const totalIntents = config.totalIntents.toNumber();
        for (let i = 0; i < totalIntents; i++) {
            const intent = await this.getIntentRecord(new BN(i));
            if (intent && intent.agent.equals(agent) && intent.status === "pending") {
                intents.push(intent);
            }
        }

        return intents;
    }
}
