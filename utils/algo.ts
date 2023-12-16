import algosdk, { ABIValue, Algodv2, decodeAddress } from 'algosdk';
import { OfferDetails } from './OfferDetails'
import * as Algorandabi from '../Algorand/artifacts/contract.json';
import process from 'process';
import fs from 'fs';

//ALGO configuration
const algorandToken = ''; 
const algorandServer = 'https://testnet-api.algonode.cloud';
const algorandPort = undefined; 
const algorandClient = new algosdk.Algodv2(algorandToken, algorandServer, algorandPort);

// Get signer for owner of Algo exchange
export async function getAccount() {
  const account = algosdk.generateAccount();

  // Check balance of account via algod
  const waitForBalance = async (addr: any) => {
    accountInfo = await algorandClient.accountInformation(addr).do();
    const balance = accountInfo.amount;
    if (balance === 0) await waitForBalance(addr);
  };

  // Get account information from the Algorand network
  let accountInfo = await algorandClient.accountInformation(account.addr).do();
  console.log(accountInfo);
  console.log('Dispense ALGO at https://bank.testnet.algorand.network. Script will continue once ALGO is received...');

  // Wait until account is funded
  await waitForBalance(account.addr);
  console.log(`${account.addr} funded`);

  return account;
}

// Start Algo Exchange
export async function startExchange(account: any, duration: number){
  // Compile TEAL scripts
  const approvalSource = fs.readFileSync('./Algorand/artifacts/approval.teal', 'utf8');
  const clearSource = fs.readFileSync('./Algorand/artifacts/clear.teal', 'utf8');
  const approvalCompileResult = await algorandClient.compile(approvalSource).do();
  const clearCompileResult = await algorandClient.compile(clearSource).do();
  const approvalBytes = new Uint8Array(Buffer.from(approvalCompileResult.result, 'base64'));
  const clearBytes = new Uint8Array(Buffer.from(clearCompileResult.result, 'base64'));
  const contract = new algosdk.ABIContract(Algorandabi);
  
  // Deploy the smart contract (Create Application)
  const suggestedParams = await algorandClient.getTransactionParams().do();
  const appCreateTxn = algosdk.makeApplicationCreateTxnFromObject({
    suggestedParams,
    onComplete: algosdk.OnApplicationComplete.NoOpOC, 
    from: account.addr,
    approvalProgram: approvalBytes, 
    clearProgram: clearBytes,
    numGlobalByteSlices: 2, 
    numGlobalInts: 2, 
    numLocalByteSlices: 2, 
    numLocalInts: 2, 
  });
  const signedCreateAppTxn = appCreateTxn.signTxn(account.sk);
  const createAppTxnId = appCreateTxn.txID().toString();
  const createAppResponse = await algorandClient.sendRawTransaction(signedCreateAppTxn).do();
  console.log('Create App Transaction ID:', createAppTxnId);

  // Wait for confirmation
  const createAppConfirmedTxn = await algosdk.waitForConfirmation(algorandClient, createAppTxnId, 4);
  const appId = createAppConfirmedTxn['application-index'];
  console.log('Created App ID:', appId);

  // Fund contract
  let accountInfo = await algorandClient.accountInformation(account.addr).do();
  const appAddress = algosdk.getApplicationAddress(appId);
  console.log('Dispense ALGO at https://bank.testnet.algorand.network. Script will continue once ALGO is received...');
  console.log(`Address at ${appAddress}`);

  // Check balance of account via algod
  const waitForBalance = async (addr: any) => {
    accountInfo = await algorandClient.accountInformation(addr).do();
    const balance = accountInfo.amount;
    if (balance === 0) await waitForBalance(addr);
  };

  await waitForBalance(appAddress);
  console.log(`${account.addr} funded`);

  // Call contract function
  const atc = new algosdk.AtomicTransactionComposer();
  atc.addMethodCall({
    suggestedParams,
    sender: account.addr,
    signer: async (unsignedTxns) => unsignedTxns.map((t) => t.signTxn(account.sk)),
    appID: appId,
    method: algosdk.getMethodByName(contract.methods, 'begin_submission'),
    methodArgs: [duration],
    boxes: [{ appIndex: appId, name: new Uint8Array(Buffer.from("order_book")) },]
  });
  await atc.execute(algorandClient, 3);

  return { appId, contract };
}

// Submit offer to ETH Exchange
export async function submitOffer(account: any, od: OfferDetails, contractDetails: any){
  const suggestedParams = await algorandClient.getTransactionParams().do();
  const atc = new algosdk.AtomicTransactionComposer();
  atc.addMethodCall({
    suggestedParams,
    sender: account.addr,
    signer: async (unsignedTxns) => unsignedTxns.map((t) => t.signTxn(account.sk)),
    appID: contractDetails.appId,
    method: algosdk.getMethodByName(contractDetails.contract.methods, 'submit_order'),
    methodArgs: [od.energy_amount, od.price, od.latitude, od.longitude, od.sustainability],
    boxes: [
      { appIndex: contractDetails.appId, name: new Uint8Array(algosdk.decodeAddress(account.addr).publicKey) }, 
      { appIndex: contractDetails.appId, name: new Uint8Array(Buffer.from("order_book")) }, 
    ]
  });
  await atc.execute(algorandClient, 3);
}

export async function getOffers(account: any, contractDetails: any){
  let offers: algosdk.ABIValue = [];

  // Obtain number of orders submitted by reading global state
  const appInfo = await algorandClient.getApplicationByID(contractDetails.appId).do();
  const globalState = appInfo.params['global-state'] as {key: string, value: {bytes: string, type: number, uint: number}}[];
  let numberOrders = 0;
  globalState.forEach((state) => {
    const key = Buffer.from(state.key, 'base64').toString();
    if (key === 'order_id') numberOrders =  state.value.uint;
  });

  // Loop each index in box to obtain complete order books
  const suggestedParams = await algorandClient.getTransactionParams().do();
  const atc = new algosdk.AtomicTransactionComposer();
  for (let i = 0; i < numberOrders; i++) {
    atc.addMethodCall({
      suggestedParams,
      sender: account.addr,
      signer: async (unsignedTxns) => unsignedTxns.map((t) => t.signTxn(account.sk)),
      appID: contractDetails.appId,
      method: algosdk.getMethodByName(contractDetails.contract.methods, 'read_order_index'),
      methodArgs: [i],
      boxes: [
        { appIndex: contractDetails.appId, name: new Uint8Array(Buffer.from("order_book")) }, 
      ]
    });
    const offer = await atc.execute(algorandClient, 3);
    if (offer.methodResults[0].returnValue != undefined) offers.push(offer.methodResults[0].returnValue);
  }

  // For each offer, convert uint[] field to string
  function asciiArrayToString(asciiArray: number[]): string {
    return asciiArray.map((asciiCode) => String.fromCharCode(asciiCode)).join('');
  }
  offers.forEach(offer => {
    if (!Array.isArray(offer)) return;
    for (let i = 0; i < offer.length; i++){
      if (offer[i] instanceof Object) {
        offer[i] = asciiArrayToString(offer[i] as number[]);
      }
    }
  });
  return offers;
}

