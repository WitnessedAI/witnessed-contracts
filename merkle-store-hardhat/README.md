# Upgradable Merkle Store POC integrated with Gnosis Safe

This project is a proof of concept for an upgradable Merkle Store contract that is integrated with a Gnosis Safe contract. The Merkle Store contract is a simple contract that allows users to store data in a Merkle tree. The Gnosis Safe contract is a multi-signature wallet that allows users to execute transactions with a threshold of signatures.

Try running some of the following tasks:

```shell

npx hardhat deploy:merkle-store --network amoy --gnosis <GNOSIS_ADDRESS>
npx hardhat --network amoy print-merkle-store-version
npx hardhat --network amoy deploy-and-generate-upgrade-calldata

```
