import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";

describe("UpgradableMerkleStore", function () {
  async function deployMerkleStoreFixture() {
    const [deployer, gnosisSafe, operationalAdmin, otherAccount] =
      await ethers.getSigners();

    const UpgradableMerkleStoreV2 = await ethers.getContractFactory(
      "UpgradableMerkleStoreV2"
    );

    const proxy = await upgrades.deployProxy(
      UpgradableMerkleStoreV2,
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
      const { proxy, gnosisSafe, operationalAdmin } = await loadFixture(
        deployMerkleStoreFixture
      );

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
    it("Should return the correct version for V2 before upgrade", async function () {
      const { proxy } = await loadFixture(deployMerkleStoreFixture);
      expect(await proxy.version()).to.equal("2.0.0");
    });

    it("Should return the correct version for V1 after upgrade", async function () {
      const { proxy, gnosisSafe } = await loadFixture(deployMerkleStoreFixture);

      const UpgradableMerkleStoreV1 = await ethers.getContractFactory(
        "UpgradableMerkleStoreV1"
      );
      const newImplementation = await UpgradableMerkleStoreV1.deploy();
      await newImplementation.waitForDeployment();

      await upgrades.upgradeProxy(
        await proxy.getAddress(),
        UpgradableMerkleStoreV1.connect(gnosisSafe)
      );

      expect(await proxy.version()).to.equal("1.0.0");
    });
  });

  describe("Merkle Root Submission", function () {
    it("Should allow Operational Admin to submit a new Merkle root", async function () {
      const { proxy, operationalAdmin } = await loadFixture(
        deployMerkleStoreFixture
      );

      const idx = ethers.id("merkle-root-1");
      const merkleRoot = ethers.id("merkle-root-1");
      const metadata = '{"batch":"metadata"}';
      const lockAt = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      await expect(
        proxy
          .connect(operationalAdmin)
          .submitNewMerkleRootWithMetadata(idx, merkleRoot, metadata, lockAt)
      )
        .to.emit(proxy, "NewRootSubmission")
        .withArgs(idx, merkleRoot, lockAt, metadata);
    });

    it("Should revert if a non-Operational Admin tries to submit", async function () {
      const { proxy, otherAccount } = await loadFixture(
        deployMerkleStoreFixture
      );

      const idx = ethers.id("merkle-root-1");
      const merkleRoot = ethers.id("merkle-root-1");
      const metadata = '{"batch":"metadata"}';
      const lockAt = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      const OPERATIONAL_ADMIN_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("OPERATIONAL_ADMIN_ROLE")
      );

      await expect(
        proxy
          .connect(otherAccount)
          .submitNewMerkleRootWithMetadata(idx, merkleRoot, metadata, lockAt)
      )
        .to.be.revertedWithCustomError(
          proxy,
          "AccessControlUnauthorizedAccount"
        )
        .withArgs(otherAccount.address, OPERATIONAL_ADMIN_ROLE);
    });

    it("Should allow updating metadata for an existing Merkle root", async function () {
      const { proxy, operationalAdmin } = await loadFixture(
        deployMerkleStoreFixture
      );

      const idx = ethers.id("merkle-root-3");
      const merkleRoot = ethers.id("merkle-root-3");
      const metadata = '{"batch":"metadata3"}';
      const newMetadata = '{"batch":"updated-metadata3"}';
      const lockAt = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      await proxy
        .connect(operationalAdmin)
        .submitNewMerkleRootWithMetadata(idx, merkleRoot, metadata, lockAt);
      await expect(
        proxy
          .connect(operationalAdmin)
          .updateMetadataOnMerkleRootHash(idx, newMetadata, lockAt)
      )
        .to.emit(proxy, "RootMetadataModification")
        .withArgs(idx, lockAt, newMetadata);
    });

    it("Should allow locking metadata for an existing Merkle root", async function () {
      const { proxy, operationalAdmin } = await loadFixture(
        deployMerkleStoreFixture
      );

      const idx = ethers.id("merkle-root-4");
      const merkleRoot = ethers.id("merkle-root-4");
      const metadata = '{"batch":"metadata4"}';
      const lockAt = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      await proxy
        .connect(operationalAdmin)
        .submitNewMerkleRootWithMetadata(idx, merkleRoot, metadata, lockAt);
      await expect(
        proxy.connect(operationalAdmin).lockMetadataOnMerkleRootHash(idx)
      )
        .to.emit(proxy, "RootMetadataModification")
        .withArgs(
          idx,
          await ethers.provider
            .getBlock("latest")
            .then((block) => (block?.timestamp || 0) + 1),
          metadata
        );
    });
  });

  describe("Retrieval Functions", function () {
    it("Should retrieve submitted Merkle root details correctly", async function () {
      const { proxy, operationalAdmin } = await loadFixture(
        deployMerkleStoreFixture
      );
      const idx = ethers.id("merkle-root-5");
      const merkleRoot = ethers.id("merkle-root-5");
      const metadata = '{"batch":"metadata5"}';
      const lockAt = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      await proxy
        .connect(operationalAdmin)
        .submitNewMerkleRootWithMetadata(idx, merkleRoot, metadata, lockAt);
      const storedData = await proxy.getMerkleRootOnHash(idx);

      expect(storedData.merkleRoot).to.equal(merkleRoot);
      expect(storedData.metadata).to.equal(metadata);
      expect(storedData.lockAt).to.equal(lockAt);
    });

    it("Should retrieve submitted Merkle root details correctly after upgrade", async function () {
      const { proxy, operationalAdmin, gnosisSafe } = await loadFixture(
        deployMerkleStoreFixture
      );
      const idx = ethers.id("merkle-root-5");
      const merkleRoot = ethers.id("merkle-root-5");
      const metadata = '{"batch":"metadata5"}';
      const lockAt = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      await proxy
        .connect(operationalAdmin)
        .submitNewMerkleRootWithMetadata(idx, merkleRoot, metadata, lockAt);

      const UpgradableMerkleStoreV2 = await ethers.getContractFactory(
        "UpgradableMerkleStoreV2"
      );
      await upgrades.upgradeProxy(
        await proxy.getAddress(),
        UpgradableMerkleStoreV2.connect(gnosisSafe)
      );

      const storedData = await proxy.getMerkleRootOnHash(idx);
      expect(storedData.merkleRoot).to.equal(merkleRoot);
      expect(storedData.metadata).to.equal(metadata);
      expect(storedData.lockAt).to.equal(lockAt);
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
      const { proxy, otherAccount } = await loadFixture(
        deployMerkleStoreFixture
      );

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
        .to.be.revertedWithCustomError(
          proxy,
          "AccessControlUnauthorizedAccount"
        )
        .withArgs(otherAccount.address, UPGRADE_ADMIN_ROLE);
    });
  });
  describe("Helpers", function () {
    it("Should return the correct number of Merkle roots", async function () {
      const { proxy, operationalAdmin } = await loadFixture(
        deployMerkleStoreFixture
      );
      const idx1 = ethers.id("merkle-root-6");
      const idx2 = ethers.id("merkle-root-7");
      const merkleRoot1 = ethers.id("merkle-root-6");
      const merkleRoot2 = ethers.id("merkle-root-7");
      const metadata1 = '{"batch":"metadata6"}';
      const metadata2 = '{"batch":"metadata7"}';
      const lockAt1 = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const lockAt2 = Math.floor(Date.now() / 1000) + 7200; // 2 hours from now

      await proxy
        .connect(operationalAdmin)
        .submitNewMerkleRootWithMetadata(idx1, merkleRoot1, metadata1, lockAt1);
      await proxy
        .connect(operationalAdmin)
        .submitNewMerkleRootWithMetadata(idx2, merkleRoot2, metadata2, lockAt2);

      expect(await proxy.getNumberOfMerkleRoots()).to.equal(2);
    });
  });
});
