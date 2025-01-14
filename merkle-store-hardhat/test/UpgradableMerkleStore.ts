import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";

describe("UpgradableMerkleStore", function () {
  async function deployMerkleStoreFixture() {
    const [deployer, gnosisSafe, operationalAdmin, otherAccount] =
      await ethers.getSigners();

    const UpgradableMerkleStoreV1 = await ethers.getContractFactory(
      "UpgradableMerkleStoreV1"
    );

    const proxy = await upgrades.deployProxy(
      UpgradableMerkleStoreV1,
      [gnosisSafe.address, operationalAdmin.address],
      { initializer: "initialize" }
    );
    await proxy.waitForDeployment();

    return {
      proxy,
      deployer,
      gnosisSafe,
      operationalAdmin,
      otherAccount,
    };
  }

  describe("Deployment", function () {
    it("Should initialize with the correct roles", async function () {
      const { proxy, gnosisSafe, operationalAdmin } =
        await loadFixture(deployMerkleStoreFixture);

      const UPGRADE_ADMIN_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("UPGRADE_ADMIN_ROLE")
      );
      const OPERATIONAL_ADMIN_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("OPERATIONAL_ADMIN_ROLE")
      );

      expect(await proxy.hasRole(UPGRADE_ADMIN_ROLE, gnosisSafe.address)).to.be
        .true;
      expect(
        await proxy.hasRole(OPERATIONAL_ADMIN_ROLE, operationalAdmin.address)
      ).to.be.true;
    });
  });

  describe("Versioning", function () {
    it("Should return the correct version for V1", async function () {
      const { proxy } = await loadFixture(deployMerkleStoreFixture);
      expect(await proxy.version()).to.equal("1.0.0");
    });

    it("Should return the correct version for V2 after upgrade", async function () {
      const { proxy, gnosisSafe } = await loadFixture(deployMerkleStoreFixture);

      const UpgradableMerkleStoreV2 = await ethers.getContractFactory(
        "UpgradableMerkleStoreV2"
      );
      const newImplementation = await UpgradableMerkleStoreV2.deploy();
      await newImplementation.waitForDeployment();

      await upgrades.upgradeProxy(
        await proxy.getAddress(),
        UpgradableMerkleStoreV2.connect(gnosisSafe)
      );

      expect(await proxy.version()).to.equal("2.0.0");
    });
  });

  describe("Merkle Root Submission", function () {
    it("Should allow Operational Admin to submit a new Merkle root", async function () {
      const { proxy, operationalAdmin } = await loadFixture(
        deployMerkleStoreFixture
      );

      const idx = ethers.id("merkle-root-1");
      const merkleRoot = "merkle-root-1";
      const datafileURL = "https://example.com/datafile";
      const batchMetadata = '{"batch":"metadata"}';

      await expect(
        proxy
          .connect(operationalAdmin)
          .submitNewMerkleRootWithMetadata(
            idx,
            merkleRoot,
            datafileURL,
            batchMetadata
          )
      )
        .to.emit(proxy, "NewRootSubmission")
        .withArgs(idx);
    });

    it("Should revert if a non-Operational Admin tries to submit", async function () {
      const { proxy, otherAccount } = await loadFixture(deployMerkleStoreFixture);

      const idx = ethers.id("merkle-root-1");
      const merkleRoot = "merkle-root-1";
      const datafileURL = "https://example.com/datafile";
      const batchMetadata = '{"batch":"metadata"}';

      const OPERATIONAL_ADMIN_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("OPERATIONAL_ADMIN_ROLE")
      );

      await expect(
        proxy
          .connect(otherAccount)
          .submitNewMerkleRootWithMetadata(
            idx,
            merkleRoot,
            datafileURL,
            batchMetadata
          )
      )
        .to.be.revertedWithCustomError(proxy, "AccessControlUnauthorizedAccount")
        .withArgs(otherAccount.address, OPERATIONAL_ADMIN_ROLE);
    });
  });

  describe("Access Control", function () {
    it("Should allow Upgrade Admin to authorize upgrades", async function () {
      const { proxy, gnosisSafe } = await loadFixture(deployMerkleStoreFixture);

      const UpgradableMerkleStoreV2 = await ethers.getContractFactory(
        "UpgradableMerkleStoreV2"
      );
      const newImplementation = await UpgradableMerkleStoreV2.deploy();
      await newImplementation.waitForDeployment();

      await expect(
        upgrades.upgradeProxy(
          await proxy.getAddress(),
          UpgradableMerkleStoreV2.connect(gnosisSafe)
        )
      ).not.to.be.reverted;

      expect(await proxy.version()).to.equal("2.0.0");
    });

    it("Should revert if a non-Upgrade Admin tries to authorize upgrades", async function () {
      const { proxy, otherAccount } = await loadFixture(deployMerkleStoreFixture);

      const UpgradableMerkleStoreV2 = await ethers.getContractFactory(
        "UpgradableMerkleStoreV2"
      );
      const newImplementation = await UpgradableMerkleStoreV2.deploy();
      await newImplementation.waitForDeployment();

      const UPGRADE_ADMIN_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("UPGRADE_ADMIN_ROLE")
      );

      await expect(
        upgrades.upgradeProxy(
          await proxy.getAddress(),
          UpgradableMerkleStoreV2.connect(otherAccount)
        )
      )
        .to.be.revertedWithCustomError(proxy, "AccessControlUnauthorizedAccount")
        .withArgs(otherAccount.address, UPGRADE_ADMIN_ROLE);
    });
  });
});
