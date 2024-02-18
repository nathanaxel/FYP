type Order = [string, number, number, string, string, string, string];
type Offer = [string, number, number, string, string, string, string];
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


export async function matchPair(orderbook: Order[], offerBook: Offer[]) {
  // Standardize orderbook and offerBook to USDC
  const standardizedOrderbook = orderbook.map(order => {
    const [wallet, energy_amount, price, lat, long, status, currency] = order;
    return [wallet, energy_amount, convertToUSDC(price, currency), lat, long, status, currency] as Order;
  });
  const standardizedOfferBook = offerBook.map(offer => {
    const [wallet, energy_amount, price, lat, long, status, currency] = offer;
    return [wallet, energy_amount, convertToUSDC(price, currency), lat, long, status, currency] as Order;
  });

  // Rank "eligible" customers for each producer based on potential revenue, where:
  // 1) "Eligible" customers demand no more energy than the producer can supply.
  // 2) Customers' maximum price per kWh is at least equal to the producer's price, ensuring profitability.
  // 3) Their required sustainability grade matches or is below the producer's grade.
  // Revenue is calculated as price per kWh * (energy demanded + transmission loss), 
  // with transmission loss estimated from the distance (longitude/latitude) using the formula: energy * distance * 8.3e-5.
  const producerRankings = new Map<string, string[]>();
  standardizedOfferBook.forEach(offer => {
    const [producerWallet, producerAmount, producerPrice, producerLat, producerLong, producerGrade] = offer;
    const eligibleCustomers = standardizedOrderbook
      .filter(([ , customerAmount, customerPrice, customerLat, customerLong, customerGrade]) => {
        // Estimate transmission loss upfront
        const distance = calculateDistance(producerLat, producerLong, customerLat, customerLong);
        const transmissionLoss = customerAmount * distance * 8.3e-5;
        const totalDemand = customerAmount + transmissionLoss;
        const isDemandMet = totalDemand <= producerAmount;
        const isPriceCompatible = customerPrice * customerAmount >= producerPrice * totalDemand;
        const isGradeCompatible = customerGrade <= producerGrade;
        return isDemandMet && isPriceCompatible && isGradeCompatible;
      })
      .map(([customerWallet, customerAmount, , customerLat, customerLong]) => {
        const distance = calculateDistance(producerLat, producerLong, customerLat, customerLong);
        const transmissionLoss = customerAmount * distance * 8.3e-5;
        const grossEnergy = customerAmount + transmissionLoss;
        const revenue = grossEnergy * producerPrice; // Use producer's price for revenue calculation
        return { customerWallet, revenue };
      })
      // Sort by potential revenue in descending order
      .sort((a, b) => b.revenue - a.revenue)
      // Extract just the customer wallet addresses for ranking
      .map(({ customerWallet }) => customerWallet);

    // Store the sorted list of customer wallet addresses in the Map under the producer's wallet address
    producerRankings.set(producerWallet, eligibleCustomers);
  });

  // // Log the rankings for each producer
  // producerRankings.forEach((customers, producerWallet) => {
  //   console.log(`Producer ${producerWallet} rank sorted: `, customers.join(', '));
  // });

  // Rank producers for each consumer based on the potential cost to minimize expenses, considering:
  // 1) Producers must offer sufficient energy to meet the consumer's demand.
  // 2) The cost per kWh from the producer must be within the consumer's price range.
  // 3) The sustainability grade of the producer's energy must meet or exceed the consumer's requirement.
  // The cost is determined by multiplying the producer's price per kWh by the total energy required, including transmission loss.
  // Transmission loss is calculated from the distance (using longitude/latitude) with the formula: energy * distance * 8.3e-5.
  // Consumers are then matched with producers ranked by ascending costs to ensure the most economical purchases.

  const consumerRankings = new Map<string, string[]>();
  standardizedOrderbook.forEach(order => {
    const [consumerWallet, consumerAmount, consumerPrice, consumerLat, consumerLong, consumerGrade] = order;
    const eligibleProducers = standardizedOfferBook
      .filter(([ , producerAmount, producerPrice, producerLat, producerLong, producerGrade]) => {
        // Estimate transmission loss upfront
        const distance = calculateDistance(consumerLat, consumerLong, producerLat, producerLong);
        const transmissionLoss = consumerAmount * distance * 8.3e-5;
        const totalDemand = consumerAmount + transmissionLoss;
        const isSupplySufficient = producerAmount >= totalDemand;
        const isPriceAffordable = consumerPrice * consumerAmount >= producerPrice * totalDemand;
        const isGradeCompatible = consumerGrade <= producerGrade;
        return isSupplySufficient && isPriceAffordable && isGradeCompatible;
      })
      .map(([producerWallet, , producerPrice, producerLat, producerLong]) => {
        const distance = calculateDistance(consumerLat, consumerLong, producerLat, producerLong);
        const transmissionLoss = consumerAmount * distance * 8.3e-5;
        const grossEnergy = consumerAmount + transmissionLoss;
        const cost = grossEnergy * producerPrice; // Calculate cost based on producer's price
  
        return { producerWallet, cost };
      })
      // Sort by potential cost in ascending order to minimize cost
      .sort((a, b) => a.cost - b.cost)
      // Extract just the producer wallet addresses for ranking
      .map(({ producerWallet }) => producerWallet);

    // Store the sorted list of producer wallet addresses in the Map under the consumer's wallet address
    consumerRankings.set(consumerWallet, eligibleProducers);
  });

  // // Log the rankings for each consumer
  // consumerRankings.forEach((producers, consumerWallet) => {
  //   console.log(`Consumer ${consumerWallet} rank sorted: `, producers.join(', '));
  // });

  // Initialize matches as an empty Map; each entry will be a pair of producerWallet to consumerWallet
  const matches = new Map<string, string>();

  // Track which consumers are currently unmatched
  const unmatchedConsumers = new Set(consumerRankings.keys());

  // Track the next consumer each producer will propose to, starting with their first preference
  const nextProposals = new Map<string, number>([...producerRankings.keys()].map(k => [k, 0]));

  // Function to find a producer's current match
  const findCurrentMatchForProducer = (consumerWallet: string) => [...matches].find(([producer, consumer]) => consumer === consumerWallet)?.[0];

  // Continue until all producers have made proposals down their list
  while ([...producerRankings.keys()].some(producerWallet => {
    // Check if the producer is unmatched and hasn't gone through the entire list
    const consumerPreferences = producerRankings.get(producerWallet) ?? [];
    return !matches.has(producerWallet) && (nextProposals.get(producerWallet) ?? 0) < consumerPreferences.length;
})) {
    producerRankings.forEach((consumerPreferences, producerWallet) => {
      // If the producer is currently matched, skip
      if (matches.has(producerWallet)) return;

      // Get the next customer down their list. If there is no customer left, skip
      const proposalIndex = nextProposals.get(producerWallet) ?? 0;
      if (proposalIndex >= consumerPreferences.length) return;
      const consumerWallet = consumerPreferences[proposalIndex];

      // If the consumer is unmatched, create a new match
      if (unmatchedConsumers.has(consumerWallet)) {
        matches.set(producerWallet, consumerWallet);
        unmatchedConsumers.delete(consumerWallet);
      } 

      // If the consumer is already matched, check if they prefer the new proposal
      else {
        const currentProducerWallet = findCurrentMatchForProducer(consumerWallet);
        const consumerPreferences = consumerRankings.get(consumerWallet) ?? [];
        const currentProducerIndex = currentProducerWallet ? consumerPreferences.indexOf(currentProducerWallet) : -1;
        const newProducerIndex = consumerPreferences.indexOf(producerWallet);

        if (currentProducerWallet == undefined) return;

        // The consumer prefers the new producer over the current one, the ousted producer will make another proposal
        if (newProducerIndex < currentProducerIndex) {
        
          matches.delete(currentProducerWallet);
          matches.set(producerWallet, consumerWallet);

          const currentProposalIndex = nextProposals.get(currentProducerWallet) ?? 0;
          nextProposals.set(currentProducerWallet, currentProposalIndex + 1);
        } 

        // The consumer prefers their current match, so the producer moves on to the next preference
        else nextProposals.set(producerWallet, proposalIndex + 1);
      }
    });
    return Array.from(matches.entries()).map(([producerWallet, consumerWallet]) => [producerWallet, consumerWallet]);
  }
}