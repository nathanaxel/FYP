import { NonceManager, ethers } from 'ethers';
import { OfferDetails } from './OfferDetails'
import { OrderDetails } from './orderDetails'
import ethereumArtifact from '../Ethereum/artifacts/contracts/Exchange.sol/Exchange.json'

// Ethereum configuration
const ethereumProviderUrl = 'http://localhost:8545'; 
const contractABI = ethereumArtifact.abi; 
const contractBytecode = ethereumArtifact.bytecode;
var contractAddress: string;

// Get signer for owner of ETH exchange
export async function getAccount(privateKey: string) {
  const provider = ethers.getDefaultProvider(ethereumProviderUrl)
  const signer = new ethers.Wallet(privateKey, provider);
  return new NonceManager(signer);
}

// Start ETH Exchange
export async function startExchange(signer: any, duration: number) {
  const contractFactory = new ethers.ContractFactory(contractABI, contractBytecode, signer);
  const contractDeployed = await contractFactory.deploy();
  await contractDeployed.waitForDeployment();
  contractAddress = await contractDeployed.getAddress()
  const contract = new ethers.Contract(contractAddress, contractABI, signer);
  await contract.startExchange(duration);
  return;
}

// Submit offer to ETH Exchange
export async function submitOffer(signer: any, od: OfferDetails){
  const contract = new ethers.Contract(contractAddress, contractABI, signer);
  await contract.submitOffer(
    od.energy_amount,
    od.price,
    od.latitude,
    od.longitude,
    od.sustainability
  );
}

// Submit order to ETH Exchange
export async function submitOrder(signer: any, od: OrderDetails){
  const contract = new ethers.Contract(contractAddress, contractABI, signer);
  const paymentAmount = ethers.parseUnits((od.energy_amount * od.price).toString(), "wei");

  await contract.submitOrder(
    od.energy_amount,
    od.price,
    od.latitude,
    od.longitude,
    od.sustainability,
    {
      value: paymentAmount 
    }
  );
}

// Get offer book from ETH Exchange
export async function getOfferBook(signer: any) {
  const contract = new ethers.Contract(contractAddress, contractABI, signer);
  var offerBook = await contract.getOfferBook();

  // Convert offerBook to standard array
  offerBook = Array.from(offerBook);
  for (let i = 0; i < offerBook.length; i++) offerBook[i] = Array.from(offerBook[i]);

  // Convert big-int to number
  offerBook = offerBook.map((offer: any) => 
      offer.map((value: any) => 
          typeof value === 'bigint' ? Number(value) : value
      )
  );
  return offerBook;
}

// Get order book from ETH Exchange
export async function getOrderBook(signer: any) {
  const contract = new ethers.Contract(contractAddress, contractABI, signer);
  var orderBook = await contract.getOrderBook();

  // Convert orderBook to standard array
  orderBook = Array.from(orderBook);
  for (let i = 0; i < orderBook.length; i++) orderBook[i] = Array.from(orderBook[i]);

  // Convert big-int to number
  orderBook = orderBook.map((offer: any) => 
      offer.map((value: any) => 
          typeof value === 'bigint' ? Number(value) : value
      )
  );

  return orderBook;
}

// set offer book to ETH Exchange
export async function setOfferBook(signer: any, mergeOfferBook: any){
  const contract = new ethers.Contract(contractAddress, contractABI, signer);
  await contract.setOfferBook(mergeOfferBook);
}

// set order book to ETH Exchange
export async function setOrderBook(signer: any, mergeOrderBook: any){
  const contract = new ethers.Contract(contractAddress, contractABI, signer);
  await contract.setOrderBook(mergeOrderBook);
}

// get balance form ETH Exchange
export async function getBalance(signer: any){
  const contract = new ethers.Contract(contractAddress, contractABI, signer);
  return await contract.getBalance();
}



