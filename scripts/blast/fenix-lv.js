const { ethers } = require("hardhat");

const reserveAdmin = "0x9fd93712400902bff6040efa72B28Bf80152F056"

const underlyings = [
  {
    ind: 0,
    address: "0x4300000000000000000000000000000000000004", // WETH
    symbol: "ibexETH",
    name: "Impermax Lent ETH",
    borrowables: [
      "0xcb091A9a8448210D228dAA804982fA67f4828D5C", // fdao/eth
      "0x8372eEa5DE4B4DC7A3964b37C7a2805634F3a172", // eth/ibex
      "0x83fAE96f26eeD6974E3EaaEDDAadD82ae50c87a7", // sdk/eth
      "0x76eE5AdB90Cf8F2cF53c0C14158AF86C2dc0B0B1", // snx/eth
      "0xb58c30Ef2681eFEaF7Cb5d6D9840Ab43b36Ba51E", // fbomb/eth
    ]
  }
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
    const lvFactoryV1 = await ethers.getContractAt("LendingVaultV1Factory", "0xAB2C1776Be36DA25677202f8c33d9608bBd4F99B")
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

// LVWatcher deployed to: 0x5833C2BCe6C29323401e9eD171f1599001f5B288
// LVDeployer deployed to: 0x0EC372F1A5f10DaE72CD3Df25Eb72865F0676849
// LVFactory deployed to: 0xAB2C1776Be36DA25677202f8c33d9608bBd4F99B