import type { HardhatUserConfig, HttpNetworkUserConfig } from "hardhat/types";
import "@nomicfoundation/hardhat-toolbox";

import "./src/tasks"
import dotenv from "dotenv";

dotenv.config();
const { NODE_URL, INFURA_KEY, MNEMONIC, ETHERSCAN_API_KEY, PK,PK2, SOLIDITY_VERSION, SOLIDITY_SETTINGS, CUSTOM_RPC } = process.env;

const DEFAULT_MNEMONIC = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";

const sharedNetworkConfig: HttpNetworkUserConfig = {};
if (PK) {
    sharedNetworkConfig.accounts = [PK];
    if (PK2){
        sharedNetworkConfig.accounts.push(PK2);
    }
} else {
    sharedNetworkConfig.accounts = {
        mnemonic: MNEMONIC || DEFAULT_MNEMONIC,
    };
}


const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks:{
    amoy:{
      ...sharedNetworkConfig,
      url: "https://rpc-amoy.polygon.technology/",
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
  }
};

export default config;
