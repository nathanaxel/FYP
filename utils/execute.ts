import * as ETHUtils from './eth'
import * as AlgoUtils from './algo'

type ExchangeRates = { [key: string]: number };

// Mock exchange rates for demonstration purposes
const EXCHANGE_RATES: ExchangeRates = {
  ETHE: 2000, // Example rate: 1 ETHE = 2000 USDC (should be WEI)
  ALGO: 1.5,  // Example rate: 1 ALGO = 1.5 USDC
};

// Converts amounts from ETHE or ALGO to USDC
function convertToUSDC(amount: number, currency: string): number {
    const rate = EXCHANGE_RATES[currency];
    if (!rate) {
      throw new Error(`Exchange rate for ${currency} not found`);
    }
    return amount * rate;
}  

// Converts amounts from USDC to ETHE or ALGO
function convertFromUSDC(amount: number, currency: string): number {
    const rate = EXCHANGE_RATES[currency];
    if (!rate) {
      throw new Error(`Exchange rate for ${currency} not found`);
    }
    return amount / rate;
}

// Calculate distance based on coordinates
const calculateDistance = (lat1: string, long1: string, lat2: string, long2: string): number => {
    // Convert latitude and longitude from strings to numbers and then from degrees to radians
    const radiansLat1 = parseFloat(lat1) * (Math.PI / 180);
    const radiansLong1 = parseFloat(long1) * (Math.PI / 180);
    const radiansLat2 = parseFloat(lat2) * (Math.PI / 180);
    const radiansLong2 = parseFloat(long2) * (Math.PI / 180);

    // Difference in coordinates
    const diffLat = radiansLat2 - radiansLat1;
    const diffLong = radiansLong2 - radiansLong1;

    // Haversine formula
    const a = Math.sin(diffLat / 2) * Math.sin(diffLat / 2) +
                Math.cos(radiansLat1) * Math.cos(radiansLat2) *
                Math.sin(diffLong / 2) * Math.sin(diffLong / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    // Radius of Earth in kilometers. Use 3956 for miles
    const radius = 6371;

    // Calculate and return the distance
    return radius * c;
};

export async function executeTransaction(ETHOwner: any , AlgoOwner: any, AlgoContractDetails: any, matchesArray: any, mergeOfferBook: any, mergeOrderBook: any){
    const ETHBalance = Number(await ETHUtils.getBalance(ETHOwner));
    const AlgoBalance = Number(await AlgoUtils.getBalance(AlgoOwner, AlgoContractDetails));
    let totalBalance = convertToUSDC(ETHBalance, "ETHE") + convertToUSDC(AlgoBalance, "ALGO");

    console.log(`Convert ${ETHBalance} ETH to ${convertToUSDC(ETHBalance, "ETHE")} USDC`);
    console.log(`Convert ${AlgoBalance} ALGO to ${convertToUSDC(AlgoBalance, "ALGO")} USDC`);
    console.log(`Total initial balance = ${totalBalance} USDC`);
    console.log();
    
    // Step 1: Handle matched producer-consumer pair
    matchesArray.forEach((match: any) => {
        const [producer, consumer] = match;

        // Find the producer's and consumer's data
        const producerData = mergeOfferBook.find((offer: any) => offer[0] === producer);
        const consumerData = mergeOrderBook.find((order: any) => order[0] === consumer);

        if (!producerData || !consumerData) {
            console.error(`Data not found for producer ${producer} or consumer ${consumer}`);
            return;
        }

        // Extract relevant data from producer and consumer
        const [producerWallet, , producerPrice, producerLat, producerLong, , producerCurrency] = producerData;
        const [consumerWallet, consumerAmount, consumerPrice, consumerLat, consumerLong, ,consumerCurrency] = consumerData;
        
        // Find amount needed to pay 
        const distance = calculateDistance(producerLat, producerLong, consumerLat, consumerLong);
        const transmissionLoss = consumerAmount * distance * 8.3e-5;
        const grossEnergy = consumerAmount + transmissionLoss;
        const toPay = convertToUSDC(producerPrice * grossEnergy, producerCurrency);
        const toRefund = convertToUSDC(consumerPrice * consumerAmount, consumerCurrency) - toPay;
        
        // Pay the producer and consumer
        totalBalance -= toPay;
        totalBalance -= toRefund;

        const toPay_producer_cur = convertFromUSDC(toPay, producerCurrency);
        const toRefund_consumer_cur = convertFromUSDC(toRefund, consumerCurrency);

        console.log(`Transferring ${toPay} USDC to ${toPay_producer_cur} ${producerCurrency}`);
        console.log(`Paying ${producerWallet} ${toPay_producer_cur} ${producerCurrency}`);
        console.log(`Transferring ${toRefund} USDC to ${toRefund_consumer_cur} ${consumerCurrency}`);
        console.log(`Paying ${consumerWallet} ${toRefund_consumer_cur} ${consumerCurrency}`);
        console.log();
    });

    // Step 2: Handle unmatched consumer refund
    const matchedConsumers = matchesArray.map((match:any) => match[1]);
    const unmatchedConsumers = mergeOrderBook.filter((order: any) => !matchedConsumers.includes(order[0]));

    for (const consumerData of unmatchedConsumers) {
        const [consumerWallet, consumerAmount, consumerPrice, , , , consumerCurrency] = consumerData;
        const toRefund = convertToUSDC(consumerPrice * consumerAmount, consumerCurrency);
        totalBalance -= toRefund
        const toRefund_consumer_cur = convertFromUSDC(toRefund, consumerCurrency);
        console.log(`Transferring ${toRefund} USDC to ${toRefund_consumer_cur} ${consumerCurrency}`);
        console.log(`Paying ${consumerWallet} ${toRefund_consumer_cur} ${consumerCurrency}`);
        console.log();
    }
    console.log(`Total final balance = ${totalBalance} USDC`);
}

    