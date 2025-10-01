import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { PortalClient } from "@portal-labs/sdk";
import chalk from "chalk";
import ora from "ora";
import fs from "fs";
import path from "path";

export interface CliContext {
    client: PortalClient;
    connection: Connection;
    keypair: Keypair;
}

export function loadKeypair(keypairPath: string): Keypair {
    const resolvedPath = keypairPath.startsWith("~")
        ? path.join(process.env.HOME || process.env.USERPROFILE || "", keypairPath.slice(1))
        : path.resolve(keypairPath);

    if (!fs.existsSync(resolvedPath)) {
        throw new Error(`Keypair file not found: ${resolvedPath}`);
    }

    const raw = fs.readFileSync(resolvedPath, "utf-8");
    const secretKey = new Uint8Array(JSON.parse(raw));
    return Keypair.fromSecretKey(secretKey);
}

export function getCliContext(options: {
    rpcUrl?: string;
    keypair?: string;
}): CliContext {
    const rpcUrl = options.rpcUrl || process.env.PORTAL_RPC_URL || "https://api.mainnet-beta.solana.com";
    const keypairPath = options.keypair || process.env.PORTAL_KEYPAIR || "~/.config/solana/id.json";

    const keypair = loadKeypair(keypairPath);
    const client = new PortalClient({ rpcUrl });
    const connection = client.connection;

    return { client, connection, keypair };
}

export function createSpinner(text: string) {
    return ora({ text, color: "cyan" });
}

export function printSuccess(message: string) {
    console.log(chalk.green("  ✓ ") + message);
}

export function printError(message: string) {
    console.log(chalk.red("  ✗ ") + message);
}

export function printInfo(message: string) {
    console.log(chalk.blue("  ℹ ") + message);
}

export function printHeader(title: string) {
    console.log();
    console.log(chalk.bold.cyan(`  ${title}`));
    console.log(chalk.gray("  " + "─".repeat(50)));
}

export function printKeyValue(key: string, value: string) {
    console.log(`  ${chalk.gray(key + ":")} ${value}`);
}

export function shortenAddress(address: string, chars: number = 4): string {
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function formatAmount(amount: bigint | number, decimals: number = 9): string {
    const divisor = BigInt(10 ** decimals);
    const amountBig = BigInt(amount);
    const whole = amountBig / divisor;
    const fractional = amountBig % divisor;
    const fractionalStr = fractional.toString().padStart(decimals, "0").slice(0, 4);
    return `${whole}.${fractionalStr}`;
}

export function formatTimestamp(timestamp: number): string {
    return new Date(timestamp * 1000).toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
}

export function parsePublicKey(input: string): PublicKey {
    try {
        return new PublicKey(input);
    } catch {
        throw new Error(`Invalid public key: ${input}`);
    }
}

export function handleError(error: unknown): never {
    if (error instanceof Error) {
        printError(error.message);
    } else {
        printError(String(error));
    }
    process.exit(1);
}
