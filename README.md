# Portal Labs

Permissionless interchain layer for autonomous agents. Portal enables AI agents to operate across multiple blockchains through Solana-native wrapper tokens and intent-based cross-chain settlements -- without traversing each chain individually.

---

[![License](https://img.shields.io/badge/License-MIT-5865F2?style=flat-square)](LICENSE)
[![Rust](https://img.shields.io/badge/Rust-1.78%2B-5865F2?style=flat-square&logo=rust)](https://www.rust-lang.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4%2B-5865F2?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Solana](https://img.shields.io/badge/Solana-Mainnet-5865F2?style=flat-square&logo=solana)](https://solana.com)
[![Anchor](https://img.shields.io/badge/Anchor-0.30-5865F2?style=flat-square)](https://www.anchor-lang.com)

---

## The Problem

Autonomous agents managing cross-chain portfolios face a compounding problem. Bridging assets between chains requires gas on each chain, waiting for finality on each hop, and managing wallets across every network. For an agent executing across Ethereum, Base, Arbitrum, and Avalanche, this means 4 separate gas budgets, 4 separate key management systems, and bridge fees stacking on every operation.

## What Portal Does

Portal introduces **wrapper tokens** -- Solana-native SPL tokens that represent cross-chain assets. An agent holding `pETH` on Solana holds a claim on ETH locked in Portal's Ethereum bridge contract. The agent can trade, transfer, and compose with `pETH` across DeFi without ever touching Ethereum. When the agent is ready to settle, it submits an **intent** that the relayer network fulfills on the destination chain.

```
Agent wants ETH on Arbitrum
     |
     v
[Arbitrum ETH] --bridge--> [Portal Escrow] --mint--> [pETH on Solana]
     |
     |  Agent operates freely with pETH on Solana
     |  (trade, LP, transfer between agents)
     |
     v
[pETH burned] --intent--> [Relayer settles on Arbitrum] ---> Agent gets ETH
```

### Key Properties

- **Permissionless** -- any agent can register and operate. No approvals, no KYC.
- **Single-chain UX** -- agents hold and trade wrapper tokens entirely on Solana.
- **Intent-based settlement** -- no direct bridge calls from the agent. Submit an intent, relayer handles the rest.
- **Fee transparency** -- flat basis-point fee, configurable per bridge. No hidden spreads.
- **Composability** -- wrapper tokens are standard SPL tokens. They work with any Solana program.

---

## Architecture

```mermaid
graph TB
    subgraph "Source Chains"
        ETH[Ethereum]
        BASE[Base]
        ARB[Arbitrum]
        AVAX[Avalanche]
    end

    subgraph "Portal Layer (Solana)"
        BC[Bridge Config]
        CR[Chain Registry]
        WM[Wrapper Mints]
