import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

function writePublicKey(buffer: Buffer, offset: number, key: PublicKey): number {
    const keyBytes = key.toBuffer();
    keyBytes.copy(buffer, offset);
    return offset + 32;
}

function writeU16LE(buffer: Buffer, offset: number, value: number): number {
    buffer.writeUInt16LE(value, offset);
    return offset + 2;
}

function writeU64LE(buffer: Buffer, offset: number, value: BN): number {
    const bytes = value.toArrayLike(Buffer, "le", 8);
    bytes.copy(buffer, offset);
    return offset + 8;
}

function writeBytes32(buffer: Buffer, offset: number, data: Uint8Array): number {
    Buffer.from(data).copy(buffer, offset, 0, 32);
    return offset + 32;
}

function writeString(buffer: Buffer, offset: number, str: string): number {
    const strBytes = Buffer.from(str, "utf-8");
    buffer.writeUInt32LE(strBytes.length, offset);
    strBytes.copy(buffer, offset + 4);
    return offset + 4 + strBytes.length;
}

export function serializeInitializeParams(params: {
    feeBps: number;
    treasury: PublicKey;
    relayer: PublicKey;
}): Buffer {
    const buffer = Buffer.alloc(2 + 32 + 32);
    let offset = 0;
    offset = writeU16LE(buffer, offset, params.feeBps);
    offset = writePublicKey(buffer, offset, params.treasury);
    writePublicKey(buffer, offset, params.relayer);
    return buffer;
}

export function serializeRegisterChainParams(params: {
    chainId: number;
    name: string;
    confirmationsRequired: number;
    bridgeContract: Uint8Array;
}): Buffer {
    const nameBytes = Buffer.from(params.name, "utf-8");
    const buffer = Buffer.alloc(2 + 4 + nameBytes.length + 2 + 32);
    let offset = 0;
    offset = writeU16LE(buffer, offset, params.chainId);
    offset = writeString(buffer, offset, params.name);
    offset = writeU16LE(buffer, offset, params.confirmationsRequired);
    writeBytes32(buffer, offset, params.bridgeContract);
    return buffer;
}

export function serializeWrapParams(params: {
    amount: BN;
    sourceTxHash: Uint8Array;
}): Buffer {
    const buffer = Buffer.alloc(8 + 32);
    let offset = 0;
    offset = writeU64LE(buffer, offset, params.amount);
    writeBytes32(buffer, offset, params.sourceTxHash);
    return buffer;
}

export function serializeUnwrapParams(params: {
    amount: BN;
    destinationChainId: number;
    destinationAddress: Uint8Array;
}): Buffer {
    const buffer = Buffer.alloc(8 + 2 + 32);
    let offset = 0;
    offset = writeU64LE(buffer, offset, params.amount);
    offset = writeU16LE(buffer, offset, params.destinationChainId);
    writeBytes32(buffer, offset, params.destinationAddress);
    return buffer;
}

export function serializeSubmitIntentParams(params: {
    amount: BN;
    destinationChainId: number;
    destinationAddress: Uint8Array;
}): Buffer {
    const buffer = Buffer.alloc(8 + 2 + 32);
    let offset = 0;
    offset = writeU64LE(buffer, offset, params.amount);
    offset = writeU16LE(buffer, offset, params.destinationChainId);
    writeBytes32(buffer, offset, params.destinationAddress);
    return buffer;
}

export function serializeSettleIntentParams(params: {
    settlementTxHash: Uint8Array;
}): Buffer {
    const buffer = Buffer.alloc(32);
    writeBytes32(buffer, 0, params.settlementTxHash);
    return buffer;
}

export function serializeRegisterAgentParams(params: {
    alias: string;
}): Buffer {
    const aliasBytes = Buffer.from(params.alias, "utf-8");
    const buffer = Buffer.alloc(4 + aliasBytes.length);
    writeString(buffer, 0, params.alias);
    return buffer;
}

export function deserializeBridgeConfig(data: Buffer): {
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
} {
    let offset = 8;
    const authority = new PublicKey(data.subarray(offset, offset + 32));
    offset += 32;
    const feeBps = data.readUInt16LE(offset);
    offset += 2;
    const totalWrapped = new BN(data.subarray(offset, offset + 8), "le");
    offset += 8;
    const totalUnwrapped = new BN(data.subarray(offset, offset + 8), "le");
    offset += 8;
    const totalIntents = new BN(data.subarray(offset, offset + 8), "le");
    offset += 8;
    const activeIntents = new BN(data.subarray(offset, offset + 8), "le");
    offset += 8;
    const registeredChains = data.readUInt16LE(offset);
    offset += 2;
    const registeredWrappers = data.readUInt32LE(offset);
    offset += 4;
    const registeredAgents = data.readUInt32LE(offset);
    offset += 4;
    const paused = data[offset] === 1;

    return {
        authority,
        feeBps,
        totalWrapped,
        totalUnwrapped,
        totalIntents,
        activeIntents,
        registeredChains,
        registeredWrappers,
        registeredAgents,
        paused,
    };
}
