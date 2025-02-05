import { task } from "hardhat/config";
import "@openzeppelin/hardhat-upgrades";
import { AdditionalDeploymentStorage } from "../utils/additional_deployment_storage";

task(
  "deploy-and-generate-upgrade-calldata",
  "Deploy V2 implementation and generate upgrade calldata for Gnosis Safe"
).setAction(async (taskArgs, hre) => {
  const { ethers, upgrades } = hre;

  // Step 1: Load previous deployments
  const additionalDeployments = AdditionalDeploymentStorage.getDeployments();
  const proxyAddress = additionalDeployments["UpgradableMerkleStore"];
  const merkleStoreDataAddress = additionalDeployments["MerkleStoreData"];

  if (!proxyAddress || !merkleStoreDataAddress) {
    console.error(
      "❌ No existing UpgradableMerkleStoreV1 or MerkleStoreData found. Deploy V1 first."
    );
    return;
  }

  console.log("\n🔍 Found existing deployments:");
  console.log("🔹 UpgradableMerkleStoreV1 Proxy Address:", proxyAddress);
  console.log("🔹 MerkleStoreData Address:", merkleStoreDataAddress);

  // Step 2: Deploy V2 Implementation (Explicitly setting UUPS kind)
  console.log("\n🚀 Deploying UpgradableMerkleStoreV2...");
  const UpgradableMerkleStoreV2 = await ethers.getContractFactory("UpgradableMerkleStoreV2");

  const newImplementation = await upgrades.prepareUpgrade(proxyAddress, UpgradableMerkleStoreV2, {
    kind: "uups", // Explicitly setting UUPS proxy type
  });

  console.log("✅ UpgradableMerkleStoreV2 Implementation deployed at:", newImplementation);

  // Step 3: Generate Upgrade Calldata for Gnosis Safe
  const proxyAdminInterface = new ethers.Interface([
    "function upgrade(address proxy, address implementation)",
  ]);

  const upgradeCalldata = proxyAdminInterface.encodeFunctionData("upgrade", [
    proxyAddress,
    newImplementation,
  ]);

  console.log("\n📌 Upgrade calldata generated:");
  console.log("🔹 Calldata for Gnosis Safe:", upgradeCalldata);

  // Step 4: Store upgrade calldata for later use
  AdditionalDeploymentStorage.insertDeploymentAddressToFile(
    "UpgradableMerkleStoreV2Implementation",
    newImplementation.toString()
  );

  AdditionalDeploymentStorage.insertDeploymentAddressToFile(
    "UpgradableMerkleStoreV2CallData",
    upgradeCalldata
  );

  console.log("\n✅ Submit this calldata to Gnosis Safe for multisig approval.");
});
