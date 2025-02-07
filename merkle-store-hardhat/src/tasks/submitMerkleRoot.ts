import { task } from "hardhat/config";
import "@openzeppelin/hardhat-upgrades";
import { AdditionalDeploymentStorage } from "../utils/additional_deployment_storage";

task("submit-merkle-root", "Submit Merkle Root").setAction(
  async (taskArgs, hre) => {
    const { ethers } = hre;
    const signers = await ethers.getSigners();
    const operationalAdminAddress = signers[1];
    const additional_deployments = AdditionalDeploymentStorage.getDeployments();
    const proxyAddress = additional_deployments["UpgradableMerkleStore"];

    if (!proxyAddress) {
      console.error(
        "No UpgradableMerkleStore deployment found. Please deploy the UpgradableMerkleStore first."
      );
      return;
    }

    const idx = ethers.id("merkle-root-1");
    const merkleRoot = ethers.id("merkle-root-1");
    const metadata = '{"batch":"metadata"}';
    const lockAt = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

    const proxy = await ethers.getContractAt(
      "UpgradableMerkleStoreV1",
      proxyAddress
    );

    const resp = await proxy
      .connect(operationalAdminAddress)
      .submitNewMerkleRootWithMetadata(idx, merkleRoot, metadata, lockAt);

    const tx = await resp.wait();
    console.log("Merkle Root submitted with tx hash:", tx?.hash);
  }
);
