import { PublicKey, Keypair, Connection, Transaction } from "@solana/web3.js";
import BN from "bn.js";

import { PortalClient, PortalInstructions, PORTAL_PROGRAM_ID, SUPPORTED_CHAINS } from "../sdk/src";
import { deriveBridgeConfigPda, deriveChainRegistryPda, deriveWrapperMintPda, deriveAgentPda, deriveIntentPda } from "../sdk/src/utils/pda";
import { encodeAddress, decodeAddress, chainIdToName, chainNameToId, isChainSupported, validateAddress } from "../sdk/src/utils/chain";
import { serializeInitializeParams, serializeWrapParams, serializeUnwrapParams } from "../sdk/src/utils/serialize";

function assert(condition: boolean, message: string) {
    if (!condition) throw new Error(`Assertion failed: ${message}`);
}

async function testPdaDerivation() {
    console.log("  Testing PDA derivation...");

    const [bridgeConfig, bridgeBump] = deriveBridgeConfigPda();
    assert(bridgeConfig instanceof PublicKey, "BridgeConfig PDA should be a PublicKey");
    assert(bridgeBump >= 0 && bridgeBump <= 255, "Bump should be valid");

    const [chainRegistry] = deriveChainRegistryPda();
    assert(chainRegistry instanceof PublicKey, "ChainRegistry PDA should be a PublicKey");
    assert(!chainRegistry.equals(bridgeConfig), "PDAs should be unique");

    const sourceChainId = 1;
    const sourceToken = new Uint8Array(32);
    sourceToken[31] = 1;
    const [wrapperMint] = deriveWrapperMintPda(sourceChainId, sourceToken);
    assert(wrapperMint instanceof PublicKey, "WrapperMint PDA should be a PublicKey");

    const agentKeypair = Keypair.generate();
    const [agentPda] = deriveAgentPda(agentKeypair.publicKey);
    assert(agentPda instanceof PublicKey, "Agent PDA should be a PublicKey");

    const [intentPda] = deriveIntentPda(new BN(0));
    assert(intentPda instanceof PublicKey, "Intent PDA should be a PublicKey");

    const [intentPda2] = deriveIntentPda(new BN(1));
    assert(!intentPda.equals(intentPda2), "Different intent IDs should produce different PDAs");

    console.log("  PDA derivation tests passed.");
}

async function testChainHelpers() {
    console.log("  Testing chain helpers...");

    assert(chainIdToName(1) === "Ethereum", "Chain 1 should be Ethereum");
    assert(chainIdToName(8453) === "Base", "Chain 8453 should be Base");
    assert(chainIdToName(99999) === undefined, "Unknown chain should return undefined");

    assert(chainNameToId("Ethereum") === 1, "Ethereum should map to chain 1");
    assert(chainNameToId("ethereum") === 1, "Case insensitive lookup should work");
    assert(chainNameToId("nonexistent") === undefined, "Unknown name should return undefined");

    assert(isChainSupported(1) === true, "Ethereum should be supported");
    assert(isChainSupported(99999) === false, "Unknown chain should not be supported");

    console.log("  Chain helper tests passed.");
}

async function testAddressEncoding() {
    console.log("  Testing address encoding/decoding...");

    const evmAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18";
    const encoded = encodeAddress(evmAddress);
    assert(encoded.length === 32, "Encoded address should be 32 bytes");

    const decoded = decodeAddress(encoded, 1);
    assert(decoded.startsWith("0x"), "Decoded EVM address should start with 0x");
    assert(decoded.length === 42, "Decoded EVM address should be 42 characters");

    const solanaAddress = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
    const solEncoded = encodeAddress(solanaAddress);
    assert(solEncoded.length === 32, "Solana address encoded should be 32 bytes");

    const emptyBytes = new Uint8Array(32);
    const emptyDecoded = decodeAddress(emptyBytes, 1);
    assert(emptyDecoded === "0x" + "0".repeat(40), "Empty bytes should decode to zero address");

    console.log("  Address encoding tests passed.");
}

async function runAllTests() {
  console.log('\nPortal Labs - Test Suite\n');
  await testPdaDerivation();
  await testChainHelpers();
  console.log('All tests passed.');
}

runAllTests().catch(console.error);
