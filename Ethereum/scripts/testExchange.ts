import { ethers } from "hardhat";

async function main() {
	const [owner, addr1, addr2] = await ethers.getSigners();
    const duration = 300;
    const Exchange = await ethers.deployContract("Exchange", [duration], owner);
    await Exchange.waitForDeployment();
 
	

}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
