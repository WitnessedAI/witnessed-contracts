// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./MerkleStoreData.sol";

contract UpgradableMerkleStoreV2 is Initializable, AccessControlUpgradeable, UUPSUpgradeable {
    bytes32 public constant UPGRADE_ADMIN_ROLE = keccak256("UPGRADE_ADMIN_ROLE");
    bytes32 public constant OPERATIONAL_ADMIN_ROLE = keccak256("OPERATIONAL_ADMIN_ROLE");

    MerkleStoreData public merkleStoreData;

    event NewRootSubmission(bytes32 indexed merkleRoot, bool indexed lock, string metadata);
    event RootMetadataModification(bytes32 indexed merkleRoot, bool indexed lock, string metadata);

    function initialize(address gnosisSafe, address operationalAdmin, address storageContract) public initializer {
        require(gnosisSafe != address(0), "Gnosis Safe address cannot be zero");
        require(operationalAdmin != address(0), "Operational Admin address cannot be zero");
        require(storageContract != address(0), "Storage contract cannot be zero");

        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADE_ADMIN_ROLE, gnosisSafe);
        _grantRole(OPERATIONAL_ADMIN_ROLE, operationalAdmin);

        merkleStoreData = MerkleStoreData(storageContract);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADE_ADMIN_ROLE) {}

    function submitNewMerkleRootWithMetadata(
        bytes32 merkleRoot,
        string calldata metadata,
        bool lock
    ) external onlyRole(OPERATIONAL_ADMIN_ROLE) {
        merkleStoreData.storeSubmission(merkleRoot, metadata, lock);
        emit NewRootSubmission(merkleRoot, lock, metadata);
    }

    function updateMetadataOnMerkleRootHash(
        bytes32 merkleRoot,
        string calldata newMetadata,
        bool lock
    ) external onlyRole(OPERATIONAL_ADMIN_ROLE) {
        merkleStoreData.updateSubmission(merkleRoot, newMetadata, lock);
        emit RootMetadataModification(merkleRoot, lock, newMetadata);
    }

    function lockMetadataOnMerkleRootHash(bytes32 merkleRoot) external onlyRole(OPERATIONAL_ADMIN_ROLE) {
        merkleStoreData.lockSubmission(merkleRoot);
        emit RootMetadataModification(merkleRoot, true, "");
    }

    function getMerkleRootOnHash(bytes32 merkleRoot) external view returns (MerkleStoreData.Submission memory) {
        return merkleStoreData.getSubmission(merkleRoot);
    }

    function getNumberOfMerkleRoots() external view returns (uint256) {
        return merkleStoreData.getRootNonce();
    }

    function version() external pure returns (string memory) {
        return "2.0.0";
    }
}
