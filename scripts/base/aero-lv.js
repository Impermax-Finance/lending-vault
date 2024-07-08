const { ethers } = require("hardhat");

const reserveAdmin = "0x9fd93712400902bff6040efa72B28Bf80152F056"
// const ownerAddr = "0x5ec869c1cb378bb77bc55bb56129399f6828c8c5"

const underlyings = [
  // {
  //   ind: 0,
  //   address: "0x4200000000000000000000000000000000000006", // WETH
  //   symbol: "ibexETH",
  //   name: "Impermax Lent ETH",
  //   borrowables: [
  //     "0x7fbb6111eAC6e4CB5F5cFfbaa39903Ff4340FF59", // usdc/eth
  //   ]
  // },
  {
    ind: 1,
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
    symbol: "ibexUSDC",
    name: "Impermax Lent USDC",
    borrowables: [
      "0x8D376D16c70Ec456Cb8bE03c12Ce65A9A0584FfD", // usdc/weth
      "0x4ddA3Ae5576B7D5B42626D671d1Ae738716bc459", // usdc/aero
    ]
  }
]

async function main() {
  const [owner] = await ethers.getSigners();
  console.log(owner.address);

  // // deploy LVDeployer
  // const LVDeployerV1 = await ethers.getContractFactory("LVDeployerV1");
  // const lvDeployer = await LVDeployerV1.deploy();
  // await lvDeployer.waitForDeployment();
  // const lvDeployerAddr = await lvDeployer.getAddress();

  // console.log(`LVDeployer deployed to: ${lvDeployerAddr}`)

  // // deploy LVFactory
  // const LVFactoryV1 = await ethers.getContractFactory("LendingVaultV1Factory");
  // const lvFactoryV1 = await LVFactoryV1.deploy(owner.address, reserveAdmin, lvDeployerAddr);
  // await lvFactoryV1.waitForDeployment();
  // const lvFactoryAddr = await lvFactoryV1.getAddress();

  // console.log(`LVFactory deployed to: ${lvFactoryAddr}`)

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

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

// LVDeployer deployed to: 0x47D568AE36AAf9aAc43DD82367BA3ACb32aFB198
// LVFactory deployed to: 0xaEA22Da48d4c15Ab10B8B7ad529c189ec9Ae24fE