#!/bin/bash

# Load environment variables from .env file
set -a && source /app/.env && set +a

# Set Default Values for Environment Variables
CHAIN_ID=${CHAIN_ID:-"951214"}
RPC_PORT=${RPC_PORT:-"8545"}
MNEMONIC=${MNEMONIC:-"candy maple cake sugar pudding cream honey rich smooth crumble sweet treat"}

#Build RPC with port
RPC_URL="http://localhost:$RPC_PORT"

# Start Anvil Node
echo "Starting Anvil Node"
anvil  --port $RPC_PORT --mnemonic "$MNEMONIC" --host 0.0.0.0 --chain-id $CHAIN_ID &
PIDS[0]=$!

# Deploy Safe Singleton Factory

# This created a `deployment.json` file in the `/app/prereq/safe-singleton-factory/artifacts/${CHAIN_ID}` directory
SINGLETON_FACTORY="/app/prereq/safe-singleton-factory/artifacts/${CHAIN_ID}"

# ensure the directory is empty to have a fresh deployment
rm -rf $SINGLETON_FACTORY

npm run compile $CHAIN_ID --prefix /app/prereq/safe-singleton-factory
RPC=${RPC_URL} MNEMONIC=${MNEMONIC} npm run submit --prefix /app/prereq/safe-singleton-factory 


# Copy the singleton factory to safe-smart-account directory named `singleton-factory-deployments`
mkdir -p /app/prereq/safe-smart-account/singleton-factory-deployments
cp -r $SINGLETON_FACTORY /app/prereq/safe-smart-account/singleton-factory-deployments
ls /app/prereq/safe-smart-account/singleton-factory-deployments

cat /app/prereq/safe-smart-account/singleton-factory-deployments/${CHAIN_ID}/deployment.json

cd /app/prereq/safe-smart-account/
MNEMONIC=${MNEMONIC} yarn hh clean --network customnetwork
rm -rf deployments/
MNEMONIC=${MNEMONIC} yarn hh deploy --network customnetwork
MNEMONIC=${MNEMONIC} yarn hh deploy-proxy --network customnetwork
MNEMONIC=${MNEMONIC} yarn hh deploy-test-erc20 --network customnetwork

JSON_FILE="additional_deployments.json"
cat $JSON_FILE

# Use jq to extract values from the JSON and export as environment variables
export SAFE_PROXY_FACTORY=$(jq -r '.SafeProxyFactory' "$JSON_FILE")
export SAFE=$(jq -r '.Safe' "$JSON_FILE")
export SAFE_PROXY=$(jq -r '.SafeProxy' "$JSON_FILE")
export ERC20_TOKEN=$(jq -r '.ERC20Token' "$JSON_FILE")

cd /app/ui

REACT_APP_ERC20_ADDRESS=${ERC20_TOKEN} REACT_APP_SAFE_ADDRESS=${SAFE_PROXY} yarn start &

PIDS[1]=$!

trap "kill ${PIDS[*]}" SIGINT
wait