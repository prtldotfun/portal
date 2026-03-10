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
    createdAt: BN;
    updatedAt: BN;
    treasury: PublicKey;
    relayer: PublicKey;
    bump: number;
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
    offset += 1;
    const createdAt = new BN(data.subarray(offset, offset + 8), "le");
    offset += 8;
    const updatedAt = new BN(data.subarray(offset, offset + 8), "le");
    offset += 8;
    const treasury = new PublicKey(data.subarray(offset, offset + 32));
    offset += 32;
    const relayer = new PublicKey(data.subarray(offset, offset + 32));
    offset += 32;
    const bump = data[offset];

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
        createdAt,
        updatedAt,
        treasury,
        relayer,
        bump,
    };
}

function readString(data: Buffer, offset: number): [string, number] {
    const len = data.readUInt32LE(offset);
    offset += 4;
    const str = data.subarray(offset, offset + len).toString("utf-8");
    return [str, offset + len];
}

export function deserializeChainRegistry(data: Buffer): {
    authority: PublicKey;
    chainCount: number;
    chains: Array<{
        chainId: number;
        name: string;
        active: boolean;
        confirmationsRequired: number;
        bridgeContract: Uint8Array;
        registeredAt: BN;
        totalVolume: BN;
    }>;
    bump: number;
} {
    let offset = 8;
    const authority = new PublicKey(data.subarray(offset, offset + 32));
    offset += 32;
    const chainCount = data.readUInt16LE(offset);
    offset += 2;

    const vecLen = data.readUInt32LE(offset);
    offset += 4;

    const chains = [];
    for (let i = 0; i < vecLen; i++) {
        const chainId = data.readUInt16LE(offset);
        offset += 2;
        const [name, newOffset] = readString(data, offset);
        offset = newOffset;
        const active = data[offset] === 1;
        offset += 1;
        const confirmationsRequired = data.readUInt16LE(offset);
        offset += 2;
        const bridgeContract = new Uint8Array(data.subarray(offset, offset + 32));
        offset += 32;
        const registeredAt = new BN(data.subarray(offset, offset + 8), "le");
        offset += 8;
        const totalVolume = new BN(data.subarray(offset, offset + 8), "le");
        offset += 8;

        chains.push({ chainId, name, active, confirmationsRequired, bridgeContract, registeredAt, totalVolume });
    }

    const bump = data[offset] ?? 0;

    return { authority, chainCount, chains, bump };
}

export function deserializeWrapperMeta(data: Buffer): {
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
} {
    let offset = 8;
    const mint = new PublicKey(data.subarray(offset, offset + 32));
    offset += 32;
    const sourceChainId = data.readUInt16LE(offset);
    offset += 2;
    const sourceTokenAddress = new Uint8Array(data.subarray(offset, offset + 32));
    offset += 32;
    const [symbol, off1] = readString(data, offset);
    offset = off1;
    const [name, off2] = readString(data, offset);
    offset = off2;
    const decimals = data[offset];
    offset += 1;
    const sourceDecimals = data[offset];
    offset += 1;
    const totalSupply = new BN(data.subarray(offset, offset + 8), "le");
    offset += 8;
    const totalMinted = new BN(data.subarray(offset, offset + 8), "le");
    offset += 8;
    const totalBurned = new BN(data.subarray(offset, offset + 8), "le");
    offset += 8;
    const active = data[offset] === 1;
    offset += 1;
    const createdAt = new BN(data.subarray(offset, offset + 8), "le");
    offset += 8;
    const updatedAt = new BN(data.subarray(offset, offset + 8), "le");
    offset += 8;
    const [metadataUri, off3] = readString(data, offset);
    offset = off3;
    const bump = data[offset];
    offset += 1;
    const mintBump = data[offset];

    return { mint, sourceChainId, sourceTokenAddress, symbol, name, decimals, sourceDecimals, totalSupply, totalMinted, totalBurned, active, createdAt, updatedAt, metadataUri, bump, mintBump };
}

