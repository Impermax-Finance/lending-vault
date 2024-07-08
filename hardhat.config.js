require("@nomicfoundation/hardhat-toolbox");

const config = require('./config.json')

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  defaultNetwork: "localhost",
  mocha: {
    timeout: 100000000
  },
  networks: {
    localhost: {
      timeout: 100_000
    },
    hardhat: {
      forking: {
        // url: "https://rpc.blast.io"
        // url: "https://rpc.ankr.com/mantle"
        url: "https://scroll.blockpi.network/v1/rpc/public"
        // url: "https://mainnet.base.org",
        // url: "https://rpc.ankr.com/eth"
      },
      chainId: 31337
    },
    blast: {
      url: "https://rpc.blast.io",
      accounts: [config.blast_key]
    },
    mantle: {
      url: "https://rpc.ankr.com/mantle",
      accounts: [config.mantle_key]
    },
    ethereum: {
      url: "https://rpc.ankr.com/eth",
      accounts: [config.ethereum_key]
    },
    bob: {
      url: "https://rpc.gobob.xyz",
      accounts: [config.bob_key]
    },
    polygon: {
      url: "https://rpc.ankr.com/polygon",
      accounts: [config.bob_key]
    },
    scroll: {
      url: "https://rpc.ankr.com/scroll",
      accounts: [config.scroll_key],
      gasPrice: 500000000,
    },
    base: {
      url: "https://base-mainnet.public.blastapi.io",
      accounts: [config.base_key]
    },
    sepolia: {
      url: "https://eth-sepolia.public.blastapi.io",
      accounts: [config.sepolia_key]
    },
    bob_sepolia: {
      url: "https://testnet.rpc.gobob.xyz",
      accounts: [config.sepolia_key]
    }
  },
  solidity: {
    compilers: [
      {
        version: "0.5.16",
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999,
          },
        },
      },
      {
        version: "0.6.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999,
          },
        },
      },
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999,
          },
        },
      },
    ],
  },
  etherscan: {
    apiKey: {
      blast: config.blast_api_key,
      mantle: config.mantle_api_key,
      sepolia: config.mantle_api_key,
      mainnet: config.mantle_api_key,
      scroll: config.scroll_api_key,
      bob: config.mantle_api_key,
      base: config.base_api_key,
      polygon: config.matic_api_key
    },
    customChains: [
      {
        network: 'blast',
        chainId: 81457,
        urls: {
          apiURL: "https://api.blastscan.io/api",
          browserURL: "https://blastscan.io"
        }
      },
      {
        network: "mantle",
        chainId: 5000,
        urls: {
          apiURL: "https://explorer.mantle.xyz/api",
          browserURL: "https://explorer.mantle.xyz"
        }
      },
      {
        network: "scroll",
        chainId: 534352,
        urls: {
          apiURL: "https://api.scrollscan.com/api",
          browserURL: "https://api.scrollscan.com"
        }
      },
      {
        network: "bob",
        chainId: 60808,
        urls: {
          apiURL: "https://explorer.gobob.xyz/api",
          browserURL: "https://explorer.gobob.xyz"
        }
      }
    ]
  }
};
