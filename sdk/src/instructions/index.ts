import {
    PublicKey,
    SystemProgram,
    SYSVAR_RENT_PUBKEY,
    TransactionInstruction,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import BN from "bn.js";

import {
    PORTAL_PROGRAM_ID,
    BRIDGE_CONFIG_SEED,
    CHAIN_REGISTRY_SEED,
    WRAPPER_MINT_SEED,
    WRAPPER_META_SEED,
    INTENT_SEED,
    AGENT_SEED,
} from "./constants";
import {
    deriveBridgeConfigPda,
    deriveChainRegistryPda,
    deriveWrapperMintPda,
    deriveWrapperMetaPda,
    deriveIntentPda,
    deriveAgentPda,
} from "./utils/pda";
import {
    serializeInitializeParams,
    serializeRegisterChainParams,
    serializeWrapParams,
    serializeUnwrapParams,
    serializeSubmitIntentParams,
    serializeSettleIntentParams,
    serializeRegisterAgentParams,
} from "./utils/serialize";
import type {
    InitializeConfig,
    RegisterChainConfig,
    CreateWrapperConfig,
    WrapConfig,
    UnwrapConfig,
    SubmitIntentConfig,
    SettleIntentConfig,
} from "./types";

function encodeInstructionDiscriminator(name: string): Buffer {
    const crypto = require("crypto");
    const hash = crypto.createHash("sha256");
    hash.update(`global:${name}`);
    return Buffer.from(hash.digest().subarray(0, 8));
}

export class PortalInstructions {
    readonly programId: PublicKey;

    constructor(programId: PublicKey = PORTAL_PROGRAM_ID) {
        this.programId = programId;
    }

    initialize(
        authority: PublicKey,
        config: InitializeConfig
    ): TransactionInstruction {
        const [bridgeConfig] = deriveBridgeConfigPda(this.programId);
        const [chainRegistry] = deriveChainRegistryPda(this.programId);

        const data = Buffer.concat([
            encodeInstructionDiscriminator("initialize"),
            serializeInitializeParams({
                feeBps: config.feeBps,
                treasury: config.treasury,
                relayer: config.relayer,
            }),
        ]);

        return new TransactionInstruction({
            keys: [
                { pubkey: authority, isSigner: true, isWritable: true },
                { pubkey: bridgeConfig, isSigner: false, isWritable: true },
                { pubkey: chainRegistry, isSigner: false, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            programId: this.programId,
            data,
        });
    }

    registerChain(
        authority: PublicKey,
        config: RegisterChainConfig
    ): TransactionInstruction {
        const [bridgeConfig] = deriveBridgeConfigPda(this.programId);
        const [chainRegistry] = deriveChainRegistryPda(this.programId);

        const data = Buffer.concat([
            encodeInstructionDiscriminator("register_chain"),
            serializeRegisterChainParams({
                chainId: config.chainId,
                name: config.name,
                confirmationsRequired: config.confirmationsRequired,
                bridgeContract: config.bridgeContract,
            }),
        ]);

        return new TransactionInstruction({
            keys: [
                { pubkey: authority, isSigner: true, isWritable: true },
                { pubkey: bridgeConfig, isSigner: false, isWritable: true },
                { pubkey: chainRegistry, isSigner: false, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            programId: this.programId,
            data,
        });
    }

    createWrapper(
        authority: PublicKey,
        config: CreateWrapperConfig
    ): TransactionInstruction {
