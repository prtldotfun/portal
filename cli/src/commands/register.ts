import { Command } from "commander";
import {
    getCliContext,
    createSpinner,
    printSuccess,
    printHeader,
    printKeyValue,
    handleError,
    shortenAddress,
} from "../utils";

export function registerCommand(): Command {
    const cmd = new Command("register");

    cmd
        .description("Register as an agent on the Portal bridge")
        .requiredOption("--alias <name>", "Agent alias (max 32 characters)")
        .option("--rpc-url <url>", "Solana RPC URL")
        .option("--keypair <path>", "Path to agent keypair file")
        .action(async (options) => {
            try {
                const ctx = getCliContext(options);
                const alias = options.alias;

                if (alias.length > 32) {
                    throw new Error("Agent alias cannot exceed 32 characters");
                }

                const existing = await ctx.client.getAgentProfile(ctx.keypair.publicKey);
                if (existing) {
                    throw new Error("Agent is already registered. Use `portal config update-agent` to modify.");
                }

                const spinner = createSpinner("Registering agent...");
                spinner.start();

                const signature = await ctx.client.registerAgent(ctx.keypair, alias);

                spinner.stop();

                printHeader("Agent Registered");
                printKeyValue("Alias", alias);
                printKeyValue("Owner", shortenAddress(ctx.keypair.publicKey.toBase58()));
                printKeyValue("Signature", signature);
                printSuccess("Agent registered. You can now wrap, unwrap, and bridge tokens.");
            } catch (error) {
                handleError(error);
            }
        });

    return cmd;
}
