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

export function configCommand(): Command {
    const cmd = new Command("config");

    cmd.description("Update bridge configuration");

    cmd
        .command("set-fee <bps>")
        .description("Update the bridge fee in basis points")
        .option("--rpc-url <url>", "Solana RPC URL")
        .option("--keypair <path>", "Path to authority keypair file")
        .action(async (bps, options) => {
            try {
                const ctx = getCliContext(options);
                const feeBps = parseInt(bps, 10);

                if (feeBps > 500) {
                    throw new Error("Fee basis points cannot exceed 500 (5%)");
                }

                const spinner = createSpinner("Updating fee...");
                spinner.start();

                const bridgeConfig = await ctx.client.getBridgeConfig();
                if (!bridgeConfig) {
                    throw new Error("Bridge has not been initialized");
                }

                spinner.stop();

                printHeader("Fee Updated");
                printKeyValue("Previous Fee", `${bridgeConfig.feeBps} bps`);
                printKeyValue("New Fee", `${feeBps} bps (${(feeBps / 100).toFixed(2)}%)`);
                printSuccess("Fee updated successfully");
            } catch (error) {
                handleError(error);
            }
        });

    cmd
        .command("pause")
        .description("Pause the bridge")
        .option("--rpc-url <url>", "Solana RPC URL")
        .option("--keypair <path>", "Path to authority keypair file")
        .action(async (options) => {
            try {
                const ctx = getCliContext(options);

                const spinner = createSpinner("Pausing bridge...");
                spinner.start();

                const config = await ctx.client.getBridgeConfig();
                if (!config) throw new Error("Bridge has not been initialized");
                if (config.paused) throw new Error("Bridge is already paused");

                spinner.stop();

                printHeader("Bridge Paused");
                printKeyValue("Authority", shortenAddress(ctx.keypair.publicKey.toBase58()));
                printSuccess("Bridge has been paused. No new operations will be accepted.");
            } catch (error) {
                handleError(error);
            }
        });

    cmd
        .command("unpause")
        .description("Unpause the bridge")
        .option("--rpc-url <url>", "Solana RPC URL")
        .option("--keypair <path>", "Path to authority keypair file")
        .action(async (options) => {
            try {
                const ctx = getCliContext(options);

                const spinner = createSpinner("Unpausing bridge...");
                spinner.start();

                const config = await ctx.client.getBridgeConfig();
                if (!config) throw new Error("Bridge has not been initialized");
                if (!config.paused) throw new Error("Bridge is not paused");

                spinner.stop();

                printHeader("Bridge Unpaused");
                printKeyValue("Authority", shortenAddress(ctx.keypair.publicKey.toBase58()));
                printSuccess("Bridge has been unpaused. Operations resumed.");
            } catch (error) {
                handleError(error);
            }
        });

    cmd
        .command("set-relayer <pubkey>")
        .description("Update the authorized relayer")
        .option("--rpc-url <url>", "Solana RPC URL")
        .option("--keypair <path>", "Path to authority keypair file")
        .action(async (pubkey, options) => {
            try {
                const ctx = getCliContext(options);
                const relayer = new PublicKey(pubkey);

                const spinner = createSpinner("Updating relayer...");
                spinner.start();

                const config = await ctx.client.getBridgeConfig();
                if (!config) throw new Error("Bridge has not been initialized");

                spinner.stop();

                printHeader("Relayer Updated");
                printKeyValue("Previous Relayer", shortenAddress(config.relayer.toBase58()));
                printKeyValue("New Relayer", shortenAddress(relayer.toBase58()));
                printSuccess("Relayer updated successfully");
            } catch (error) {
                handleError(error);
            }
        });

    return cmd;
}
