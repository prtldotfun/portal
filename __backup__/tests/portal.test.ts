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

async function testAddressValidation() {
    console.log("  Testing address validation...");

    assert(validateAddress("0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18", 1) === true, "Valid EVM address should pass");
    assert(validateAddress("0xinvalid", 1) === false, "Invalid EVM address should fail");
    assert(validateAddress("", 1) === false, "Empty address should fail for EVM");
    assert(validateAddress("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", 999) === true, "Non-EVM address should pass basic check");

    console.log("  Address validation tests passed.");
}

async function testSerialization() {
    console.log("  Testing serialization...");

    const treasury = Keypair.generate().publicKey;
    const relayer = Keypair.generate().publicKey;
    const initData = serializeInitializeParams({
        feeBps: 100,
        treasury,
        relayer,
    });
    assert(initData.length === 66, "Initialize params should be 66 bytes (2 + 32 + 32)");
    assert(initData.readUInt16LE(0) === 100, "Fee BPS should be correctly serialized");

    const wrapData = serializeWrapParams({
        amount: new BN(1_000_000),
        sourceTxHash: new Uint8Array(32),
    });
    assert(wrapData.length === 40, "Wrap params should be 40 bytes (8 + 32)");

    const unwrapData = serializeUnwrapParams({
        amount: new BN(500_000),
        destinationChainId: 1,
        destinationAddress: new Uint8Array(32),
    });
    assert(unwrapData.length === 42, "Unwrap params should be 42 bytes (8 + 2 + 32)");

    console.log("  Serialization tests passed.");
}

async function testInstructionBuilder() {
    console.log("  Testing instruction builder...");

    const instructions = new PortalInstructions();
    const authority = Keypair.generate().publicKey;
    const treasury = Keypair.generate().publicKey;
    const relayer = Keypair.generate().publicKey;

    const initIx = instructions.initialize(authority, {
        feeBps: 50,
        treasury,
        relayer,
    });
    assert(initIx.programId.equals(PORTAL_PROGRAM_ID), "Program ID should match");
    assert(initIx.keys.length === 4, "Initialize should have 4 accounts");
    assert(initIx.keys[0].isSigner === true, "Authority should be signer");
    assert(initIx.keys[0].isWritable === true, "Authority should be writable");

    const registerIx = instructions.registerChain(authority, {
        chainId: 1,
        name: "Ethereum",
        confirmationsRequired: 12,
        bridgeContract: new Uint8Array(32),
    });
    assert(registerIx.keys.length === 4, "RegisterChain should have 4 accounts");

    const agentKey = Keypair.generate().publicKey;
    const registerAgentIx = instructions.registerAgent(agentKey, "test-agent");
    assert(registerAgentIx.keys.length === 4, "RegisterAgent should have 4 accounts");
    assert(registerAgentIx.keys[0].pubkey.equals(agentKey), "First key should be agent");

    const settleIx = instructions.settleIntent(relayer, {
        intentId: new BN(0),
        settlementTxHash: new Uint8Array(32),
    });
    assert(settleIx.keys.length === 3, "SettleIntent should have 3 accounts");

    console.log("  Instruction builder tests passed.");
}

async function testSupportedChains() {
    console.log("  Testing supported chains registry...");

    const chains = Object.keys(SUPPORTED_CHAINS);
    assert(chains.length >= 7, "Should have at least 7 supported chains");

    for (const [chainIdStr, config] of Object.entries(SUPPORTED_CHAINS)) {
        assert(config.name.length > 0, `Chain ${chainIdStr} should have a name`);
        assert(config.nativeCurrency.length > 0, `Chain ${chainIdStr} should have a native currency`);
        assert(config.explorerUrl.startsWith("https://"), `Chain ${chainIdStr} explorer URL should use HTTPS`);
    }

    console.log("  Supported chains tests passed.");
}

async function runAllTests() {
    console.log("\nPortal Labs - Test Suite\n");
    console.log("=".repeat(50));

    const tests = [
        { name: "PDA Derivation", fn: testPdaDerivation },
        { name: "Chain Helpers", fn: testChainHelpers },
        { name: "Address Encoding", fn: testAddressEncoding },
        { name: "Address Validation", fn: testAddressValidation },
        { name: "Serialization", fn: testSerialization },
        { name: "Instruction Builder", fn: testInstructionBuilder },
        { name: "Supported Chains", fn: testSupportedChains },
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        try {
            console.log(`\n[RUN] ${test.name}`);
            await test.fn();
            passed++;
            console.log(`[PASS] ${test.name}`);
        } catch (error) {
            failed++;
            console.log(`[FAIL] ${test.name}: ${error}`);
        }
    }

    console.log("\n" + "=".repeat(50));
    console.log(`Results: ${passed} passed, ${failed} failed, ${tests.length} total`);
    console.log("=".repeat(50));

    if (failed > 0) {
        process.exit(1);
    }
}

runAllTests().catch(console.error);
