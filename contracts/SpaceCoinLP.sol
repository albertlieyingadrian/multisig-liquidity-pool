//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import "./SpaceCoin.sol";

import "hardhat/console.sol";

contract SpaceCoinLP is ERC20, Ownable {
    SpaceCoin spaceCoin;

    uint256 public reserveETH;
    uint256 public reserveSPC;

    uint256 public constant MINIMUM_LP_TOKEN = 10**3;
    uint256 public constant FEE_IN_PERCENTAGE = 1; // 1%

    constructor(SpaceCoin _spaceCoin) ERC20("SpaceCoin LP", "SpaceCoin-LP") Ownable() {
        spaceCoin = _spaceCoin;
    }

    function deposit(address liquidityProvider) external payable {
        uint256 lpToken;
        uint256 eth = address(this).balance - reserveETH;
        uint256 spc = spaceCoin.balanceOf(address(this)) - reserveSPC;
        require(eth > 0 && spc > 0, "NO_LIQUIDITY_TO_DEPOSIT");

        uint256 _totalSupply = totalSupply();

        if (_totalSupply == 0) {
            // First deposit
            lpToken = _sqrt(eth * spc) - MINIMUM_LP_TOKEN;
            // TODO: Figure out the revert reason: 'ERC20: mint to the zero address'
            _mint(address(1), MINIMUM_LP_TOKEN);
        } else {
            lpToken = _min(
                (_totalSupply * eth) / reserveETH,
                (_totalSupply * spc) / reserveSPC
            );
        }

        require(lpToken > 0, "NOT_ENOUGH_LP_TOKEN");
        _mint(liquidityProvider, lpToken);

        _update();
        // TODO: Emit event
    }

    function swap(
        address trader,
        uint256 minimumETHOut,
        uint256 minimumSPCOut
    ) external payable {
        uint256 eth = address(this).balance - reserveETH;
        uint256 spc = spaceCoin.balanceOf(address(this)) - reserveSPC;

        uint256 amountOut = _calculateAmountOut(eth, spc);
        require(amountOut > 0, "NOT_ENOUGH_LIQUIDITY_TO_SWAP");

        if (eth > 0) {
            require(amountOut >= minimumSPCOut, "TOO_HIGH_SPC_SLIPPAGE");

            spaceCoin.transfer(trader, amountOut);
        } else {
            require(amountOut >= minimumETHOut, "TOO_HIGH_ETH_SLIPPAGE");

            (bool success, ) = trader.call{value: amountOut}("");
            require(success, "FAILED_TRANSFER");
        }

        _update();
    }

    function withdraw(address liquidityProvider) external {
        uint256 lpToken = balanceOf(liquidityProvider);

        require(totalSupply() > 0, "NOT_ENOUGH_SUPPLY");
        uint256 eth = (reserveETH * lpToken) / totalSupply();
        uint256 spc = (reserveSPC * lpToken) / totalSupply();
        require(eth > 0 && spc > 0, "NO_LIQUIDITY_TO_WITHDRAW");

        _burn(liquidityProvider, lpToken);

        spaceCoin.transfer(liquidityProvider, spc);

        (bool success, ) = liquidityProvider.call{value: eth}("");
        require(success, "FAILED_TRANSFER");

        _update();
    }

    function _update() private {
        reserveETH = address(this).balance;
        reserveSPC = IERC20(spaceCoin).balanceOf(address(this));
        // TODO: Emit event
    }

    function _sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    function _min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    function _calculateAmountOut(uint256 eth, uint256 spc)
        internal
        view
        returns (uint256 amountOut)
    {
        require(
            (eth > 0 || spc > 0) && (eth == 0 || spc == 0),
            "ONE_INPUT_MUST_BE_NON_ZERO"
        );

        uint256 k = reserveETH * reserveSPC;

        if (eth > 0) {
            uint256 fee = (eth * FEE_IN_PERCENTAGE) / 100;
            uint256 newSPC = k / (reserveETH + (eth - fee));

            amountOut = reserveSPC - newSPC;
        } else {
            uint256 fee = (spc * FEE_IN_PERCENTAGE) / 100;
            uint256 newETH = k / (reserveSPC + (spc - fee));

            amountOut = reserveETH - newETH;
        }
    }
}
