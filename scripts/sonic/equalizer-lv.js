const { ethers } = require("hardhat");

const reserveAdmin = "0x9fd93712400902bff6040efa72B28Bf80152F056"

const underlyings = [
  {
    ind: 0,
    address: "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38", // wS
    symbol: "ibexS",
    name: "Impermax Lent S",
    borrowables: [
      "0x484D5f48E8d97126422E77353b21D4C5b773f443", // ws/eco
      "0xc40c6b4b8645412C81C1627d1e24b5b6705C5c20", // ws/equal
      "0x8607400D97b782493629B7DEA99B79f90A5347f3", // ws/usdc.e
    ]
  },
  {
    ind: 1,
    address: "0x29219dd400f2Bf60E5a23d13Be72B486D4038894", // usdc.e
    symbol: "ibexUSDC.e",
    name: "Impermax Lent USDC.e",
    borrowables: [
      "0x7Eac328292b106b747B86755A453bD801FAaC620", // ws/usdc.e
      "0x08efCD7C1B5ef4DcDF0Bf7821FBFB6388C115698", // usdc.e/weth
    ]
  },
  {
    ind: 2,
    address: "0x50c42dEAcD8Fc9773493ED674b675bE577f2634b", // weth
    symbol: "ibexWETH",
    name: "Impermax Lent WETH",
    borrowables: [
      "0x6b6E9E5e8E3d35383dea994D9f01cD9680F7bc4E", // weth/equal
      "0x75414f3CB1881EB477Cc811ff17D04fec5AdebDC", // usdc.e/weth
    ]
  },
]

async function main() {
  const [owner] = await ethers.getSigners();
  console.log(owner.address);

  // {
  //   // deploy watcher
  //   const LVWatcher = await ethers.getContractFactory("LendingVaultWatcher01");
  //   const lvWatcher = await LVWatcher.deploy();
  //   await lvWatcher.waitForDeployment();
  //   const lvWatcherAddr = await lvWatcher.getAddress();

  //   console.log(`LVWatcher deployed to: ${lvWatcherAddr}`)

  //   // deploy LVDeployer
  //   const LVDeployerV1 = await ethers.getContractFactory("LVDeployerV1");
  //   const lvDeployer = await LVDeployerV1.deploy();
  //   await lvDeployer.waitForDeployment();
  //   const lvDeployerAddr = await lvDeployer.getAddress();

  //   console.log(`LVDeployer deployed to: ${lvDeployerAddr}`)

  //   // deploy LVFactory
  //   const LVFactoryV1 = await ethers.getContractFactory("LendingVaultV1Factory");
  //   const lvFactoryV1 = await LVFactoryV1.deploy(owner.address, reserveAdmin, lvDeployerAddr);
  //   await lvFactoryV1.waitForDeployment();
  //   const lvFactoryAddr = await lvFactoryV1.getAddress();

  //   console.log(`LVFactory deployed to: ${lvFactoryAddr}`)
  // }

  {
    let tx;
    const lvFactoryV1 = await ethers.getContractAt("LendingVaultV1Factory", "0xa39d28Cb4E1506eDAfDcCb214E335df8800A4b19")
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

// LVWatcher deployed to: 0x0680AD510475844a0555914FD38979B31FdA3b2f
// LVDeployer deployed to: 0xa403128Dd76566a6fC1C3328d204ad6ef38A24D0
// LVFactory deployed to: 0xa39d28Cb4E1506eDAfDcCb214E335df8800A4b19

// ibexS: 0x49967493310250254Aee27F0AbD2C97b45cb1509
// ibexUSDC.e 0xDD8761dec5dF366a6AF7fE4E15b8f3888c0a905c
// ibexWETH 0x835dA504bEfedC85404ad6A11df278049bc56d12