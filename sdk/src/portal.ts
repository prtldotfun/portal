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

import { PORTAL_PROGRAM_ID, BASIS_POINTS_DIVISOR } from "./constants";
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
import {
    deserializeBridgeConfig,
    deserializeAgentProfile,
    deserializeWrapperMeta,
    deserializeIntentRecord,
    deserializeChainRegistry,
} from "./utils/serialize";

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
        return deserializeBridgeConfig(accountInfo.data as Buffer);
    }

    async getChainRegistry(): Promise<ChainRegistry | null> {
        const [pda] = deriveChainRegistryPda(this.programId);
        const accountInfo = await this.connection.getAccountInfo(pda);
        if (!accountInfo) return null;
        return deserializeChainRegistry(accountInfo.data as Buffer);
    }

    async getWrapperMeta(wrapperMint: PublicKey): Promise<WrapperMeta | null> {
        const [pda] = deriveWrapperMetaPda(wrapperMint, this.programId);
        const accountInfo = await this.connection.getAccountInfo(pda);
        if (!accountInfo) return null;
        return deserializeWrapperMeta(accountInfo.data as Buffer);
    }

    async getAgentProfile(owner: PublicKey): Promise<AgentProfile | null> {
        const [pda] = deriveAgentPda(owner, this.programId);
        const accountInfo = await this.connection.getAccountInfo(pda);
        if (!accountInfo) return null;
        return deserializeAgentProfile(accountInfo.data as Buffer);
    }

    async getIntentRecord(intentId: BN): Promise<IntentRecord | null> {
        const [pda] = deriveIntentPda(intentId, this.programId);
        const accountInfo = await this.connection.getAccountInfo(pda);
        if (!accountInfo) return null;
        return deserializeIntentRecord(accountInfo.data as Buffer);
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
        const bridgeConfig = await this.getBridgeConfig();
        const feeBps = bridgeConfig?.feeBps ?? 0;
        const feeAmount = config.amount.mul(new BN(feeBps)).div(new BN(BASIS_POINTS_DIVISOR));

        const ix = this.instructions.unwrapTokens(agent.publicKey, config);
        const tx = new Transaction().add(ix);

        const signature = await sendAndConfirmTransaction(this.connection, tx, [
            agent,
        ]);

        return {
            signature,
            wrapperMint: config.wrapperMint,
            amount: config.amount,
            feeAmount,
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
        const feeBps = bridgeConfig?.feeBps ?? 0;
        const feeAmount = config.amount.mul(new BN(feeBps)).div(new BN(BASIS_POINTS_DIVISOR));
        const netAmount = config.amount.sub(feeAmount);

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
            netAmount,
            feeAmount,
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
        try {
            const balance = await this.connection.getTokenAccountBalance(ata);
            return new BN(balance.value.amount);
        } catch {
            return new BN(0);
        }
    }

    async cancelIntent(
        agent: Keypair,
        intentId: BN,
        wrapperMint: PublicKey
    ): Promise<string> {
        const ix = this.instructions.cancelIntent(
            agent.publicKey,
            intentId,
            wrapperMint
        );
        const tx = new Transaction().add(ix);
        return sendAndConfirmTransaction(this.connection, tx, [agent]);
    }

    async getActiveIntents(agent: PublicKey): Promise<IntentRecord[]> {
        const accounts = await this.connection.getProgramAccounts(this.programId, {
            filters: [
                { dataSize: 8 + 210 },
                { memcmp: { offset: 16, bytes: agent.toBase58() } },
            ],
        });

        const intents: IntentRecord[] = [];
        for (const { account } of accounts) {
            const intent = deserializeIntentRecord(account.data as Buffer);
            if (intent.status === "pending") {
                intents.push(intent);
            }
        }
        return intents;
    }
}
