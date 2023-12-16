// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.20;

contract Exchange{
    enum State { Inactive, Active, Finished }

    struct Offer {
        address producer;
        uint256 energyAmount; 
        uint256 pricePerKWh;  
        
        string latitude;
        string longtitude;
        string sustainability;
        string currency;
    }

    struct Order {
        address consumer;
        uint256 energyAmount;
        
        string latitude;
        string longtitude;
        string sustainability;
        string currency;
    }

    State public currentState = State.Inactive;
    address public owner;
    uint256 public submissionDeadline = 0;
    string public constant CURRENCY = "ETHE";
    
    Offer[] public offerBook;
    Order[] public orderBook;

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
    }

    // Modifier to restrict function access when submission period is active
    modifier isActive(){
        if (block.timestamp > submissionDeadline) currentState = State.Finished;
        require(currentState == State.Active, "Submission is not active");
    }

    modifier isFinished(){
        if (block.timestamp > submissionDeadline) currentState = State.Finished;
        require(currentState == State.Active, "Submission is not finished");
    }

    // Function to set the submission deadline
    function startExchange(uint256 duration) public onlyOwner, IsInactive {
        submissionDeadline = block.timestamp + duration;
        currentState = State.Active;
    
    }

    // Function to override and stop submission period
    function stopExchange() public onlyOwner, IsActive {
        currentState = State.Finished;
    }

    // Function to add an offer to the offer book
    function submitOffer(
        uint256 _energyAmount, 
        uint256 _pricePerKWh, 
        string memory _latitude,
        string memory _longtitude,
        string memory _sustainability
        ) IsActive public {
        require(_energyAmount > 0, "Energy amount must be larger than 0");

        Offer memory newOffer = Offer({
            producer: msg.sender,
            energyAmount: _energyAmount,
            pricePerKWh: _pricePerKWh,
            latitude: _latitude,
            longtitude: _longtitude,
            sustainability: _sustainability,
            currency: CURRENCY
        });
        offerBook.push(newOffer);
    }

    // Function to add an order to the order book
    function submitOrder()(
        uint256 _energyAmount, 
        string memory _latitude,
        string memory _longtitude,
        string memory _sustainability
        ) public IsActive {
        require(_energyAmount > 0, "Energy amount must be larger than 0");

        Offer memory newOrder = Order({
            consumer: msg.sender,
            energyAmount: _energyAmount,
            latitude: _latitude,
            longtitude: _longtitude,
            sustainability: _sustainability,
            currency: CURRENCY
        });
        orderBook.push(newOrder);
    }

    // Function to view the order book
    function getOrderBook() public view returns (Offer[] memory) {
        return orderBook;
    }

    // Function to view the offer book
    function getOfferbook() public view returns (Offer[] memory) {
        return offerBook;
    }
}