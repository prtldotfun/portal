export { PortalClient } from "./portal";
export { PortalInstructions } from "./instructions";

export type {
    PortalClientConfig,
    BridgeConfig,
    ChainEntry,
    ChainRegistry,
    WrapperMeta,
    IntentRecord,
    AgentProfile,
    IntentStatus,
    AgentStatus,
    SupportedChain,
    WrapResult,
    UnwrapResult,
    IntentResult,
    SettlementResult,
} from "./types";

export {
    PORTAL_PROGRAM_ID,
    BRIDGE_CONFIG_SEED,
    CHAIN_REGISTRY_SEED,
    WRAPPER_MINT_SEED,
    WRAPPER_META_SEED,
    INTENT_SEED,
    AGENT_SEED,
    SUPPORTED_CHAINS,
} from "./constants";

export {
    deriveBridgeConfigPda,
    deriveChainRegistryPda,
    deriveWrapperMintPda,
    deriveWrapperMetaPda,
    deriveIntentPda,
    deriveAgentPda,
} from "./utils/pda";

export {
    chainIdToName,
    chainNameToId,
    isChainSupported,
    getChainConfig,
    encodeAddress,
    decodeAddress,
} from "./utils/chain";

export {
    serializeInitializeParams,
    serializeRegisterChainParams,
    serializeWrapParams,
    serializeUnwrapParams,
    serializeSubmitIntentParams,
    serializeSettleIntentParams,
    serializeRegisterAgentParams,
} from "./utils/serialize";
