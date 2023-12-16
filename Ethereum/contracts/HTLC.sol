// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract HashedTimelockContract {
    enum State { Created, Locked, Unlocked, TimelockExpired }
    State public state;

    address public immutable sender;
    address public immutable receiver;
    bytes32 public immutable hashlock;
    uint256 public immutable timelock;

    IERC20 public immutable token;
    uint256 public immutable tokenAmount;

    bytes32 private key;

    constructor(address _receiver, bytes32 _hashlock, uint256 _timelock, address _token, uint256 _tokenamount) {
        require(IERC20(_token).totalSupply() > 0, "Invalid ERC-20 token address");
        require(IERC20(_token).balanceOf(msg.sender) >= _tokenamount, "You do not have enough token balance");

        sender = msg.sender;
        receiver = _receiver;

        hashlock = _hashlock;
        timelock = _timelock;

        token = IERC20(_token);
        tokenAmount = _tokenamount;

        state = State.Created;
    }

    modifier onlySender() {
        require(msg.sender == sender, "Only the sender can call this function");
        _;
    }

    modifier onlyReceiver() {
        require(msg.sender == receiver, "Only the receiver can call this function");
        _;
    }

    function lock() public onlySender {
        require(state == State.Created, "HTLC is not in the Created state");
        token.transferFrom(msg.sender, address(this), tokenAmount);
        state = State.Locked;
    }

    function unlock(bytes32 _preimage) public onlyReceiver {
        require(state == State.Locked, "HTLC is not in the Locked state");
        require(keccak256(abi.encodePacked(_preimage)) == hashlock, "Preimage does not match the hashlock");
        require(token.transfer(msg.sender, tokenAmount));
        key = _preimage;
        state = State.Unlocked;
    }

    function refund() public onlySender {
        require(state == State.Created || state == State.Locked, "HTLC is not in a refundable state");
        require(block.timestamp >= timelock, "Timelock not expired yet");
        require(token.transfer(msg.sender, tokenAmount));
        state = State.TimelockExpired;
    }

    function getKey() public view onlySender returns(bytes32) {
        require(state == State.Unlocked, "HTLC is not in the Unlocked state");
        return key;
    }
}
