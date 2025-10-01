import { Command } from "commander";
import BN from "bn.js";
import {
    getCliContext,
    createSpinner,
    printSuccess,
    printHeader,
    printKeyValue,
    handleError,
    parsePublicKey,
    shortenAddress,
    formatAmount,
} from "../utils";
import { encodeAddress } from "@portal-labs/sdk";

export function wrapCommand(): Command {
    const cmd = new Command("wrap");

    cmd
        .description("Wrap tokens from a source chain into Portal wrapper tokens")
        .requiredOption("--mint <pubkey>", "Wrapper mint public key")
        .requiredOption("--agent <pubkey>", "Agent wallet to receive wrapped tokens")
        .requiredOption("--amount <number>", "Amount to wrap (in base units)")
        .requiredOption("--source-tx <hash>", "Source chain transaction hash as proof")
        .option("--rpc-url <url>", "Solana RPC URL")
        .option("--keypair <path>", "Path to relayer keypair file")
        .action(async (options) => {
            try {
                const ctx = getCliContext(options);
                const wrapperMint = parsePublicKey(options.mint);
                const agentOwner = parsePublicKey(options.agent);
                const amount = new BN(options.amount);
                const sourceTxHash = encodeAddress(options.sourceTx);

                const spinner = createSpinner("Wrapping tokens...");
                spinner.start();

                const result = await ctx.client.wrapTokens(ctx.keypair, {
                    wrapperMint,
                    agentOwner,
                    amount,
                    sourceTxHash,
                });

                spinner.stop();

                printHeader("Tokens Wrapped");
                printKeyValue("Wrapper Mint", shortenAddress(result.wrapperMint.toBase58()));
                printKeyValue("Agent", shortenAddress(result.agent.toBase58()));
                printKeyValue("Amount", formatAmount(BigInt(amount.toString())));
                printKeyValue("Signature", result.signature);
                printSuccess("Tokens wrapped successfully");
            } catch (error) {
                handleError(error);
            }
        });

    return cmd;
}
