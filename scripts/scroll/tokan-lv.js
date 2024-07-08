const { ethers } = require("hardhat");

const reserveAdmin = "0x9fd93712400902bff6040efa72B28Bf80152F056"

const underlyings = [
  {
    ind: 0,
    address: "0x5300000000000000000000000000000000000004", // WETH
    symbol: "ibexETH",
    name: "Impermax Lent ETH",
    borrowables: [
      "0x48305bF15D7002b07f94F52265bdFee36cAA84EA", // usdc/eth
      "0xb492DEA66BacC684E18b5D423265a57E2969eCcf", // weth/stone
      "0x669B85EF150180365c44149e6685933079B4b515", // weth/wrset
      "0x261c172cba86B745c46060F856A64bd2Dd9D2Fd0", // wbtc/weth
      "0x6bb698fcfec8BC3cfF098Fef50e48A3712cb5F2B", // weth/wsteth
    ]
  },
  {
    ind: 1,
    address: "0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4", // USDC
    symbol: "ibexUSDC",
    name: "Impermax Lent USDC",
    borrowables: [
      "0xf92Fe79d269C3C315973dFcda7D748B1e506991B", // usdc/weth
      "0x54F0ff89cDA4fCE85A265aa98d5450bCaA55FB10", // usdc/usdt
    ]
  }
]

async function main() {
  const [owner] = await ethers.getSigners();
  console.log(owner.address);

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

  let tx;
  // const lvFactoryV1 = await ethers.getContractAt("LendingVaultV1Factory", "0x78CF011cD188C3014C176d09A0c0d3E790f0b209")
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

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

// LVDeployer deployed to: 0x5EE2eaB51182C3EfFE437A196545A77005615DF7
// LVFactory deployed to: 0x78CF011cD188C3014C176d09A0c0d3E790f0b209