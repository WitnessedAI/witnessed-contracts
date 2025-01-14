import { task } from "hardhat/config";
import "@openzeppelin/hardhat-upgrades";
import { AdditionalDeploymentStorage } from "../utils/additional_deployment_storage";

task(
  "deploy:merkle-store",
  "Deploy the UpgradableMerkleStore with a Transparent Proxy"
)
  .addParam("gnosis", "The Gnosis Safe address for upgrade admin")
  .setAction(async (taskArgs, hre) => {
    const { ethers, upgrades } = hre;
    const gnosisSafeAddress = taskArgs.gnosis;
    const signers = await ethers.getSigners();
    const operationalAdminAddress = signers[0].address;

    console.log("Deploying UpgradableMerkleStore implementation...");
    const UpgradableMerkleStore = await ethers.getContractFactory(
      "UpgradableMerkleStoreV1"
    );
    const proxy = await upgrades.deployProxy(
      UpgradableMerkleStore,
      [gnosisSafeAddress, operationalAdminAddress], // Initializer arguments
      {
        initializer: "initialize", // Initializer function
      }
    );

    await proxy.waitForDeployment();
    const proxyAddress = await proxy.getAddress();
    console.log("UpgradableMerkleStore deployed!");
    console.log("Proxy address:", proxyAddress);
    console.log("Gnosis Safe (Upgrade Admin):", gnosisSafeAddress);
    console.log("Operational Admin:", operationalAdminAddress);

    AdditionalDeploymentStorage.insertDeploymentAddressToFile(
      "UpgradableMerkleStore",
      proxyAddress
    );
  });
