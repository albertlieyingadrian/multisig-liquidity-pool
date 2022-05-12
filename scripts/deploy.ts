import { ethers } from "hardhat";

// TODO: Check idempotency for each run
async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');
  const [deployer, treasury] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // TODO: Create a separate treasury account
  console.log("Treasury address", treasury.address);

  // We get the contract to deploy
  const SpaceCoin = await ethers.getContractFactory("SpaceCoin");
  const spaceCoin = await SpaceCoin.deploy(
    "SpaceCoin",
    "SPC",
    treasury.address
  );
  await spaceCoin.deployed();

  console.log("SpaceCoin deployed to:", spaceCoin.address);
  console.log("SpaceCoinICO deployed to:", await spaceCoin.icoAccount());

  // Liquidity Pool - SpaceLP
  const SpaceCoinLP = await ethers.getContractFactory("SpaceCoinLP");
  const spaceCoinLP = await SpaceCoinLP.deploy(spaceCoin.address);
  await spaceCoinLP.deployed();

  console.log("SpaceCoinLP Pool deployed to:", spaceCoinLP.address);

  // Space Router
  const SpaceRouter = await ethers.getContractFactory("SpaceRouter");
  const spaceRouter = await SpaceRouter.deploy(
    spaceCoin.address,
    spaceCoinLP.address
  );
  await spaceRouter.deployed();

  console.log("SpaceRouter deployed to:", spaceRouter.address);

  // @TODO: Change this hardcoded gnosis safe address
  await spaceRouter.transferOwnership('0xde3788029cc9620269BC7B3A021813B2e4d51274');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
