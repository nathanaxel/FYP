import * as ETHUtils from './utils/eth'
import * as AlgoUtils from './utils/algo'
import { OfferDetails } from './utils/OfferDetails';


// Ethereum private keys
const privateKeyOwner = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const privateKeySeller = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
const privateKeyBuyer = '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a';

async function main() {

  // Create owner accounts
  const ETHOwner = await ETHUtils.getAccount(privateKeyOwner);
  const AlgoOwner = await AlgoUtils.getAccount();

  // Create seller accounts
  const ETHSeller = await ETHUtils.getAccount(privateKeySeller);
  const AlgoSeller = await AlgoUtils.getAccount();

  // Start both exchanges
  const duration = 10000;
  const AlgoContractDetails = await AlgoUtils.startExchange(AlgoOwner, duration);
  await ETHUtils.startExchange(ETHOwner, duration);

  // Sellers give offers
  await ETHUtils.submitOffer(ETHSeller, new OfferDetails(1000, 10, "+001.3143", "+103.7093", "A"));
  await AlgoUtils.submitOffer(AlgoSeller, new OfferDetails(1000, 10, "+001.3450", "+103.9832", "A"), AlgoContractDetails);

  // Get order book and merge both
  const ETHOrderBook = await ETHUtils.getOffers(ETHOwner);
  const AlgoOrderBook = await AlgoUtils.getOffers(AlgoOwner, AlgoContractDetails);
  const mergeOrderBooks =  ETHOrderBook.concat(AlgoOrderBook);
  console.log(mergeOrderBooks)

  // Create buyer accounts
  const ETHBuyer = await ETHUtils.getAccount(privateKeyBuyer);
  const AlgoBuyer = await AlgoUtils.getAccount();

  // Buyer give their preference
  const 
}


main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
