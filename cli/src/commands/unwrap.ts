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
import { encodeAddress, chainIdToName } from "@portal-labs/sdk";

export function unwrapCommand(): Command {
    const cmd = new Command("unwrap");

    cmd
        .description("Unwrap Portal wrapper tokens and initiate cross-chain redemption")
        .requiredOption("--mint <pubkey>", "Wrapper mint public key")
        .requiredOption("--amount <number>", "Amount to unwrap (in base units)")
        .requiredOption("--dest-chain <id>", "Destination chain ID")
        .requiredOption("--dest-address <address>", "Destination address on the target chain")
        .option("--rpc-url <url>", "Solana RPC URL")
        .option("--keypair <path>", "Path to agent keypair file")
        .action(async (options) => {
            try {
                const ctx = getCliContext(options);
                const wrapperMint = parsePublicKey(options.mint);
                const amount = new BN(options.amount);
                const destinationChainId = parseInt(options.destChain, 10);
                const destinationAddress = encodeAddress(options.destAddress);

                const chainName = chainIdToName(destinationChainId) || `Chain ${destinationChainId}`;

                const spinner = createSpinner(`Unwrapping tokens to ${chainName}...`);
                spinner.start();

                const result = await ctx.client.unwrapTokens(ctx.keypair, {
                    wrapperMint,
                    amount,
                    destinationChainId,
                    destinationAddress,
                });

                spinner.stop();

                printHeader("Tokens Unwrapped");
                printKeyValue("Wrapper Mint", shortenAddress(result.wrapperMint.toBase58()));
                printKeyValue("Amount", formatAmount(BigInt(amount.toString())));
                printKeyValue("Destination", `${chainName} (${destinationChainId})`);
                printKeyValue("Destination Address", options.destAddress);
                printKeyValue("Fee", formatAmount(BigInt(result.feeAmount.toString())));
                printKeyValue("Signature", result.signature);
                printSuccess("Tokens unwrapped successfully");
            } catch (error) {
                handleError(error);
            }
        });

    return cmd;
}
