# Multi-Chain Energy Trading Infrastructure 

This README provides a guide to setting up the necessary infrastructure for an energy trading platform utilizing both the Ethereum and Algorand blockchains. 

## Prerequisites

Before beginning, ensure you have the following installed:
- Node.js
- npm (Node Package Manager)
- Hardhat

## Setting Up the Ethereum Node

### Step 1: Start a Local Ethereum Node (Only once) ~ in Ethereum folder
```bash
# Start a local Ethereum node using Hardhat
npx hardhat node
```

### Step 2: Re-deploy new ETH smart contract (Only once) ~ in Ethereum folder
```bash
# Incomplete command might work, but may cause unexpected behaviour!
npx hardhat run scripts/deployExchange.ts --network localhost
```

### Step 3: Re-deploy new ALGO smart contract (Only once) ~ in Algorand folder
```bash
python3 playground/exchange/exchange_deploy.py
```

### Step 4: Run main script ~ in main folder
```bash
ts-node index.ts
```
