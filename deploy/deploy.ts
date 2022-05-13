import { ethers } from "hardhat";

// TODO: Check idempotency for each run
async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');
  const multisigWalletAddress = "0xE08b81dd3a878eb6fAB1b856231b9c7FD39D718E"; // only in goerli

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

  // Move to OPEN phase
  const spaceCoinICO = await ethers.getContractAt(
    "SpaceCoinICO",
    await spaceCoin.icoAccount()
  );

  console.log("Moving to General Phase ...");
  await spaceCoinICO.moveToNextPhase(0);
  console.log("Moving to Open Phase ...");
  await spaceCoinICO.moveToNextPhase(1);

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

  console.log(
    "Transfering ownership to multisig wallet:",
    multisigWalletAddress
  );

  await spaceCoin
    .transferOwnership(multisigWalletAddress)
    .then((tx: any) => tx.wait());
  await spaceCoinICO
    .transferOwnership(multisigWalletAddress)
    .then((tx: any) => tx.wait());
  await spaceCoinLP
    .transferOwnership(multisigWalletAddress)
    .then((tx: any) => tx.wait());
  await spaceRouter
    .transferOwnership(multisigWalletAddress)
    .then((tx: any) => tx.wait());

  console.log("Ownership transferred");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
