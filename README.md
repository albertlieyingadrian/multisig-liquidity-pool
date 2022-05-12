# Advanced Sample Hardhat Project

This project demonstrates an advanced Hardhat use case, integrating other tools commonly used alongside Hardhat in the ecosystem.

The project comes with a sample contract, a test for that contract, a sample script that deploys that contract, and an example of a task implementation, which simply lists the available accounts. It also comes with a variety of other tools, preconfigured to work with the project code.

Try running some of the following tasks:

```shell
npx hardhat accounts
npx hardhat compile
npx hardhat clean
npx hardhat test
npx hardhat node
npx hardhat help
REPORT_GAS=true npx hardhat test
npx hardhat coverage
npx hardhat run scripts/deploy.ts
TS_NODE_FILES=true npx ts-node scripts/deploy.ts
npx eslint '**/*.{js,ts}'
npx eslint '**/*.{js,ts}' --fix
npx prettier '**/*.{json,sol,md}' --check
npx prettier '**/*.{json,sol,md}' --write
npx solhint 'contracts/**/*.sol'
npx solhint 'contracts/**/*.sol' --fix
```

# Etherscan verification

To try out Etherscan verification, you first need to deploy a contract to an Ethereum network that's supported by Etherscan, such as Ropsten.

In this project, copy the .env.example file to a file named .env, and then edit it to fill in the details. Enter your Etherscan API key, your Ropsten node URL (eg from Alchemy), and the private key of the account which will send the deployment transaction. With a valid .env file in place, first deploy your contract:

```shell
hardhat run --network ropsten scripts/deploy.ts
```

Then, copy the deployment address and paste it in to replace `DEPLOYED_CONTRACT_ADDRESS` in this command:

```shell
npx hardhat verify --network ropsten DEPLOYED_CONTRACT_ADDRESS "Hello, Hardhat!"
```

# Performance optimizations

For faster runs of your tests and scripts, consider skipping ts-node's type checking by setting the environment variable `TS_NODE_TRANSPILE_ONLY` to `1` in hardhat's environment. For more details see [the documentation](https://hardhat.org/guides/typescript.html#performance-optimizations).

# Deployment Result

```
Deploying contracts with the account: 0x6684561D15A28a4b4a96fd5D63778862457d9bd6
Account balance: 600470644566999930
Treasury address 0xb4204d2D9A51572E858Ef53715486899bB6fe112
SpaceCoin deployed to: 0x6dce6D3C01657156A628Df999a26Ec6470c2563c
SpaceCoinICO deployed to: 0x2Dae42f82d93D93fC005ED1780752c47AE3D132b
SpaceCoinLP Pool deployed to: 0xD8f1E3a98E44852AE1CC9D6C5c34163D7C80dcD2
SpaceRouter deployed to: 0xEC469B61AD5C24cFFb9692fddAC92522E171CAD5
```

# Etherscan link in rinkeby

https://rinkeby.etherscan.io/address/0x6684561d15a28a4b4a96fd5d63778862457d9bd6

# Gnosis Safe Wallet
https://gnosis-safe.io/app/gor:0xde3788029cc9620269BC7B3A021813B2e4d51274/home

# Design Exercises

Consider and write down the positive and negative tradeoffs of the following configurations for a multisig wallet. In particular, consider how each configuration handles the common failure modes of wallet security.
1-of-N
M-of-N (where M: such that 1 < M < N)
N-of-N
