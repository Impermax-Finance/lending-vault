const { ethers } = require("hardhat");

const lvFactoryAddr = "0xAB2C1776Be36DA25677202f8c33d9608bBd4F99B";
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