#!/bin/bash

# Load environment variables from .env file
set -a && source /app/.env && set +a

# Set Default Values for Environment Variables
CHAIN_ID=${CHAIN_ID:-"951214"}
RPC_PORT=${RPC_PORT:-"8545"}
MNEMONIC=${MNEMONIC:-"candy maple cake sugar pudding cream honey rich smooth crumble sweet treat"}

# Start Anvil Node
echo "Starting Anvil Node"
anvil  --port $RPC_PORT --mnemonic "$MNEMONIC" --host 0.0.0.0 --chain-id $CHAIN_ID &
PIDS[0]=$!

trap "kill ${PIDS[*]}" SIGINT

wait