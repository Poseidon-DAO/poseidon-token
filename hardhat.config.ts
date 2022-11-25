import { config as dotEnvConfig } from "dotenv";
dotEnvConfig();

import { HardhatUserConfig } from "hardhat/types";

import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import "hardhat-abi-exporter";
import "@nomiclabs/hardhat-web3";
import "@nomicfoundation/hardhat-toolbox";

// TODO: reenable solidity-coverage when it works
// import "solidity-coverage";
// const mocha = require("./mocha-config");

const API_URL = process.env.API_URL || "";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const MNEMONIC = process.env.MNEMONIC || ""; 

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  solidity: {
    compilers: [{ version: "0.8.0"}, {version: "0.8.1"}, {version: "0.8.3", settings: {
      optimizer: {
        enabled: true,
        runs: 1,
      },
    }, }],
  },
  abiExporter: {
    path: './abi',
    clear: true,
    flat: true,
    // only: [':ERC721$'],
    spacing: 2
  },
  networks: {
    hardhat: {
      accounts: {
        mnemonic: MNEMONIC,
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 10
      }
    },
    goerli: {
      url: API_URL,
      accounts: [PRIVATE_KEY],
      gasPrice: 50000000000
    },
    mainnet: {
      url: API_URL,
      accounts: [PRIVATE_KEY],
      gasPrice: 50000000000
    },
    localhost: {
      accounts: {
        mnemonic: MNEMONIC,
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 10
      }
    },
    coverage: {
      url: "http://127.0.0.1:8555", // Coverage launches its own ganache-cli client
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
};

export default config;