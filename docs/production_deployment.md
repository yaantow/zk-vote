# Production Deployment Guide (Testnet)

This document outlines the steps to deploy the ZK-Vote Maldives project. For the purpose of academic research and testing, the **Frontend will be deployed live (e.g., via Vercel)** while the **Smart Contracts will be deployed to the Polygon Amoy Testnet**.

## Prerequisites
1. A GitHub account with the project repository pushed.
2. A Vercel account (or any Next.js compatible hosting).
3. A Web3 Wallet (like MetaMask) containing an Ethereum account.
4. **Testnet POL Tokens:** You must fund your wallet with Polygon Amoy testnet tokens from a faucet (e.g., [Polygon Faucet](https://faucet.polygon.technology/)).

---

## Step 1: Deploy Smart Contracts to Polygon Amoy

You must deploy the blockchain backend before the frontend.

1. **Configure Environment:**
   In the `contracts/.env` file, add your wallet's private key. This wallet will be both the deployer and the "Relayer" that pays for voter gas fees later.
   ```env
   DEPLOYER_PRIVATE_KEY=your_wallet_private_key_here
   POLYGON_AMOY_RPC=https://rpc-amoy.polygon.technology
   ```

2. **Deploy the Contracts:**
   Open a terminal in the `contracts` directory and run:
   ```bash
   npm run deploy:amoy
   ```

3. **Save the Output:**
   The terminal will print the deployed contract addresses. Copy the `ZKVoting` address; you will need it for the frontend.

---

## Step 2: Deploy the Frontend (Next.js)

The easiest way to deploy Next.js is via Vercel.

1. **Import Project:**
   Go to your Vercel dashboard and import your GitHub repository.

2. **Configure Build Settings:**
   Ensure the build command is exactly what is in your `package.json` (`npm run build`). This project heavily relies on Webpack for WASM compatibility, so do not override the default Next.js build scripts.

3. **Configure Environment Variables:**
   Before clicking "Deploy", add the following Environment Variables in the Vercel dashboard:

   | Variable | Value | Description |
   |----------|-------|-------------|
   | `NEXT_PUBLIC_POLYGON_AMOY_RPC` | `https://rpc-amoy.polygon.technology` | The public RPC endpoint for Polygon Amoy. |
   | `NEXT_PUBLIC_CHAIN_ID` | `80002` | Polygon Amoy Chain ID. |
   | `NEXT_PUBLIC_CONTRACT_ADDRESS` | `0x...` | The `ZKVoting` address you deployed in Step 1. |
   | `ADMIN_PRIVATE_KEY` | `your_wallet_private_key` | The same private key used to deploy the contracts. **DO NOT add `NEXT_PUBLIC_` to this variable name.** |
   | `ADMIN_PASSWORD` | `your_secure_password` | The password you will use to log into the `/admin` portal. |

4. **Deploy:**
   Click "Deploy". Vercel will build the frontend and provide you with a live URL (e.g., `https://zk-vote-maldives.vercel.app`).

---

## Step 3: Setup the Live Election

Once your frontend is live, the election must be initialized before testers can vote.

1. Navigate to `https://your-deployment-url.vercel.app/admin`.
2. Enter the `ADMIN_PASSWORD` you set in Vercel.
3. Add any voter National IDs to register them and build the Merkle Tree (Optional, but recommended for testing specific IDs).
4. Click **"Configure Election"** and wait for the success message.
5. Click **"Start Election"**.

You can now share the live URL with your testers. They will be able to vote securely, and your backend Relayer wallet will seamlessly pay the gas fees on the Polygon Amoy testnet!
