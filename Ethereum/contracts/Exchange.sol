// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.20;

import "hardhat/console.sol";

contract Exchange{
    enum State { Inactive, Active, Finished }

    struct Offer {
        string producer;
        uint256 energyAmount; 
        uint256 pricePerKWh;  
        
        string latitude;
        string longitude;
        string sustainability;
        string currency;
    }

    struct Order {
        string consumer;
        uint256 energyAmount;
        uint256 pricePerKWh;  
        
        string latitude;
        string longitude;
        string sustainability;
        string currency;
    }

    State public currentState = State.Inactive;
    address public owner;
    uint256 public submissionDeadline = 0;
    string public constant CURRENCY = "ETHE";
    
    Offer[] public offerBook;
    Order[] public orderBook;

    uint256 totalBalance = 0;

    // Constructor
    constructor() {
        owner = msg.sender;
    }

    // Modifier to restrict function access to only the owner
    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call this function");
        _;
    }

    // Modifier to restrict function access when submission period is inactive
    modifier isInactive(){
        require(currentState == State.Inactive, "Submission is not inactive");
        _;
    }

    // Modifier to restrict function access when submission period is active
    modifier isActive(){
        if (block.timestamp > submissionDeadline) currentState = State.Finished;
        require(currentState == State.Active, "Submission is not active");
        _;
    }

    modifier isFinished(){
        if (block.timestamp > submissionDeadline) currentState = State.Finished;
        require(currentState == State.Active, "Submission is not finished");
        _;
    }

    // Function to set the submission deadline
    function startExchange(uint256 duration) public onlyOwner isInactive() {
        submissionDeadline = block.timestamp + duration;
        currentState = State.Active;
    }

    // Function to override and stop submission period
    function stopExchange() public onlyOwner isActive() {
        currentState = State.Finished;
    }

    // Function to add an offer to the offer book
    function submitOffer (
        uint256 _energyAmount, 
        uint256 _pricePerKWh, 
        string memory _latitude,
        string memory _longitude,
        string memory _sustainability
        ) isActive() public {
        require(_energyAmount > 0, "Energy amount must be larger than 0");

        Offer memory newOffer = Offer({
            producer: addressToString(msg.sender),
            energyAmount: _energyAmount,
            pricePerKWh: _pricePerKWh,
            latitude: _latitude,
            longitude: _longitude,
            sustainability: _sustainability,
            currency: CURRENCY
        });
        offerBook.push(newOffer);
    }

    // Function to add an order to the order book
    function submitOrder(
    uint256 _energyAmount, 
    uint256 _pricePerKWh, 
    string memory _latitude,
    string memory _longitude,
    string memory _sustainability
    ) public payable isActive() { 
        require(_energyAmount > 0, "Energy amount must be larger than 0");
        require(msg.value == _energyAmount * _pricePerKWh, "Incorrect payment amount");

        Order memory newOrder = Order({
            consumer: addressToString(msg.sender),
            energyAmount: _energyAmount,
            pricePerKWh: _pricePerKWh,
            latitude: _latitude,
            longitude: _longitude,
            sustainability: _sustainability,
            currency: CURRENCY
        });

        orderBook.push(newOrder);
        totalBalance += msg.value;
    }


    // Function to view the order book
    function getOrderBook() public view returns (Order[] memory) {
        return orderBook;
    }

    // Function to view the offer book
    function getOfferBook() public view returns (Offer[] memory) {
        return offerBook;
    }

    // Function to set the order book
    function setOrderBook(Order[] memory _orderBook) public onlyOwner {
        delete orderBook;
        for (uint i = 0; i < _orderBook.length; i++) 
            orderBook.push(_orderBook[i]);
        
    }

    // Function to set the offer book
    function setOfferBook(Offer[] memory _offerBook) public onlyOwner {
        delete offerBook;
        for (uint i = 0; i < _offerBook.length; i++) 
            offerBook.push(_offerBook[i]);
    }

    // Function to return balance of the exchange
    function getBalance() public view returns (uint256) {
        return totalBalance;
    }

    // Helper function to convert address to string
    function addressToString(address _address) public pure returns(string memory) {
        bytes memory alphabet = "0123456789abcdef";
        bytes memory data = abi.encodePacked(_address);
        bytes memory str = new bytes(2 + 20 * 2); // Length = 2 ('0x') + 20 bytes * 2 characters per byte
        str[0] = '0';
        str[1] = 'x';
        for (uint i = 0; i < 20; i++) {
            str[2+i*2] = alphabet[uint(uint8(data[i] >> 4))];
            str[3+i*2] = alphabet[uint(uint8(data[i] & 0x0f))];
        }
        return string(str);
    }
}