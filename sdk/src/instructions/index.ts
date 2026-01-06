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
        const [bridgeConfig] = deriveBridgeConfigPda(this.programId);
        const [chainRegistry] = deriveChainRegistryPda(this.programId);
        const [wrapperMint] = deriveWrapperMintPda(
            config.sourceChainId,
            config.sourceTokenAddress,
            this.programId
        );
        const [wrapperMeta] = deriveWrapperMetaPda(wrapperMint, this.programId);

        const nameBytes = Buffer.from(config.name, "utf-8");
        const symbolBytes = Buffer.from(config.symbol, "utf-8");
        const uriBytes = Buffer.from(config.metadataUri, "utf-8");

        const bufferSize =
            8 + 2 + 32 + 4 + symbolBytes.length + 4 + nameBytes.length + 1 + 1 + 4 + uriBytes.length;
        const data = Buffer.alloc(bufferSize);
        let offset = 0;

        const disc = encodeInstructionDiscriminator("create_wrapper");
        disc.copy(data, offset);
        offset += 8;

        data.writeUInt16LE(config.sourceChainId, offset);
        offset += 2;
        Buffer.from(config.sourceTokenAddress).copy(data, offset);
        offset += 32;
        data.writeUInt32LE(symbolBytes.length, offset);
        offset += 4;
        symbolBytes.copy(data, offset);
        offset += symbolBytes.length;
        data.writeUInt32LE(nameBytes.length, offset);
        offset += 4;
        nameBytes.copy(data, offset);
        offset += nameBytes.length;
        data.writeUInt8(config.decimals, offset);
        offset += 1;
        data.writeUInt8(config.sourceDecimals, offset);
        offset += 1;
        data.writeUInt32LE(uriBytes.length, offset);
        offset += 4;
        uriBytes.copy(data, offset);

        return new TransactionInstruction({
            keys: [
                { pubkey: authority, isSigner: true, isWritable: true },
                { pubkey: bridgeConfig, isSigner: false, isWritable: true },
                { pubkey: chainRegistry, isSigner: false, isWritable: false },
                { pubkey: wrapperMint, isSigner: false, isWritable: true },
                { pubkey: wrapperMeta, isSigner: false, isWritable: true },
                { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
            ],
            programId: this.programId,
            data,
        });
    }

    wrapTokens(
        relayer: PublicKey,
        agentOwner: PublicKey,
        config: WrapConfig
    ): TransactionInstruction {
        const [bridgeConfig] = deriveBridgeConfigPda(this.programId);
        const [chainRegistry] = deriveChainRegistryPda(this.programId);
        const [wrapperMeta] = deriveWrapperMetaPda(
            config.wrapperMint,
            this.programId
        );
        const [agentProfile] = deriveAgentPda(agentOwner, this.programId);

        const data = Buffer.concat([
            encodeInstructionDiscriminator("wrap_tokens"),
            serializeWrapParams({
                amount: config.amount,
                sourceTxHash: config.sourceTxHash,
            }),
        ]);

        return new TransactionInstruction({
