import { Command } from "commander";
import BN from "bn.js";
import chalk from "chalk";
import {
    getCliContext,
    createSpinner,
    printHeader,
    printKeyValue,
    printInfo,
    handleError,
    parsePublicKey,
    shortenAddress,
    formatAmount,
    formatTimestamp,
} from "../utils";
import { chainIdToName } from "@portal-labs/sdk";

export function statusCommand(): Command {
    const cmd = new Command("status");

    cmd.description("View bridge and intent status");

    cmd
        .command("bridge")
        .description("Show bridge configuration and global stats")
        .option("--rpc-url <url>", "Solana RPC URL")
        .option("--keypair <path>", "Path to keypair file")
        .action(async (options) => {
            try {
                const ctx = getCliContext(options);

                const spinner = createSpinner("Fetching bridge status...");
                spinner.start();

                const config = await ctx.client.getBridgeConfig();
                spinner.stop();

                if (!config) {
                    printInfo("Bridge has not been initialized yet.");
                    return;
                }

                printHeader("Portal Bridge Status");
                printKeyValue("Authority", shortenAddress(config.authority.toBase58()));
                printKeyValue("Fee", `${config.feeBps} bps (${(config.feeBps / 100).toFixed(2)}%)`);
                printKeyValue("Paused", config.paused ? chalk.red("Yes") : chalk.green("No"));
                printKeyValue("Registered Chains", config.registeredChains.toString());
                printKeyValue("Registered Wrappers", config.registeredWrappers.toString());
                printKeyValue("Registered Agents", config.registeredAgents.toString());
                printKeyValue("Total Wrapped", formatAmount(BigInt(config.totalWrapped.toString())));
                printKeyValue("Total Unwrapped", formatAmount(BigInt(config.totalUnwrapped.toString())));
                printKeyValue("Total Intents", config.totalIntents.toString());
                printKeyValue("Active Intents", config.activeIntents.toString());
            } catch (error) {
                handleError(error);
            }
        });

    cmd
        .command("intent <intentId>")
        .description("Show details for a specific intent")
        .option("--rpc-url <url>", "Solana RPC URL")
        .option("--keypair <path>", "Path to keypair file")
        .action(async (intentIdStr, options) => {
            try {
                const ctx = getCliContext(options);
                const intentId = new BN(intentIdStr);

                const spinner = createSpinner("Fetching intent...");
                spinner.start();

                const intent = await ctx.client.getIntentRecord(intentId);
                spinner.stop();

                if (!intent) {
                    printInfo(`Intent #${intentIdStr} not found.`);
                    return;
                }

                const srcChain = chainIdToName(intent.sourceChainId) || `Chain ${intent.sourceChainId}`;
                const dstChain = chainIdToName(intent.destinationChainId) || `Chain ${intent.destinationChainId}`;

                printHeader(`Intent #${intentIdStr}`);
                printKeyValue("Agent", shortenAddress(intent.agent.toBase58()));
                printKeyValue("Status", formatIntentStatus(intent.status));
                printKeyValue("Source Chain", srcChain);
                printKeyValue("Destination Chain", dstChain);
                printKeyValue("Amount", formatAmount(BigInt(intent.amount.toString())));
                printKeyValue("Net Amount", formatAmount(BigInt(intent.netAmount.toString())));
                printKeyValue("Fee", formatAmount(BigInt(intent.feeAmount.toString())));
                printKeyValue("Wrapper Mint", shortenAddress(intent.wrapperMint.toBase58()));
            } catch (error) {
                handleError(error);
            }
        });

    cmd
        .command("agent [address]")
        .description("Show agent profile and stats")
        .option("--rpc-url <url>", "Solana RPC URL")
        .option("--keypair <path>", "Path to keypair file")
        .action(async (address, options) => {
            try {
                const ctx = getCliContext(options);
                const agentKey = address
                    ? parsePublicKey(address)
                    : ctx.keypair.publicKey;

                const spinner = createSpinner("Fetching agent profile...");
                spinner.start();

                const profile = await ctx.client.getAgentProfile(agentKey);
                spinner.stop();

                if (!profile) {
                    printInfo("Agent not registered. Use `portal register` to create a profile.");
                    return;
                }

                printHeader(`Agent: ${profile.alias || "Anonymous"}`);
                printKeyValue("Owner", shortenAddress(profile.owner.toBase58()));
                printKeyValue("Status", profile.status === "active" ? chalk.green("Active") : chalk.red("Suspended"));
                printKeyValue("Total Wraps", profile.totalWraps.toString());
                printKeyValue("Total Unwraps", profile.totalUnwraps.toString());
                printKeyValue("Total Intents", profile.totalIntents.toString());
                printKeyValue("Total Volume", formatAmount(BigInt(profile.totalVolume.toString())));
            } catch (error) {
                handleError(error);
            }
        });

    return cmd;
}

function formatIntentStatus(status: string): string {
    switch (status) {
        case "pending":
            return chalk.yellow("Pending");
        case "settled":
            return chalk.green("Settled");
        case "cancelled":
            return chalk.red("Cancelled");
        case "expired":
            return chalk.gray("Expired");
        default:
            return status;
    }
}
