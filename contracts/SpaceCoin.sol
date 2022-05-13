//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./SpaceCoinICO.sol";

// import "hardhat/console.sol";

contract SpaceCoin is ERC20, Ownable {
    uint256 public constant ONE_TOKEN = 10**18;
    uint256 public constant MAX_TOTAL_SUPPLY = 500000 * ONE_TOKEN;
    uint256 public constant ICO_AMOUNT = 30000 * 5 * ONE_TOKEN;

    // address public owner;
    address public icoAccount;
    address public treasuryAccount;

    bool public taxApplied;

    constructor(
        string memory name,
        string memory symbol,
        address _treasuryAccount
    ) public Ownable() ERC20(name, symbol) {
        // owner = msg.sender;

        treasuryAccount = _treasuryAccount;
        icoAccount = address(new SpaceCoinICO(msg.sender, this, treasuryAccount));

        uint256 icoAmount = ICO_AMOUNT;

        _mint(icoAccount, icoAmount);
        _mint(treasuryAccount, MAX_TOTAL_SUPPLY - icoAmount);
    }

    // modifier onlyOwner() {
    //     require(
    //         msg.sender == owner,
    //         "This operation could only be done by the owner"
    //     );
    //     _;
    // }

    function _transfer(
        address sender,
        address beneficiary,
        uint256 amount
    ) internal virtual override {
        if (taxApplied) {
            uint256 tax = (amount * 2) / 100;
            amount -= tax;
            super._transfer(sender, treasuryAccount, tax);
        }

        super._transfer(sender, beneficiary, amount);
    }

    function toggleTax(bool _taxApplied) external onlyOwner {
        taxApplied = _taxApplied;
    }
}
