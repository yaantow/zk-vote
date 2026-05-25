# Wallet & Gas Handling (The Relayer Architecture)

One of the biggest hurdles to mainstream Web3 adoption—especially in public sector applications like national voting—is the requirement for users to install browser extension wallets (like MetaMask) and acquire cryptocurrency to pay for "gas" fees. 

To create a frictionless, modern User Experience (UX), **ZK-Vote Maldives utilizes a backend Relayer Architecture.**

## The Problem with Traditional dApps
In a standard decentralized application (dApp):
1. The user generates a Zero-Knowledge Proof (ZKP) in their browser.
2. The user is prompted by MetaMask to sign a transaction and submit the proof to the blockchain.
3. The user must pay a gas fee (in ETH or POL) to execute the smart contract.

This is unacceptable for a voting system where citizens cannot be expected to manage cryptographic keys or purchase cryptocurrency.

## The Relayer Solution
We eliminate the need for voter wallets entirely by routing all blockchain writes through our own server. 

### 1. The Voter Flow (Client-Side)
- The voter visits the website on any device (mobile or desktop).
- The voter inputs their National ID and Secret Pin.
- The browser uses WebAssembly (ZoKrates) to generate a cryptographic Zero-Knowledge Proof locally on the device. **The ID and Pin never leave the device.**
- Instead of connecting to a wallet, the frontend simply makes a standard `POST` HTTP request to our backend API (`/api/vote`), sending only the anonymous mathematical proof.

### 2. The Relayer Execution (Server-Side)
- The Next.js backend receives the anonymous proof.
- The server environment securely holds the `ADMIN_PRIVATE_KEY`. This is an Ethereum wallet controlled by the electoral system, funded with testnet POL tokens.
- The backend utilizes the `ethers.js` library to construct a blockchain transaction. It signs the transaction using the `ADMIN_PRIVATE_KEY` and submits it to the Polygon Amoy testnet.
- **The server pays the gas fee on behalf of the voter.**
- The server responds to the frontend with the successful Transaction Hash.

## Security & Anonymity Guarantees
Because the server only receives the generated Zero-Knowledge Proof, the server **has no idea who the voter is** or **who they voted for**. The relayer cannot tamper with the vote, because the mathematical proof strictly binds the vote choice to the anonymous Merkle Tree commitment. The server acts purely as a dumb pipe that pays for postage.

## Admin Authentication
Similarly, electoral administrators do not need MetaMask. The admin portal (`/admin`) is protected by a traditional `ADMIN_PASSWORD` (stored in `.env.local`). 

When the admin configures, starts, or ends an election, the frontend sends the password and the command to the backend API (`/api/admin/*`). The server verifies the password, and then uses the same `ADMIN_PRIVATE_KEY` to sign and execute the administrative smart contract functions.

## Testnet Gas Maintenance
Because the server pays for all transactions, the `ADMIN_PRIVATE_KEY` wallet must maintain a balance. For this testnet deployment, the administrator must periodically request free POL tokens from the [Polygon Amoy Faucet](https://faucet.polygon.technology/) to ensure the relayer wallet does not run out of gas during testing.
