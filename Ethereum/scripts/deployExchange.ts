import { ethers } from "hardhat";

async function main() {
	const [owner] = await ethers.getSigners();
  const Exchange = await ethers.deployContract("Exchange", [], owner);
  await Exchange.waitForDeployment();
	console.log(`Smart contract deployed to ${Exchange.target}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
