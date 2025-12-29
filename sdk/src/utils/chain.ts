import { SUPPORTED_CHAINS } from "../constants";
import type { SupportedChain } from "../types";

export function chainIdToName(chainId: number): string | undefined {
    const chain = SUPPORTED_CHAINS[chainId];
    return chain?.name;
}

export function chainNameToId(name: string): number | undefined {
    const normalizedName = name.toLowerCase();
    const entry = Object.entries(SUPPORTED_CHAINS).find(
        ([, config]) => config.name.toLowerCase() === normalizedName
    );
    return entry ? parseInt(entry[0], 10) : undefined;
}

export function isChainSupported(chainId: number): boolean {
    return chainId in SUPPORTED_CHAINS;
}

export function getChainConfig(chainId: number): SupportedChain | undefined {
    const chain = SUPPORTED_CHAINS[chainId];
    if (!chain) return undefined;

    return {
        chainId,
        name: chain.name,
        nativeCurrency: chain.nativeCurrency,
        explorerUrl: chain.explorerUrl,
        rpcUrl: "",
        bridgeContract: "",
    };
}

export function getAllSupportedChains(): SupportedChain[] {
    return Object.entries(SUPPORTED_CHAINS).map(([id, config]) => ({
        chainId: parseInt(id, 10),
        name: config.name,
        nativeCurrency: config.nativeCurrency,
        explorerUrl: config.explorerUrl,
        rpcUrl: "",
        bridgeContract: "",
    }));
}

export function encodeAddress(address: string): Uint8Array {
    const bytes = new Uint8Array(32);

    if (address.startsWith("0x")) {
        const hex = address.slice(2).padStart(40, "0");
        const addressBytes = Buffer.from(hex, "hex");
        bytes.set(addressBytes, 32 - addressBytes.length);
    } else {
        const encoder = new TextEncoder();
        const encoded = encoder.encode(address);
        const len = Math.min(encoded.length, 32);
        bytes.set(encoded.slice(0, len), 0);
    }

    return bytes;
}

export function decodeAddress(bytes: Uint8Array, chainId: number): string {
    const isEvmChain = [1, 56, 137, 42161, 8453, 43114, 10].includes(chainId);

    if (isEvmChain) {
        const startIndex = bytes.findIndex((b) => b !== 0);
        if (startIndex === -1) return "0x" + "0".repeat(40);
        const addressBytes = bytes.slice(startIndex);
        return "0x" + Buffer.from(addressBytes).toString("hex").padStart(40, "0");
    }

    const decoder = new TextDecoder();
    const endIndex = bytes.indexOf(0);
    const slice = endIndex === -1 ? bytes : bytes.slice(0, endIndex);
    return decoder.decode(slice);
}

export function formatExplorerUrl(
    chainId: number,
    txHash: string,
    type: "tx" | "address" = "tx"
): string | undefined {
    const chain = SUPPORTED_CHAINS[chainId];
    if (!chain) return undefined;
    return `${chain.explorerUrl}/${type}/${txHash}`;
}

export function validateAddress(address: string, chainId: number): boolean {
    const isEvmChain = [1, 56, 137, 42161, 8453, 43114, 10].includes(chainId);

    if (isEvmChain) {
        return /^0x[0-9a-fA-F]{40}$/.test(address);
    }

    return address.length > 0 && address.length <= 44;
}
