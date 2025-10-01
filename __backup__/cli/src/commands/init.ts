import { Command } from "commander";
import { PublicKey } from "@solana/web3.js";
import {
    getCliContext,
    createSpinner,
    printSuccess,
    printHeader,
    printKeyValue,
    handleError,
    shortenAddress,
} from "../utils";

export function initCommand(): Command {
    const cmd = new Command("init");

    cmd
        .description("Initialize the Portal bridge on-chain")
        .requiredOption("--fee-bps <number>", "Fee in basis points (max 500)")
        .requiredOption("--treasury <pubkey>", "Treasury public key for fee collection")
        .requiredOption("--relayer <pubkey>", "Relayer public key for settlement operations")
        .option("--rpc-url <url>", "Solana RPC URL")
        .option("--keypair <path>", "Path to keypair file")
        .action(async (options) => {
            try {
                const ctx = getCliContext(options);
                const feeBps = parseInt(options.feeBps, 10);
                const treasury = new PublicKey(options.treasury);
                const relayer = new PublicKey(options.relayer);

                if (feeBps > 500) {
                    throw new Error("Fee basis points cannot exceed 500 (5%)");
                }

                const spinner = createSpinner("Initializing Portal bridge...");
                spinner.start();

                const signature = await ctx.client.initialize(ctx.keypair, {
                    feeBps,
                    treasury,
                    relayer,
                });

                spinner.stop();

                printHeader("Portal Bridge Initialized");
                printKeyValue("Authority", shortenAddress(ctx.keypair.publicKey.toBase58()));
                printKeyValue("Fee", `${feeBps} bps (${(feeBps / 100).toFixed(2)}%)`);
                printKeyValue("Treasury", shortenAddress(treasury.toBase58()));
                printKeyValue("Relayer", shortenAddress(relayer.toBase58()));
                printKeyValue("Signature", signature);
                printSuccess("Bridge initialized successfully");
            } catch (error) {
                handleError(error);
            }
        });

    return cmd;
}
