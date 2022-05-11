//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./SpaceCoinLP.sol";

contract SpaceRouter {
    SpaceCoin spaceCoin;
    SpaceCoinLP spaceCoinLP;

    constructor(SpaceCoin _spaceCoin, SpaceCoinLP _spaceCoinLP) {
        spaceCoin = _spaceCoin;
        spaceCoinLP = _spaceCoinLP;
    }

    function addLiquidity(uint256 spcAmount) external payable {
        spaceCoin.transferFrom(msg.sender, address(spaceCoinLP), spcAmount);

        spaceCoinLP.deposit{value: msg.value}(msg.sender);
    }

    // TODO: Add slippage capability
    function swapToken(
        uint256 spcAmount,
        uint256 minimumETHOut,
        uint256 minimumSPCOut
    ) external payable {
        // TODO: Add require only one coin could be swapped at a time

        if (spcAmount > 0) {
            // Swapping SPC for ETH
            spaceCoin.transferFrom(msg.sender, address(spaceCoinLP), spcAmount);
            spaceCoinLP.swap(msg.sender, minimumETHOut, minimumSPCOut);
        } else {
            // Swapping ETH for SPC
            uint256 ethAmount = msg.value;
            spaceCoinLP.swap{value: ethAmount}(
                msg.sender,
                minimumETHOut,
                minimumSPCOut
            );
        }
    }

    function removeLiquidity() external {
        spaceCoinLP.withdraw(msg.sender);
    }
}
