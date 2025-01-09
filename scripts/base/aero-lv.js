const { ethers } = require("hardhat");

const reserveAdmin = "0x9fd93712400902bff6040efa72B28Bf80152F056"

const underlyings = [
  {
    ind: 0,
    address: "0x4200000000000000000000000000000000000006", // WETH
    symbol: "ibexETH",
    name: "Impermax Lent ETH",
    borrowables: [
      "0x7fbb6111eAC6e4CB5F5cFfbaa39903Ff4340FF59", // usdc/eth
      "0x1Cc240ED506BB7Ee062B4916873e934eA1dd2194", // eth/cbbtc
      "0x36e474b287532c92c4509efe44d19bb69fa6b423", // eth/usdc univ2
    ]
  },
  {
    ind: 1,
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
    symbol: "ibexUSDC",
    name: "Impermax Lent USDC",
    borrowables: [
      "0x8D376D16c70Ec456Cb8bE03c12Ce65A9A0584FfD", // usdc/weth
      "0x4ddA3Ae5576B7D5B42626D671d1Ae738716bc459", // usdc/aero
      "0xCe34f45B98731E5DAE4E0BAAE37eBa63Ba07d684", // usdc/cbbtc
      "0x43EF63ae565fCFbbc277A4C634321c634820ad79", // eth/usdc univ2
    ]
  },
  {
    ind: 2,
    address: "0x4200000000000000000000000000000000000006", // ETH - medium risk
    symbol: "ibexETHV2",
    name: "Impermax Lent ETH V2",
    borrowables: [
      "0x90f5c47cfb7dE8E657eBB174D90E3A4d8D64cDD0", // virtual/eth
    ]
  },
  {
    ind: 3,
    address: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf", // cbBTC
    symbol: "ibexcbBTC",
    name: "Impermax Lent cbBTC",
    borrowables: [
      "0xf2b5ebDd02861392C4Aa90838eF4d549362754A4", // eth/cbbtc
      "0xE196398b56175247328C2bF4a9C85497fb02914e", // usdc/cbbtc
    ]
  },
]

async function main() {
  const [owner] = await ethers.getSigners();
  console.log(owner.address);

  // deploy contracts
  {
    // deploy watcher
    const LVWatcher = await ethers.getContractFactory("LendingVaultWatcher01");
    const lvWatcher = await LVWatcher.deploy();
    await lvWatcher.waitForDeployment();
    const lvWatcherAddr = await lvWatcher.getAddress();

    console.log(`LVWatcher deployed to: ${lvWatcherAddr}`)

    // deploy LVDeployer
    const LVDeployerV1 = await ethers.getContractFactory("LVDeployerV1");
    const lvDeployer = await LVDeployerV1.deploy();
    await lvDeployer.waitForDeployment();
    const lvDeployerAddr = await lvDeployer.getAddress();

    console.log(`LVDeployer deployed to: ${lvDeployerAddr}`)

    // deploy LVFactory
    const LVFactoryV1 = await ethers.getContractFactory("LendingVaultV1Factory");
    const lvFactoryV1 = await LVFactoryV1.deploy(owner.address, reserveAdmin, lvDeployerAddr);
    await lvFactoryV1.waitForDeployment();
    const lvFactoryAddr = await lvFactoryV1.getAddress();

    console.log(`LVFactory deployed to: ${lvFactoryAddr}`)
  }

  // init lending vaults
  {
    let tx;
    const lvFactoryV1 = await ethers.getContractAt("LendingVaultV1Factory", "0xaEA22Da48d4c15Ab10B8B7ad529c189ec9Ae24fE")
    for (const underlying of underlyings) {
      tx = await lvFactoryV1.createVault(underlying.address, underlying.name, underlying.symbol);
      await tx.wait();

      const vaultAddr = await lvFactoryV1.allVaults(underlying.ind);
      const vaultContract = await ethers.getContractAt("LendingVaultV1", vaultAddr);

      console.log("vault, underlying", vaultAddr, await vaultContract.underlying());

      for (const borrowable of underlying.borrowables) {
        tx = await vaultContract.addBorrowable(borrowable);
        await tx.wait();
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

// LVDeployer deployed to: 0x47D568AE36AAf9aAc43DD82367BA3ACb32aFB198
// LVFactory deployed to: 0xaEA22Da48d4c15Ab10B8B7ad529c189ec9Ae24fE

// ibexETH: 0x0a19875829fDF28b8e3230A3F1EB46668240cc11
// ibexUSDC: 0x929265aaD975CfeDedb65A19a05A3Be2196766F1
// ibexcbBTC: 0xc68c47085D2B53A0A782c168D1b54a913A668cB5
// ibexETHV2: 0x683Cc7cbB8B8C5b3c5Fae85A4AE70e887217883B