import { task } from "hardhat/config";
import "@openzeppelin/hardhat-upgrades";
import { AdditionalDeploymentStorage } from "../utils/additional_deployment_storage";

task(
  "deploy-and-generate-upgrade-calldata",
  "Deploy V2 implementation and generate calldata for Gnosis Safe"
)
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;

    const additional_deployments = AdditionalDeploymentStorage.getDeployments();
    const proxyAddress = additional_deployments["UpgradableMerkleStore"];

    if (!proxyAddress) {
      console.error(
        "No UpgradableMerkleStore deployment found. Please deploy the UpgradableMerkleStore first."
      );
      return;
    }

    // Step 1: Deploy V2 Implementation
    console.log("Deploying UpgradableMerkleStoreV2...");
    const UpgradableMerkleStoreV2 = await ethers.getContractFactory(
      "UpgradableMerkleStoreV2"
    );
    const newImplementation = await UpgradableMerkleStoreV2.deploy();
    await newImplementation.waitForDeployment();
    console.log(
      "Deployed UpgradableMerkleStoreV2 at:",
      newImplementation.target
    );

    // Step 2: Generate Upgrade Calldata

    const proxyAdminInterface = new ethers.Interface([
      "function upgrade(address proxy, address implementation)",
    ]);

    const calldata = proxyAdminInterface.encodeFunctionData("upgrade", [
      proxyAddress,
      newImplementation.target,
    ]);

    console.log("\nUpgrade calldata generated:");
    console.log("Calldata for Gnosis Safe:", calldata);

    AdditionalDeploymentStorage.insertDeploymentAddressToFile(
      "UpgradableMerkleStoreV2CallData",
      calldata
    );

    console.log("\nSubmit this calldata to Gnosis Safe for multisig approval.");
  });