function decodeIntentStatus(value: number): "pending" | "settled" | "cancelled" | "expired" {
    switch (value) {
        case 0: return "pending";
        case 1: return "settled";
        case 2: return "cancelled";
        case 3: return "expired";
        default: return "pending";
    }
}

export function deserializeIntentRecord(data: Buffer): {
    intentId: BN;
    agent: PublicKey;
    sourceChainId: number;
    destinationChainId: number;
    wrapperMint: PublicKey;
    amount: BN;
    feeAmount: BN;
    netAmount: BN;
    destinationAddress: Uint8Array;
    status: "pending" | "settled" | "cancelled" | "expired";
    createdAt: BN;
    settledAt: BN;
    cancelledAt: BN;
    settlementTxHash: Uint8Array;
    relayer: PublicKey;
    expirySlot: BN;
    bump: number;
} {
    let offset = 8;
    const intentId = new BN(data.subarray(offset, offset + 8), "le");
    offset += 8;
    const agent = new PublicKey(data.subarray(offset, offset + 32));
    offset += 32;
    const sourceChainId = data.readUInt16LE(offset);
    offset += 2;
    const destinationChainId = data.readUInt16LE(offset);
    offset += 2;
    const wrapperMint = new PublicKey(data.subarray(offset, offset + 32));
    offset += 32;
    const amount = new BN(data.subarray(offset, offset + 8), "le");
    offset += 8;
    const feeAmount = new BN(data.subarray(offset, offset + 8), "le");
    offset += 8;
    const netAmount = new BN(data.subarray(offset, offset + 8), "le");
    offset += 8;
    const destinationAddress = new Uint8Array(data.subarray(offset, offset + 32));
    offset += 32;
    const status = decodeIntentStatus(data[offset]);
    offset += 1;
    const createdAt = new BN(data.subarray(offset, offset + 8), "le");
    offset += 8;
    const settledAt = new BN(data.subarray(offset, offset + 8), "le");
    offset += 8;
    const cancelledAt = new BN(data.subarray(offset, offset + 8), "le");
    offset += 8;
    const settlementTxHash = new Uint8Array(data.subarray(offset, offset + 32));
    offset += 32;
    const relayer = new PublicKey(data.subarray(offset, offset + 32));
    offset += 32;
    const expirySlot = new BN(data.subarray(offset, offset + 8), "le");
    offset += 8;
    const bump = data[offset];

    return { intentId, agent, sourceChainId, destinationChainId, wrapperMint, amount, feeAmount, netAmount, destinationAddress, status, createdAt, settledAt, cancelledAt, settlementTxHash, relayer, expirySlot, bump };
}

function decodeAgentStatus(value: number): "active" | "suspended" {
    return value === 0 ? "active" : "suspended";
}

export function deserializeAgentProfile(data: Buffer): {
    owner: PublicKey;
    alias: string;
    status: "active" | "suspended";
    totalWraps: BN;
    totalUnwraps: BN;
    totalIntents: BN;
    totalVolume: BN;
    registeredAt: BN;
    lastActivity: BN;
    bump: number;
} {
    let offset = 8;
    const owner = new PublicKey(data.subarray(offset, offset + 32));
    offset += 32;
    const [alias, newOffset] = readString(data, offset);
    offset = newOffset;
    const status = decodeAgentStatus(data[offset]);
    offset += 1;
    const totalWraps = new BN(data.subarray(offset, offset + 8), "le");
    offset += 8;
    const totalUnwraps = new BN(data.subarray(offset, offset + 8), "le");
    offset += 8;
    const totalIntents = new BN(data.subarray(offset, offset + 8), "le");
    offset += 8;
    const totalVolume = new BN(data.subarray(offset, offset + 8), "le");
    offset += 8;
    const registeredAt = new BN(data.subarray(offset, offset + 8), "le");
    offset += 8;
    const lastActivity = new BN(data.subarray(offset, offset + 8), "le");
    offset += 8;
    const bump = data[offset];

    return { owner, alias, status, totalWraps, totalUnwraps, totalIntents, totalVolume, registeredAt, lastActivity, bump };
}

