/* eslint-disable no-unused-vars */
/* eslint-disable camelcase */
import chai, { expect } from "chai";
import { ethers, network, waffle } from "hardhat";

import { BigNumber } from "ethers";
import { parseEther } from "ethers/lib/utils";
import { solidity } from "ethereum-waffle";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import {
  SpaceCoinICO,
  SpaceCoinICO__factory,
  SpaceCoin,
  SpaceCoin__factory,
  SpaceCoinLP__factory,
  SpaceCoinLP,
  SpaceRouter__factory,
  SpaceRouter,
} from "../typechain";

chai.use(solidity);

const ONE_ETHER: BigNumber = parseEther("1");

describe("Liquidity Pool", () => {
  let deployer: SignerWithAddress;
  let treasury: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let addresses: SignerWithAddress[];

  let SpaceCoin: SpaceCoin__factory;
  let spaceCoin: SpaceCoin;
  let spaceCoinICO: SpaceCoinICO;
  let SpaceCoinLP: SpaceCoinLP__factory;
  let spaceCoinLP: SpaceCoinLP;
  let SpaceRouter: SpaceRouter__factory;
  let spaceRouter: SpaceRouter;

  const provider = ethers.provider;

  beforeEach(async () => {
    [deployer, treasury, alice, bob, ...addresses] = await ethers.getSigners();

    SpaceCoin = await ethers.getContractFactory("SpaceCoin");
    spaceCoin = (await SpaceCoin.deploy(
      "SpaceCoin",
      "SPC",
      treasury.address
    )) as SpaceCoin;
    await spaceCoin.deployed();

    spaceCoinICO = await ethers.getContractAt(
      "SpaceCoinICO",
      await spaceCoin.icoAccount()
    );

    SpaceCoinLP = await ethers.getContractFactory("SpaceCoinLP");
    spaceCoinLP = (await SpaceCoinLP.deploy(spaceCoin.address)) as SpaceCoinLP;
    await spaceCoinLP.deployed();

    SpaceRouter = await ethers.getContractFactory("SpaceRouter");
    spaceRouter = (await SpaceRouter.deploy(
      spaceCoin.address,
      spaceCoinLP.address
    )) as SpaceRouter;
    await spaceRouter.deployed();
  });

  describe("Space Coin", () => {
    it("withdraw", async () => {
      // ICO OPEN phase
      await spaceCoinICO.connect(deployer).moveToNextPhase(0);
      await spaceCoinICO.connect(deployer).moveToNextPhase(1);
      // Contribute from 10 different addresses
      const contributionAmountPerAddress = ONE_ETHER.mul(300);
      let totalContributionAmount: BigNumber = ONE_ETHER.mul(0);

      for (let i = 0; i < 10; i++) {
        await spaceCoinICO
          .connect(addresses[i])
          .contribute({ value: contributionAmountPerAddress });

        totalContributionAmount = totalContributionAmount.add(
          contributionAmountPerAddress
        );
      }

      const withdrawalAddress = alice.address;

      const initialBalance = await provider.getBalance(withdrawalAddress);
      // TODO: Figure out why alice.addrss works but not spaceCoinLP.address
      // await spaceCoinICO.connect(treasury).withdraw(spaceCoin.address);
      await spaceCoinICO.connect(treasury).withdraw(withdrawalAddress);

      const finalBalance = await provider.getBalance(withdrawalAddress);

      expect(finalBalance).to.be.equal(
        initialBalance.add(totalContributionAmount)
      );
    });
  });

  describe("SpaceCoin LP", () => {
    describe("deposit", () => {
      beforeEach(async () => {
        // ICO OPEN phase
        await spaceCoinICO.connect(deployer).moveToNextPhase(0);
        await spaceCoinICO.connect(deployer).moveToNextPhase(1);

        // Contribute from 10 different addresses
        for (let i = 0; i < 10; i++) {
          await spaceCoinICO
            .connect(addresses[i])
            .contribute({ value: ONE_ETHER.mul(300) });
        }

        await spaceCoinICO.connect(treasury).withdraw(treasury.address);
      });

      it("returns an error if the liquidity provided is only ETH (no SPC at all)", async () => {
        await expect(
          spaceCoinLP
            .connect(treasury)
            .deposit(treasury.address, { value: ONE_ETHER })
        ).to.be.revertedWith("NO_LIQUIDITY_TO_DEPOSIT");
      });
    });

    describe("swap", () => {
      it("returns an error if no liquidity being inputted", async () => {
        await expect(
          spaceCoinLP.connect(treasury).swap(treasury.address, 0, 0)
        ).to.be.revertedWith("ONE_INPUT_MUST_BE_NON_ZERO");
      });
    });

    describe("withdraw", () => {
      it("returns an error if not enough liquidity to withdraw", async () => {
        await expect(
          spaceCoinLP.connect(treasury).withdraw(treasury.address)
        ).to.be.revertedWith("NOT_ENOUGH_SUPPLY");
      });
    });
  });

  describe("SpaceRouter", () => {
    beforeEach(async () => {
      // ICO OPEN phase
      await spaceCoinICO.connect(deployer).moveToNextPhase(0);
      await spaceCoinICO.connect(deployer).moveToNextPhase(1);

      // Contribute from 10 different addresses
      for (let i = 0; i < 10; i++) {
        await spaceCoinICO
          .connect(addresses[i])
          .contribute({ value: ONE_ETHER.mul(300) });
      }

      await spaceCoinICO.connect(treasury).withdraw(treasury.address);
    });

    describe("addLiquidity", () => {
      it("could add liquidity to the pool", async () => {
        const liquiditySPCAmount = ONE_ETHER.mul(40);
        const liquidityETHAmount = ONE_ETHER.mul(8);

        const spcInitialBalance = await spaceCoin.balanceOf(treasury.address);

        // Add liquidity to the pool
        await spaceCoin
          .connect(treasury)
          .increaseAllowance(spaceRouter.address, ONE_ETHER.mul(100));
        await spaceRouter
          .connect(treasury)
          .addLiquidity(liquiditySPCAmount, { value: liquidityETHAmount });

        // SPC in treasury
        const spcTreasuryFinalBalance = await spaceCoin.balanceOf(
          treasury.address
        );
        expect(spcTreasuryFinalBalance).to.be.equal(
          spcInitialBalance.sub(liquiditySPCAmount)
        );

        // SPC in liquidity Pool
        const spcPoolBalance = await spaceCoin.balanceOf(spaceCoinLP.address);
        const spcReserve = await spaceCoinLP.reserveSPC();
        expect(spcPoolBalance).to.be.equal(liquiditySPCAmount);
        expect(spcReserve).to.be.equal(liquiditySPCAmount);

        // ETH in liquidity pool
        const ethPoolBalance = await provider.getBalance(spaceCoinLP.address);
        const ethReserve = await spaceCoinLP.reserveETH();
        expect(ethPoolBalance).to.equal(liquidityETHAmount);
        expect(ethReserve).to.equal(liquidityETHAmount);

        const lpToken = await spaceCoinLP.balanceOf(treasury.address);
        // TODO: Change to the actual amount

        // TODO: Figure out why the within doesn't accept big number even after  chai.use(solidity)
        // expect(lpToken).to.be.within(
        //   parseEther("0.1"),
        //   parseEther("6") // square root of liquiditySPCAmount * liquidityETHAmount e.g. 40 * 8 = 320. Square root of 320 is 17.88
        // );

        expect(lpToken).to.be.lt(parseEther("17.9")).and.gt(parseEther("0"));
      });
    });

    describe("swapToken", () => {
      beforeEach(async () => {
        const liquiditySPCAmount = ONE_ETHER.mul(50);
        const liquidityETHAmount = ONE_ETHER.mul(10);

        // Add liquidity to the pool
        await spaceCoin
          .connect(treasury)
          .increaseAllowance(spaceRouter.address, ONE_ETHER.mul(100));
        await spaceRouter
          .connect(treasury)
          .addLiquidity(liquiditySPCAmount, { value: liquidityETHAmount });
      });

      it("swaps ETH for SPC", async () => {
        /* Example:
         *
         *  10 eth   * 50 spc = 500 (k)
         *  --- User adds 5 ETH to the pool
         *   15 eth  * ? spc = 500 (k)
         *
         *  ? = 500 / 15 = 33.33 spc
         *  user gets 50 - 33.33 = 16.67 spc
         */

        const trader = addresses[0];

        const initialSPCBalance = await spaceCoin.balanceOf(trader.address);

        // TODO: Move this allowance somewhere else
        await spaceCoin
          .connect(trader)
          .increaseAllowance(spaceRouter.address, ONE_ETHER.mul(100));

        const minimumSPCOut = parseEther("15");

        await spaceRouter
          .connect(trader)
          .swapToken(0, 0, minimumSPCOut, { value: ONE_ETHER.mul(5) });

        // TODO: check this wei expect
        // await expect(() =>
        //   spaceRouter.connect(trader).swapToken(0, { value: ONE_ETHER.mul(5) })
        // ).to.changeEtherBalances([spaceCoinLP], [5]);

        const spcBalance = await spaceCoin.balanceOf(trader.address);

        expect(spcBalance.sub(initialSPCBalance))
          .to.be.lt(parseEther("16.67"))
          .and.gt(parseEther("16"));
      });

      it("swaps SPC for ETH", async () => {
        /* Example:
         *
         *  10 eth   * 50 spc = 500 (k)
         *  --- User adds 20 SPC to the pool
         *  ? eth  * 70 spc = 500 (k)
         *
         *  ? = 500 / 70 = 7.14 eth
         *  user gets 10 eth - 7.14 eth = 2.86 spc
         */

        const trader = addresses[0];

        const initialETHBalance = await provider.getBalance(trader.address);

        // TODO: Move this allowance somewhere else
        await spaceCoin
          .connect(trader)
          .increaseAllowance(spaceRouter.address, ONE_ETHER.mul(100));

        const spcAmount = ONE_ETHER.mul(20);

        const minimumETHOut = parseEther("1.5");

        await spaceRouter
          .connect(trader)
          .swapToken(spcAmount, minimumETHOut, 0);

        const ethBalance = await provider.getBalance(trader.address);

        expect(ethBalance.sub(initialETHBalance))
          .to.be.lt(parseEther("2.86"))
          .and.gt(parseEther("2"));
      });

      it("returns an error if ETH slippage is too high", async () => {
        /* Example:
         *
         *  10 eth   * 50 spc = 500 (k)
         *  --- User adds 20 SPC to the pool
         *  ? eth  * 70 spc = 500 (k)
         *
         *  ? = 500 / 70 = 7.14 eth
         *  user gets 10 eth - 7.14 eth = 2.86 spc
         */

        const trader = addresses[0];

        // TODO: Move this allowance somewhere else
        await spaceCoin
          .connect(trader)
          .increaseAllowance(spaceRouter.address, ONE_ETHER.mul(100));

        const spcAmount = ONE_ETHER.mul(20);
        const minimumETHOut = parseEther("3");

        await expect(
          spaceRouter.connect(trader).swapToken(spcAmount, minimumETHOut, 0)
        ).to.be.revertedWith("TOO_HIGH_ETH_SLIPPAGE");
      });
    });

    describe("removeLiquidity", () => {
      it("removes liquidity from the pool", async () => {
        const liquiditySPCAmount = ONE_ETHER.mul(40);
        const liquidityETHAmount = ONE_ETHER.mul(8);

        // Add liquidity to the pool
        await spaceCoin
          .connect(treasury)
          .increaseAllowance(spaceRouter.address, ONE_ETHER.mul(100));
        await spaceRouter
          .connect(treasury)
          .addLiquidity(liquiditySPCAmount, { value: liquidityETHAmount });

        const lpToken = await spaceCoinLP.balanceOf(treasury.address);
        const initialSPCBalance = await spaceCoin.balanceOf(treasury.address);

        const spcReturned = lpToken
          .mul(await spaceCoinLP.reserveSPC())
          .div(await spaceCoinLP.totalSupply());

        // Remove Liquidity from the pool
        await spaceRouter.connect(treasury).removeLiquidity();

        // SPC in treasury
        const spcTreasuryFinalBalance = await spaceCoin.balanceOf(
          treasury.address
        );
        expect(spcTreasuryFinalBalance.sub(initialSPCBalance)).to.be.eq(
          spcReturned
        );

        // SPC in liquidity Pool
        const spcPoolBalance = await spaceCoin.balanceOf(spaceCoinLP.address);
        const spcReserve = await spaceCoinLP.reserveSPC();
        expect(spcPoolBalance).to.be.lt(liquiditySPCAmount).and.gt(0);
        expect(spcReserve).to.be.lt(liquiditySPCAmount).and.gt(0);

        // // ETH in liquidity pool
        const ethPoolBalance = await provider.getBalance(spaceCoinLP.address);
        const ethReserve = await spaceCoinLP.reserveETH();
        expect(ethPoolBalance).to.lt(liquidityETHAmount).and.gt(0);
        expect(ethReserve).to.lt(liquidityETHAmount).and.gt(0);

        const finalLpToken = await spaceCoinLP.balanceOf(treasury.address);
        expect(finalLpToken).to.be.equal(0);
      });
    });
  });
});
