import { task } from "hardhat/config";
import "@openzeppelin/hardhat-upgrades";
import { AdditionalDeploymentStorage } from "../utils/additional_deployment_storage";

task(
  "deploy:merkle-store",
  "Deploy MerkleStoreData and UpgradableMerkleStoreV1 with a Transparent Proxy"
)
  .addParam("gnosis", "The Gnosis Safe address for upgrade admin")
  .setAction(async (taskArgs, hre) => {
    const { ethers, upgrades } = hre;
    const gnosisSafeAddress = taskArgs.gnosis;
    const signers = await ethers.getSigners();
    const operationalAdminAddress = signers[0].address;

    console.log("\n🚀 Deploying MerkleStoreData (Storage Contract)...");
    const MerkleStoreData = await ethers.getContractFactory("MerkleStoreData");
    const merkleStoreDataProxy = await upgrades.deployProxy(
      MerkleStoreData,
      [gnosisSafeAddress, operationalAdminAddress], // Initializer arguments
      {
        initializer: "initialize",
      }
    );

    await merkleStoreDataProxy.waitForDeployment();
    const merkleStoreDataAddress = await merkleStoreDataProxy.getAddress();
    console.log("✅ MerkleStoreData deployed at:", merkleStoreDataAddress);

    console.log("\n🚀 Deploying UpgradableMerkleStoreV1 (Logic Contract)...");
    const UpgradableMerkleStore = await ethers.getContractFactory(
      "UpgradableMerkleStoreV1"
    );
    const upgradableMerkleStoreProxy = await upgrades.deployProxy(
      UpgradableMerkleStore,
      [gnosisSafeAddress, operationalAdminAddress, merkleStoreDataAddress], // Pass storage contract address
      {
        initializer: "initialize",
      }
    );

    await upgradableMerkleStoreProxy.waitForDeployment();
    const upgradableMerkleStoreAddress =
      await upgradableMerkleStoreProxy.getAddress();
    console.log(
      "✅ UpgradableMerkleStoreV1 deployed at:",
      upgradableMerkleStoreAddress
    );

    console.log("\n📌 Deployment Summary:");
    console.log("🔹 Proxy for MerkleStoreData:", merkleStoreDataAddress);
    console.log(
      "🔹 Proxy for UpgradableMerkleStoreV1:",
      upgradableMerkleStoreAddress
    );
    console.log("🔹 Gnosis Safe (Upgrade Admin):", gnosisSafeAddress);
    console.log("🔹 Operational Admin:", operationalAdminAddress);

    // Store addresses for later use
    AdditionalDeploymentStorage.insertDeploymentAddressToFile(
      "MerkleStoreData",
      merkleStoreDataAddress
    );

    AdditionalDeploymentStorage.insertDeploymentAddressToFile(
      "UpgradableMerkleStore",
      upgradableMerkleStoreAddress
    );
  });
