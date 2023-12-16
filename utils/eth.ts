import { ethers } from 'ethers';
import { OfferDetails } from './OfferDetails'
import ethereumArtifact from '../Ethereum/artifacts/contracts/Exchange.sol/Exchange.json'

//Ethereum configuration
const ethereumProviderUrl = 'http://localhost:8545'; 
const ethereumContractAddress = '0x9E545E3C0baAB3E08CdfD552C960A1050f373042';  //if breaks, re-deploy and change this
const ethereumContractABI = ethereumArtifact.abi; 

// Get signer for owner of ETH exchange
export async function getAccount(privateKey: string) {
  const provider = ethers.getDefaultProvider(ethereumProviderUrl)
  const signer = new ethers.Wallet(privateKey, provider);
  return signer;
}

// Start ETH Exchange
export async function startExchange(signer: any, duration: number) {
  const contract = new ethers.Contract(ethereumContractAddress, ethereumContractABI, signer);
  await contract.startExchange(duration);
  return;
}

// Submit offer to ETH Exchange
export async function submitOffer(signer: any, od: OfferDetails){
  const contract = new ethers.Contract(ethereumContractAddress, ethereumContractABI, signer);
  await contract.submitOffer(
    od.energy_amount,
    od.price,
    od.latitude,
    od.longitude,
    od.sustainability
  );
}

// Get all offers submitted to ETH Exchange
function asciiArrayToString(asciiArray: number[]): string {
  return asciiArray.map((asciiCode) => String.fromCharCode(asciiCode)).join('');
}
export async function getOffers(signer: any){
  const contract = new ethers.Contract(ethereumContractAddress, ethereumContractABI, signer);
  const offers = await contract.getOrderBook();
  return offers;
}





