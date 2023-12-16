const { expect } = require("chai");
const { network, ethers , provider} = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const assert = require('assert');


describe("Exchange", function () {
    async function deployTokenFixture() {
        const [owner, addr1, addr2] = await ethers.getSigners();
        const duration = 300;
        const Exchange = await ethers.deployContract("Exchange", [duration], owner);
        await Exchange.waitForDeployment();
        return {Exchange, owner, duration, addr1, addr2};
    };

    it("Should allow offer submissions within the deadline", async function () {
        const {Exchange} = await loadFixture(deployTokenFixture);

        // Submit an offer
        await Exchange.submitOffer(1000, 50, "+40.7128", "-74.0060", "A")

        // Get the order book
        const orderBook = await Exchange.getOrderBook();

        // Check if the order book has one offer with the correct details
        expect(orderBook.length).to.equal(1);
        expect(orderBook[0].energyAmount).to.equal(1000);
        expect(orderBook[0].pricePerKWh).to.equal(50);
    });

    it("Should reject offer submissions after the deadline", async function () {
        const {Exchange} = await loadFixture(deployTokenFixture);

        // Advance the blockchain's time by 5 minutes (300 seconds)
        await network.provider.send("evm_increaseTime", [300]);
        await network.provider.send("evm_mine");

        // Try to submit an offer and expect a revert
        await expect(
            Exchange.submitOffer(1000, 50, "+40.7128", "-74.0060", "A")
        ).to.be.revertedWith("Offer submission period has ended.");
    });

    // it("Should sort offers correctly (price)", async function () {
    //     const {Exchange, owner, duration, addr1, addr2} = await loadFixture(deployTokenFixture);

    //     // Submit different offers
    //     await Exchange.connect(addr1).submitOffer(1000, 30); // 1000 kWh at 30 Wei
    //     await Exchange.connect(addr2).submitOffer(500, 50);  // 500 kWh at 50 Wei
    //     await Exchange.connect(addr1).submitOffer(200, 40);  // 200 kWh at 40 Wei

    //     // Get the sorted order book
    //     const orderBook = await Exchange.getOrderBook();

    //     // Check if the order book is sorted by price per kWh in ascending order
    //     expect(orderBook[0].pricePerKWh).to.be.lessThanOrEqual(orderBook[1].pricePerKWh);
    //     expect(orderBook[1].pricePerKWh).to.be.lessThanOrEqual(orderBook[2].pricePerKWh);
    // });

    // it("Should sort offers correctly (amount)", async function () {
    //     const {Exchange, owner, duration, addr1, addr2} = await loadFixture(deployTokenFixture);

    //     // Submit different offers
    //     await Exchange.connect(addr1).submitOffer(1000, 30); // 1000 kWh at 30 Wei
    //     await Exchange.connect(addr2).submitOffer(500, 30);  // 500 kWh at 30 Wei
    //     await Exchange.connect(addr1).submitOffer(200, 30);  // 200 kWh at 30 Wei

    //     // Get the sorted order book
    //     const orderBook = await Exchange.getOrderBook();

    //     // Check if the order book is sorted by energy amount in descending order
    //     expect(orderBook[0].pricePerKWh).to.be.lessThanOrEqual(orderBook[1].energyAmount);
    //     expect(orderBook[1].pricePerKWh).to.be.lessThanOrEqual(orderBook[2].energyAmount);
    // });

    // it("Should sort offers correctly (earlier)", async function () {
    //     const {Exchange, owner, duration, addr1, addr2} = await loadFixture(deployTokenFixture);

    //     // Submit different offers
    //     await Exchange.connect(addr1).submitOffer(1000, 30); // 1000 kWh at 30 Wei
    //     await Exchange.connect(addr2).submitOffer(1000, 30); // 1000 kWh at 30 Wei
    //     await Exchange.connect(addr1).submitOffer(1000, 30); // 1000 kWh at 30 Wei

    //     // Get the sorted order book
    //     const orderBook = await Exchange.getOrderBook();

    //     // Check if the order book is sorted by timestamp in ascending order
    //     expect(orderBook[0].producer).to.be.equal(addr1.address);
    //     expect(orderBook[1].producer).to.be.equal(addr2.address);
    //     expect(orderBook[2].producer).to.be.equal(addr1.address);
    // });



});

