import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

import {
    PORTAL_PROGRAM_ID,
    BRIDGE_CONFIG_SEED,
    CHAIN_REGISTRY_SEED,
    WRAPPER_MINT_SEED,
    WRAPPER_META_SEED,
    INTENT_SEED,
    AGENT_SEED,
} from "../constants";

export function deriveBridgeConfigPda(
    programId: PublicKey = PORTAL_PROGRAM_ID
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync([BRIDGE_CONFIG_SEED], programId);
}

export function deriveChainRegistryPda(
    programId: PublicKey = PORTAL_PROGRAM_ID
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync([CHAIN_REGISTRY_SEED], programId);
}

export function deriveWrapperMintPda(
    sourceChainId: number,
    sourceTokenAddress: Uint8Array,
    programId: PublicKey = PORTAL_PROGRAM_ID
): [PublicKey, number] {
    const chainIdBuffer = Buffer.alloc(2);
    chainIdBuffer.writeUInt16LE(sourceChainId);

    return PublicKey.findProgramAddressSync(
        [WRAPPER_MINT_SEED, chainIdBuffer, Buffer.from(sourceTokenAddress)],
        programId
    );
}

export function deriveWrapperMetaPda(
    wrapperMint: PublicKey,
    programId: PublicKey = PORTAL_PROGRAM_ID
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [WRAPPER_META_SEED, wrapperMint.toBuffer()],
        programId
    );
}

export function deriveIntentPda(
    intentId: BN,
    programId: PublicKey = PORTAL_PROGRAM_ID
): [PublicKey, number] {
    const idBuffer = intentId.toArrayLike(Buffer, "le", 8);
    return PublicKey.findProgramAddressSync([INTENT_SEED, idBuffer], programId);
}

export function deriveAgentPda(
    agentOwner: PublicKey,
    programId: PublicKey = PORTAL_PROGRAM_ID
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [AGENT_SEED, agentOwner.toBuffer()],
        programId
    );
}

export function deriveAllPdas(
    programId: PublicKey = PORTAL_PROGRAM_ID
): {
    bridgeConfig: PublicKey;
    chainRegistry: PublicKey;
} {
    const [bridgeConfig] = deriveBridgeConfigPda(programId);
    const [chainRegistry] = deriveChainRegistryPda(programId);

    return { bridgeConfig, chainRegistry };
}
