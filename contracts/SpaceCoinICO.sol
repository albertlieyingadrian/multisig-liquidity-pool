//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

import "./SpaceCoin.sol";

import "hardhat/console.sol";

contract SpaceCoinICO is Ownable {
    uint256 public constant TOKEN_RATE = 5;

    // address public owner;
    address public immutable treasury;

    enum Phase {
        SEED,
        GENERAL,
        OPEN
    }

    Phase public phase;

    bool public resumed = true;

    SpaceCoin immutable spaceCoin;

    mapping(address => bool) public whitelistedInvestors;

    // Ether held by the contract on behalf of contributors/investors
    mapping(address => uint256) public contributionOf;

    // Change back to real number
    uint256 public constant SEED_PHASE_THRESHOLD = 15000 ether;
    uint256 public constant SEED_INVESTOR_THRESHOLD = 1500 ether;
    uint256 public constant GENERAL_PHASE_THRESHOLD = 30000 ether;
    uint256 public constant GENERAL_INVESTOR_THRESHOLD = 1000 ether;

    uint256 public totalContributions;

    // modifier onlyOwner() {
    //     require(
    //         msg.sender == owner,
    //         "This operation could only be done by the owner"
    //     );
    //     _;
    // }

    constructor(
        address _owner,
        SpaceCoin _spaceCoin,
        address _treasury
    ) Ownable() {
        transferOwnership(_owner);
        spaceCoin = _spaceCoin;
        treasury = _treasury;
    }

    function moveToNextPhase(Phase currentPhase) external onlyOwner {
        require(phase == currentPhase, "Wrong phase");
        phase = Phase(uint256(currentPhase) + 1);

        emit PhaseAdvanced();
    }

    // true: resume, false: paused
    function resumeFunding(bool state) external onlyOwner {
        resumed = state;
    }

    function checkContributionPhaseAvailability()
        public
        view
        returns (uint256 availableContribution)
    {
        if (phase == Phase.SEED) {
            return SEED_PHASE_THRESHOLD - totalContributions;
        } else if (phase == Phase.GENERAL) {
            return GENERAL_PHASE_THRESHOLD - totalContributions;
        } else {
            // TODO: Change the hardcoded amount
            // return 150000 ether / TOKEN_RATE - totalContributions;
            return 30_000 ether - totalContributions;
        }
    }

    function checkContributionInvestorAvailability()
        public
        view
        returns (uint256 availableContribution)
    {
        uint256 currentContribution = contributionOf[msg.sender];
        uint256 phaseAvailableContribution = checkContributionPhaseAvailability();

        if (phase == Phase.SEED) {
            uint256 limit = Math.min(
                phaseAvailableContribution,
                SEED_INVESTOR_THRESHOLD
            );

            return limit - currentContribution;
        } else if (phase == Phase.GENERAL) {
            uint256 limit = Math.min(
                phaseAvailableContribution,
                GENERAL_INVESTOR_THRESHOLD
            );

            return limit - currentContribution;
        } else {
            return phaseAvailableContribution;
        }
    }

    function contribute() external payable {
        require(resumed, "ICO is paused");

        if (phase == Phase.SEED) {
            require(
                whitelistedInvestors[msg.sender],
                "Investor is not whitelisted"
            );
        }

        uint256 availableContribution = checkContributionInvestorAvailability();
        require(availableContribution >= msg.value, "Could not exceed limit");

        contributionOf[msg.sender] += msg.value;
        totalContributions += msg.value;

        emit ContributionMade(msg.sender, msg.value);

        if (phase == Phase.OPEN) {
            redeem();
        }
    }

    function redeem() public {
        require(phase == Phase.OPEN, "Phase is not OPEN yet");
        require(contributionOf[msg.sender] > 0, "Not enough balance to redeem");

        uint256 redeemedAmount = contributionOf[msg.sender] * TOKEN_RATE;
        contributionOf[msg.sender] = 0;

        spaceCoin.transfer(msg.sender, redeemedAmount);

        emit RedeemMade(msg.sender, redeemedAmount);
    }

    function withdraw(address to) external {
        require(msg.sender == treasury, "Not authorized to withdraw");
        require(phase == Phase.OPEN, "Phase is not OPEN yet");

        uint256 amount = address(this).balance;
        totalContributions -= amount;

        (bool success, ) = address(to).call{value: amount}("");
        require(success, "Withdrawal failed");

        // emit WithdrawalMade(msg.sender, amount);
    }

    function modifyWhitelistedInvestors(
        address[] memory addresses,
        bool whitelisted
    ) external onlyOwner {
        for (uint256 i = 0; i < addresses.length; i++) {
            whitelistedInvestors[addresses[i]] = whitelisted;
        }
    }

    event PhaseAdvanced();
    event ContributionMade(address indexed contributor, uint256 amount);
    event RedeemMade(address indexed contributor, uint256 amount);
}
