const { expect } = require("chai");
const { network, ethers , provider} = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const assert = require('assert');


describe("Exchange", function () {
    async function deployTokenFixture() {
        const [owner, addr1, addr2] = await ethers.getSigners();
        const duration = 300;
        const Exchange = await ethers.deployContract("Exchange", [], owner);
        await Exchange.waitForDeployment();
        await Exchange.startExchange(200);
        return {Exchange, owner, duration, addr1, addr2};
    };

    it("Should allow offer submissions within the deadline", async function () {
        const {Exchange} = await loadFixture(deployTokenFixture);

        // Submit an offer
        await Exchange.submitOffer(1000, 50, "+040.7128", "-074.0060", "A");

        // Get the offer book
        const offerBook = await Exchange.getOfferBook();

        // Check if the order book has one offer with the correct details
        expect(offerBook.length).to.equal(1);
        expect(offerBook[0].energyAmount).to.equal(1000);
        expect(offerBook[0].pricePerKWh).to.equal(50);
    });

    it("Should allow order submissions within the deadline", async function () {
        const {Exchange} = await loadFixture(deployTokenFixture);

        // Submit an offer
        await Exchange.submitOrder(1000, 10, "+040.7128", "-074.0060", "A");

        // Get the order book
        const orderBook = await Exchange.getOrderBook();

        // Check if the order book has one offer with the correct details
        expect(orderBook.length).to.equal(1);
        expect(orderBook[0].energyAmount).to.equal(1000);
    });

    it("Should reject offer submissions after the deadline", async function () {
        const {Exchange} = await loadFixture(deployTokenFixture);

        // Advance the blockchain's time by 5 minutes (300 seconds)
        await network.provider.send("evm_increaseTime", [300]);
        await network.provider.send("evm_mine");

        // Try to submit an offer and expect a revert
        await expect(
            Exchange.submitOffer(1000, 50, "+40.7128", "-74.0060", "A")
        ).to.be.revertedWith("Submission is not active");
    });

    it("Should be able to set order book", async function(){
        const {Exchange} = await loadFixture(deployTokenFixture);
        
        const input1 = [
            [
              '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
              1000,
              10,
              '+001.3143',
              '+103.7093',
              'A',
              'ETHE'
            ]
        ];

        const input2 = [
            [
              '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
              1000,
              10,
              '+001.3143',
              '+103.7093',
              'A',
              'ETHE'
            ],
            [
              'SDNMQG2MW2TMGRJXFBYMKRIL2XPXR7EGWOGQ7SKEMIYUEHCJOY2DI4IGSA',
              1000,
              10,
              '+001.3450',
              '+103.9832',
              'A',
              'ALGO'
            ]
        ];

        var input3:any = [];



        await Exchange.setOfferBook(input1);
        var output = await Exchange.getOfferBook();
        expect(output.length == 1);

        await Exchange.setOfferBook(input2);
        output = await Exchange.getOfferBook();
        expect(output.length == 2);

        await Exchange.setOfferBook(input3);
        output = await Exchange.getOfferBook();
        expect(output.length == 0);
    });


});

