import { task } from "hardhat/config";
import "@openzeppelin/hardhat-upgrades";
import { AdditionalDeploymentStorage } from "../utils/additional_deployment_storage";

task(
  "print-merkle-store-version",
  "Print the version of the UpgradableMerkleStore"
).setAction(async (taskArgs, hre) => {
    const { ethers } = hre;
    
    const additional_deployments = AdditionalDeploymentStorage.getDeployments();
    const proxyAddress = additional_deployments["UpgradableMerkleStore"];
    
    if (!proxyAddress) {
        console.error(
        "No UpgradableMerkleStore deployment found. Please deploy the UpgradableMerkleStore first."
        );
        return;
    }
    
    const proxy = await ethers.getContractAt("UpgradableMerkleStoreV1", proxyAddress);
    
    console.log("UpgradableMerkleStore version:", await proxy.version());
});
