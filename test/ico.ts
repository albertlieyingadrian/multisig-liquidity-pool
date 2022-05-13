/* eslint-disable no-unused-vars */
import chai, { expect } from "chai";
import { ethers, network, waffle } from "hardhat";
import { BigNumber } from "ethers";
import { solidity } from "ethereum-waffle";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import {
  SpaceCoinICO,
  SpaceCoinICO__factory,
  SpaceCoin,
  SpaceCoin__factory,
} from "../typechain";

chai.use(solidity);

const provider = waffle.provider;

// Separating these variables because they are not always in the same decimal points
const ONE_TOKEN: BigNumber = ethers.utils.parseEther("1");
const ONE_ETHER: BigNumber = ethers.utils.parseEther("1");
const TOKEN_RATE = 5;

describe("SpaceCoin", () => {
  describe("Token Contract", () => {
    // eslint-disable-next-line camelcase
    let deployer: SignerWithAddress;
    let treasury: SignerWithAddress;
    let alice: SignerWithAddress;
    let bob: SignerWithAddress;

    let SpaceCoin: SpaceCoin__factory;
    let spaceCoin: SpaceCoin;

    beforeEach(async () => {
      [deployer, treasury, alice, bob] = await ethers.getSigners();

      SpaceCoin = await ethers.getContractFactory("SpaceCoin");
      spaceCoin = (await SpaceCoin.deploy(
        "SpaceCoin",
        "SPC",
        treasury.address
      )) as SpaceCoin;
      await spaceCoin.deployed();
    });

    it("Is named SpaceCoin", async () => {
      expect(await spaceCoin.name()).to.equal("SpaceCoin");
    });

    it("Is represented by symbol SPC", async () => {
      expect(await spaceCoin.symbol()).to.equal("SPC");
    });

    it("Has a total supply of 500,000 SPC", async () => {
      expect(await spaceCoin.totalSupply()).to.equal(ONE_TOKEN.mul(500_000));
    });

    it("Allocates 150,000 SPC of supply to ICO investors (30,000 ETH)", async () => {
      const accountAddress = await spaceCoin.icoAccount();

      expect(await spaceCoin.balanceOf(accountAddress)).to.equal(
        ONE_TOKEN.mul(150_000)
      );
    });

    it("Stores the remaining 350,000 SPC of supply in the treasury", async () => {
      const accountAddress = await spaceCoin.treasuryAccount();

      expect(await spaceCoin.balanceOf(accountAddress)).to.equal(
        ONE_TOKEN.mul(350_000)
      );
    });

    it("Allows owners to toggle on/off a 2% tax for transfers into the treasury account", async () => {
      await spaceCoin.connect(deployer).toggleTax(true);

      expect(await spaceCoin.taxApplied()).to.equal(true);
    });

    it("Prevent non-owners from toggling on/off a 2% tax", async () => {
      await expect(spaceCoin.connect(alice).toggleTax(true)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it.skip("Defaults to no tax charged for SPC transfers", async () => {
      // const initialBalance = await spaceCoin.balanceOf(treasury.address);
      // const icoAccount = await spaceCoin.icoAccount();
      // console.log("ico account", icoAccount);
      // console.log(await spaceCoin.balanceOf(icoAccount));
      // console.log("icoAccount", icoAccount);
      // console.log("initial balance", initialBalance);
      // console.log("deployer address", deployer.address);
      // await spaceCoin._transfer(icoAccount, bob.address, 200);
      // expect(await spaceCoin.balanceOf(treasury.address)).to.equal(
      //   initialBalance
      // );
    });

    it.skip("Charges 2% for SPC transfers (deposited into the treasury) when tax is toggled on", async () => {
      // const initialBalance = await spaceCoin.balanceOf(treasury.address);
      // const transferAmount = 200;
      // const tax = (transferAmount * 2) / 100;
      // await spaceCoin.connect(deployer).toggleTax(true);
      // await spaceCoin.connect(deployer).transfer(bob.address, 200);
      // expect(await spaceCoin.balanceOf(treasury.address)).to.equal(
      //   initialBalance.add(tax)
      // );
    });
  });

  describe("ICO Contract", () => {
    let deployer: SignerWithAddress;
    let treasury: SignerWithAddress;
    let alice: SignerWithAddress;
    let bob: SignerWithAddress;
    let investorA: SignerWithAddress;
    let investorB: SignerWithAddress;

    let SpaceCoin: SpaceCoin__factory;
    let spaceCoin: SpaceCoin;
    let spaceCoinICO: SpaceCoinICO;

    beforeEach(async () => {
      [deployer, alice, bob, treasury, investorA, investorB] =
        await ethers.getSigners();

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
      await spaceCoinICO.connect(deployer).transferOwnership(deployer.address);
    });

    describe("Deployment", () => {
      it("Deploys a contract", async () => {
        // eslint-disable-next-line no-unused-expressions
        expect(spaceCoinICO.address).to.be.ok;
      });

      it.skip("Allows owner to set SpaceCoin address one time only", async () => {});

      it.skip("Prevents non-owners from setting SpaceCoin address", async () => {});
    });

    describe("Management", () => {
      it("Allows owner to advance phase forward", async () => {
        await spaceCoinICO.connect(deployer).moveToNextPhase(0);

        expect(await spaceCoinICO.phase()).to.equal(1);
      });

      it("Prevents non-owners from advancing phase forward", async () => {
        await expect(
          spaceCoinICO.connect(alice).moveToNextPhase(0)
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });

      it("Emits a PhaseAdvance event after phase is advanced forward", async () => {
        const txReceiptUnresolved = await spaceCoinICO.moveToNextPhase(0);
        const txReceipt = await txReceiptUnresolved.wait();

        expect(txReceipt.events![0].event).to.equal("PhaseAdvanced");
      });

      it("Allows owner to pause or resume funding at any time", async () => {
        await spaceCoinICO.connect(deployer).resumeFunding(false);

        expect(await spaceCoinICO.resumed()).to.equal(false);
      });

      it("Prevent non-owners from pausing or resuming funding at any time", async () => {
        await expect(
          spaceCoinICO.connect(alice).resumeFunding(true)
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });

      it("Allows owner to add seed investors to the whitelist", async () => {
        const investorAddrresses = [investorA.address, investorB.address];

        await spaceCoinICO
          .connect(deployer)
          .modifyWhitelistedInvestors(investorAddrresses, true);

        expect(
          await spaceCoinICO.whitelistedInvestors(investorA.address)
        ).to.equal(true);
        expect(
          await spaceCoinICO.whitelistedInvestors(investorB.address)
        ).to.equal(true);
      });

      it("Allows owner to remove seed investors from the whitelist", async () => {
        const investorAddrresses = [investorA.address, investorB.address];

        await spaceCoinICO
          .connect(deployer)
          .modifyWhitelistedInvestors(investorAddrresses, true);

        await spaceCoinICO
          .connect(deployer)
          .modifyWhitelistedInvestors(investorAddrresses, false);

        expect(
          await spaceCoinICO.whitelistedInvestors(investorA.address)
        ).to.equal(false);
        expect(
          await spaceCoinICO.whitelistedInvestors(investorB.address)
        ).to.equal(false);
      });

      it("Prevent non-owners from adding a single seed investor to the whitelist", async () => {
        const investorAddrresses = [investorA.address, investorB.address];

        await expect(
          spaceCoinICO
            .connect(bob)
            .modifyWhitelistedInvestors(investorAddrresses, true)
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });

      it("Prevent non-owners from removing a single seed investor from the whitelist", async () => {
        const investorAddrresses = [investorA.address, investorB.address];
        await spaceCoinICO
          .connect(deployer)
          .modifyWhitelistedInvestors(investorAddrresses, true);

        await expect(
          spaceCoinICO
            .connect(bob)
            .modifyWhitelistedInvestors(investorAddrresses, false)
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });
    });

    describe("Contributions & Redemptions", () => {
      describe("Seed Phase", () => {
        beforeEach(async () => {
          const investorAddrresses = [investorA.address, investorB.address];

          await spaceCoinICO
            .connect(deployer)
            .modifyWhitelistedInvestors(investorAddrresses, true);
        });

        it("Allows contributions from whitelisted investors", async () => {
          await spaceCoinICO
            .connect(investorA)
            .contribute({ value: ONE_ETHER.mul(20) });

          expect(
            await spaceCoinICO.contributionOf(investorA.address)
          ).to.be.equal(ONE_ETHER.mul(20));
        });

        it("Blocks contributions above individual limit from whitelisted investors", async () => {
          await expect(
            spaceCoinICO
              .connect(investorA)
              .contribute({ value: ONE_ETHER.mul(1600) })
          ).to.be.revertedWith("Could not exceed limit");
        });

        it("Blocks contributions above founding round limit from whitelisted investors", async () => {
          await expect(
            spaceCoinICO
              .connect(investorA)
              .contribute({ value: ONE_ETHER.mul(1600) })
          ).to.be.revertedWith("Could not exceed limit");
        });

        it("Blocks contributions from non-whitelisted investors", async () => {
          await spaceCoinICO
            .connect(deployer)
            .modifyWhitelistedInvestors([investorA.address], false);

          await expect(
            spaceCoinICO
              .connect(investorA)
              .contribute({ value: ONE_ETHER.mul(2) })
          ).to.be.revertedWith("Investor is not whitelisted");
        });

        it("Emits a Contribute event after a contribution is made from a whitelisted investor", async () => {
          const txReceiptUnresolved = await spaceCoinICO
            .connect(investorA)
            .contribute({ value: ONE_ETHER.mul(20) });
          const txReceipt = await txReceiptUnresolved.wait();

          expect(txReceipt.events![0].event).to.equal("ContributionMade");
        });

        it("Blocks contributions when fundraising is paused", async () => {
          await spaceCoinICO.connect(deployer).resumeFunding(false);

          await expect(
            spaceCoinICO
              .connect(investorA)
              .contribute({ value: ONE_ETHER.mul(2) })
          ).to.be.revertedWith("ICO is paused");
        });

        it("Prevents token redemptions", async () => {
          await expect(
            spaceCoinICO.connect(investorA).redeem()
          ).to.be.revertedWith("Phase is not OPEN yet");
        });
      });

      describe("General Phase", () => {
        beforeEach(async () => {
          const investorAddrresses = [investorA.address, investorB.address];

          await spaceCoinICO
            .connect(deployer)
            .modifyWhitelistedInvestors(investorAddrresses, true);

          await spaceCoinICO.connect(deployer).moveToNextPhase(0);
        });

        it("Allows contributions from whitelisted investors", async () => {
          await spaceCoinICO
            .connect(investorA)
            .contribute({ value: ONE_ETHER.mul(20) });

          expect(
            await spaceCoinICO.contributionOf(investorA.address)
          ).to.be.equal(ONE_ETHER.mul(20));
        });

        it("Allows contributions from non-whitelisted investors", async () => {
          await spaceCoinICO
            .connect(deployer)
            .modifyWhitelistedInvestors([investorA.address], false);

          await spaceCoinICO
            .connect(investorA)
            .contribute({ value: ONE_ETHER.mul(20) });

          expect(
            await spaceCoinICO.contributionOf(investorA.address)
          ).to.be.equal(ONE_ETHER.mul(20));
        });

        it("Blocks contributions from seed investors who are already above general individual limit", async () => {
          await spaceCoinICO
            .connect(investorA)
            .contribute({ value: ONE_ETHER.mul(990) });

          await expect(
            spaceCoinICO
              .connect(investorA)
              .contribute({ value: ONE_ETHER.mul(20) })
          ).to.be.revertedWith("Could not exceed limit");
        });

        it("Blocks contributions above individual limit", async () => {
          await expect(
            spaceCoinICO
              .connect(investorA)
              .contribute({ value: ONE_ETHER.mul(1001) })
          ).to.be.revertedWith("Could not exceed limit");
        });

        it("Blocks contributions above funding round limit", async () => {
          await expect(
            spaceCoinICO
              .connect(investorA)
              .contribute({ value: ONE_ETHER.mul(3000) })
          ).to.be.revertedWith("Could not exceed limit");
        });

        it("Emits a Contribute event after a contribution is made", async () => {
          const txReceiptUnresolved = await spaceCoinICO
            .connect(investorA)
            .contribute({ value: ONE_ETHER.mul(20) });
          const txReceipt = await txReceiptUnresolved.wait();

          expect(txReceipt.events![0].event).to.equal("ContributionMade");
        });

        it("Blocks contributions when fundraising is paused", async () => {
          await spaceCoinICO.connect(deployer).resumeFunding(false);

          await expect(
            spaceCoinICO
              .connect(investorA)
              .contribute({ value: ONE_ETHER.mul(2) })
          ).to.be.revertedWith("ICO is paused");
        });

        it("Prevents token redemptions", async () => {
          await expect(
            spaceCoinICO.connect(investorA).redeem()
          ).to.be.revertedWith("Phase is not OPEN yet");
        });
      });

      describe("Open Phase", () => {
        beforeEach(async () => {
          const investorAddrresses = [investorA.address, investorB.address];

          await spaceCoinICO
            .connect(deployer)
            .modifyWhitelistedInvestors(investorAddrresses, true);

          await spaceCoinICO.connect(deployer).moveToNextPhase(0);
          await spaceCoinICO.connect(deployer).moveToNextPhase(1);
        });

        it("Automatically redeems new contributions for tokens", async () => {
          await spaceCoinICO
            .connect(investorA)
            .contribute({ value: ONE_ETHER.mul(20) });

          expect(await spaceCoin.balanceOf(investorA.address)).to.be.equal(
            ONE_ETHER.mul(20).mul(TOKEN_RATE)
          );
        });

        it.skip("Blocks contributions above funding round limit", async () => {
          await expect(
            spaceCoinICO
              .connect(investorA)
              .contribute({ value: ONE_ETHER.mul(30000) })
          ).to.be.revertedWith("Could not exceed limit");
        });

        it("Emits a Contribute event after a contribution is made", async () => {
          const txReceiptUnresolved = await spaceCoinICO
            .connect(investorA)
            .contribute({ value: ONE_ETHER.mul(20) });
          const txReceipt = await txReceiptUnresolved.wait();

          expect(txReceipt.events![0].event).to.equal("ContributionMade");
        });

        it.skip("Blocks contributions when fundraising is paused", async () => {
          await spaceCoinICO.connect(deployer).resumeFunding(false);

          await expect(
            spaceCoinICO
              .connect(investorA)
              .contribute({ value: ONE_ETHER.mul(2) })
          ).to.be.revertedWith("ICO is paused");
        });

        it.skip("Allows pre-open phase contributions to be redeemed for tokens", async () => {});

        it("Emits a Redeem event after tokens are redeemed", async () => {
          const txReceiptUnresolved = await spaceCoinICO
            .connect(investorA)
            .contribute({ value: ONE_ETHER.mul(20) });
          const txReceipt = await txReceiptUnresolved.wait();

          expect(txReceipt.events![2].event).to.equal("RedeemMade");
        });

        // TODO: not sure what this means
        it.skip("Prevents unearned token redemptions", async () => {});
      });
    });
  });
});
