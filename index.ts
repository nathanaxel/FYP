import * as ETHUtils from './utils/eth'
import * as AlgoUtils from './utils/algo'
import * as ETHAccounts from './utils/accountETH'
import * as AlgoAccounts from './utils/accountAlgo'
import { OfferDetails } from './utils/OfferDetails'
import { OrderDetails } from './utils/orderDetails'
import { matchPair } from './utils/matching'


async function main() {
  // await AlgoUtils.createAccount();

  // Get owner accounts
  const ETHOwner = await ETHUtils.getAccount(ETHAccounts.owner);
  const AlgoOwner = await AlgoUtils.getAccount(AlgoAccounts.owner);
  console.log("Owner accounts are created.\n")

  // Get seller accounts
  const ETHSeller = await ETHUtils.getAccount(ETHAccounts.seller);
  const AlgoSeller = await AlgoUtils.getAccount(AlgoAccounts.seller);
  console.log("Seller accounts are created.\n")

  // Get buyer accounts
  const ETHBuyer = await ETHUtils.getAccount(ETHAccounts.buyer);
  const AlgoBuyer = await AlgoUtils.getAccount(AlgoAccounts.buyer);
  console.log("Buyer accounts are created.\n")

  // Start both exchanges
  const duration = 10000;
  const AlgoContractDetails = await AlgoUtils.startExchange(AlgoOwner, duration);
  await ETHUtils.startExchange(ETHOwner, duration);
  console.log("Both exchanges have started.\n")

  // Sellers give offers
  await ETHUtils.submitOffer(ETHSeller, new OfferDetails(2000, 30, "+001.3143", "+103.7093", "A"));
  await AlgoUtils.submitOffer(AlgoSeller, new OfferDetails(2000, 30, "+001.3450", "+103.9832", "A"), AlgoContractDetails);
  console.log("All offers have been made by sellers\n")

  // Buyers give orders
  await ETHUtils.submitOrder(ETHBuyer, new OrderDetails(1000, 30, "+001.3143", "+103.7093", "A"));
  await AlgoUtils.submitOrder(AlgoBuyer, new OrderDetails(1000, 30, "+001.3450", "+103.9832", "A"), AlgoContractDetails);
  console.log("All orders have been made by buyers\n")

  // Get offer books and merge to create combined offer book
  const ETHOfferBook = await ETHUtils.getOfferBook(ETHOwner);
  const AlgoOfferBook = await AlgoUtils.getOfferBook(AlgoOwner, AlgoContractDetails);
  const mergeOfferBook =  ETHOfferBook.concat(AlgoOfferBook);
  console.log(mergeOfferBook);

  // Get order books and merge to create combined order book
  const ETHOrderBook = await ETHUtils.getOrderBook(ETHOwner);
  const AlgoOrderBook = await AlgoUtils.getOrderBook(AlgoOwner, AlgoContractDetails);
  const mergeOrderBook =  ETHOrderBook.concat(AlgoOrderBook);
  console.log(mergeOrderBook);

  // Matching algorithm
  const matchesArray = await matchPair(mergeOrderBook, mergeOfferBook);
  console.log(matchesArray);

}


main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
