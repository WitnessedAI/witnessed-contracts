// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts/utils/StorageSlot.sol";

contract MerkleStoreData is Initializable, UUPSUpgradeable, AccessControlUpgradeable {
    // Storage slots for variables (to avoid storage conflicts)
    bytes32 private constant _ROOT_NONCE_SLOT = keccak256("upgradable.merkle.store.root.nonce");
    bytes32 private constant _MERKLE_ROOTS_SLOT = keccak256("upgradable.merkle.store.merkle.roots");

    bytes32 public constant UPGRADE_ADMIN_ROLE = keccak256("UPGRADE_ADMIN_ROLE");
    bytes32 public constant OPERATIONAL_ADMIN_ROLE = keccak256("OPERATIONAL_ADMIN_ROLE");

    struct Submission {
        bytes32 merkleRoot;
        string metadata;
        bool lock;
        uint256 submittedOn;
        uint256 updatedOn;
    }

    event SubmissionStored(bytes32 indexed merkleRoot, bool indexed lock, string metadata);
    event SubmissionUpdated(bytes32 indexed merkleRoot, bool indexed lock, string metadata);

    modifier onlyOperationalAdmin() {
        require(hasRole(OPERATIONAL_ADMIN_ROLE, msg.sender), "Caller is not Operational Admin");
        _;
    }

    function initialize(address upgradeAdmin, address operationalAdmin) public initializer {
        require(upgradeAdmin != address(0), "Upgrade Admin cannot be zero");
        require(operationalAdmin != address(0), "Operational Admin cannot be zero");

        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADE_ADMIN_ROLE, upgradeAdmin);
        _grantRole(OPERATIONAL_ADMIN_ROLE, operationalAdmin);

        // Initialize root nonce to 0
        StorageSlot.getUint256Slot(_ROOT_NONCE_SLOT).value = 0;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADE_ADMIN_ROLE) {}

    function _getRootNonce() internal view returns (uint256) {
        return StorageSlot.getUint256Slot(_ROOT_NONCE_SLOT).value;
    }

    function _setRootNonce(uint256 newNonce) internal {
        StorageSlot.getUint256Slot(_ROOT_NONCE_SLOT).value = newNonce;
    }

    function _getMerkleRootsStorage() private pure returns (mapping(bytes32 => Submission) storage merkleRoots) {
        bytes32 slot = _MERKLE_ROOTS_SLOT;
        assembly {
            merkleRoots.slot := slot
        }
    }

    function storeSubmission(bytes32 merkleRoot, string calldata metadata, bool lock) external onlyOperationalAdmin {
        mapping(bytes32 => Submission) storage merkleRoots = _getMerkleRootsStorage();
        require(merkleRoots[merkleRoot].submittedOn == 0, "Merkle Root already exists");

        merkleRoots[merkleRoot] = Submission({
            merkleRoot: merkleRoot,
            metadata: metadata,
            lock: lock,
            submittedOn: block.timestamp,
            updatedOn: block.timestamp
        });

        _setRootNonce(_getRootNonce() + 1);

        emit SubmissionStored(merkleRoot, lock, metadata);
    }

    function updateSubmission(bytes32 merkleRoot, string calldata newMetadata, bool lock) external onlyOperationalAdmin {
        mapping(bytes32 => Submission) storage merkleRoots = _getMerkleRootsStorage();
        Submission storage submission = merkleRoots[merkleRoot];

        require(submission.submittedOn != 0, "Submission does not exist");
        require(!submission.lock, "Submission is locked");

        submission.metadata = newMetadata;
        submission.lock = lock;
        submission.updatedOn = block.timestamp;

        emit SubmissionUpdated(merkleRoot, lock, newMetadata);
    }

    function lockSubmission(bytes32 merkleRoot) external onlyOperationalAdmin {
        mapping(bytes32 => Submission) storage merkleRoots = _getMerkleRootsStorage();
        Submission storage submission = merkleRoots[merkleRoot];

        require(submission.submittedOn != 0, "Submission does not exist");
        require(!submission.lock, "Submission already locked");

        submission.lock = true;
        submission.updatedOn = block.timestamp;

        emit SubmissionUpdated(merkleRoot, true, submission.metadata);
    }

    function getSubmission(bytes32 merkleRoot) external view returns (Submission memory) {
        mapping(bytes32 => Submission) storage merkleRoots = _getMerkleRootsStorage();
        return merkleRoots[merkleRoot];
    }

    function getRootNonce() external view returns (uint256) {
        return _getRootNonce();
    }
}
