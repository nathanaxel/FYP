import { ethers } from "hardhat";

async function main() {
	const [user1, user2] = await ethers.getSigners();

	const token1 = await ethers.deployContract("AxelToken", [1000], user1); 
	await token1.waitForDeployment();

	const token2 = await ethers.deployContract("AxelToken", [1000], user2); 
	await token2.waitForDeployment();

	const preimage = generateRandomBytes32();
	const hashlock = hashData(preimage);
	const timelock = 86400;

	//player 1 lock contract
	console.log(preimage);
	const htlc1 = await ethers.deployContract("HashedTimelockContract", [user2.address, hashlock, timelock, token1, 1000], user1);
	await htlc1.waitForDeployment();
	await token1.connect(user1).approve(htlc1, 1000);
	await htlc1.connect(user1).lock();

	// //player 2 lock contract
	const htlc2 = await ethers.deployContract("HashedTimelockContract", [user1.address, hashlock, timelock, token2, 1000], user2);
	await htlc2.waitForDeployment();
	await token2.connect(user2).approve(htlc2, 1000);
	await htlc2.connect(user2).lock();

	// //player 1 unlock contract
	await htlc2.connect(user1).unlock(preimage);

	// //player 2 unlock contract
	console.log(await htlc2.connect(user2).getKey());
	await htlc1.connect(user2).unlock(await htlc2.connect(user2).getKey());

}

function generateRandomBytes32(): string {
	const randomBytes = ethers.randomBytes(32);
	return ethers.hexlify(randomBytes);
  }
  
  function hashData(data: string): string {
	return ethers.keccak256(data);
  }

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
