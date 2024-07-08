const { ethers } = require("hardhat");

const lvFactoryAddr = "0x78CF011cD188C3014C176d09A0c0d3E790f0b209";
const ownerAddr = "0x5ec869c1cb378bb77bc55bb56129399f6828c8c5"

async function main() {
  const [owner] = await ethers.getSigners();
  console.log(owner.address);

  const lvFactoryV1 = await ethers.getContractAt("LendingVaultV1Factory", lvFactoryAddr)
  await lvFactoryV1._setPendingAdmin(ownerAddr);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});