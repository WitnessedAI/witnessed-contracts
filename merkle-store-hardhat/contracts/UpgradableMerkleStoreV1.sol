// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/StorageSlot.sol";

contract UpgradableMerkleStoreV1 is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    // Storage slots for variables
    bytes32 private constant _ROOT_NONCE_SLOT =
        keccak256("upgradable.merkle.store.root.nonce");
    bytes32 private constant _MERKLE_ROOTS_SLOT =
        keccak256("upgradable.merkle.store.merkle.roots");

    // Roles
    bytes32 public constant UPGRADE_ADMIN_ROLE =
        keccak256("UPGRADE_ADMIN_ROLE");
    bytes32 public constant OPERATIONAL_ADMIN_ROLE =
        keccak256("OPERATIONAL_ADMIN_ROLE");

    // Events

    /// idx -> Provided index for look-ups
    /// merkleRoot -> The Merkle root of the data
    /// lockAt -> Timestamp of when will be locked
    /// metadata -> Any additional data stored with the merkle tree
    event NewRootSubmission(
        bytes32 indexed idx,
        bytes32 indexed merkleRoot,
        uint256 indexed lockAt,
        string metadata
    );

    /// idx -> Provided index for look-ups
    /// merkleRoot -> The Merkle root of the data
    /// lockAt -> Timestamp of when will be locked, 0 implies nothing
    /// metadata -> The new, updated metadata.
    event RootMetadataModification(
        bytes32 indexed idx,
        uint256 indexed lockAt,
        string metadata
    );

    /// A Merkle Tree submission
    struct Submission {
        /// The merkle tree root
        bytes32 merkleRoot;
        /// Immutable data, should be used for any data that needs to be stored permanently
        /// with this tree.
        string metadata;
        /// Lock timestamp, 0 implies unlocked and no future lock
        uint256 lockAt;
        /// Mutable metadata, should be used for things that can change depending on
        /// how it runs.
        uint256 submittedOn;
        /// The block number of the UpdatedOn
        uint256 updatedOn;
    }

    /// @notice Initializes the contract and sets up roles
    /// @param gnosisSafe The address for the Upgrade Admin role
    /// @param operationalAdmin The address for the Operational Admin role
    function initialize(
        address gnosisSafe,
        address operationalAdmin
    ) public initializer {
        require(gnosisSafe != address(0), "Gnosis Safe address cannot be zero");
        require(
            operationalAdmin != address(0),
            "Operational Admin address cannot be zero"
        );

        __AccessControl_init(); // Initialize AccessControl
        __UUPSUpgradeable_init(); // Initialize UUPSUpgradeable

        // Assign roles using grantRole
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender); // Deployer is default admin initially
        _grantRole(UPGRADE_ADMIN_ROLE, gnosisSafe); // Assign Upgrade Admin
        _grantRole(OPERATIONAL_ADMIN_ROLE, operationalAdmin); // Assign Operational Admin

        // Set role admins
        _setRoleAdmin(UPGRADE_ADMIN_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(OPERATIONAL_ADMIN_ROLE, DEFAULT_ADMIN_ROLE);

        // Initialize root nonce to 0
        StorageSlot.getUint256Slot(_ROOT_NONCE_SLOT).value = 0;
    }

    /// @dev Authorizes upgrades for UUPS proxy
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADE_ADMIN_ROLE) {}

    /// @notice Submit a new Merkle root with metadata
    /// @param idx An identifying index
    /// @param merkleRoot The merkle root of the tree submission
    /// @param metadata Any metadata stored
    /// @param lockAt When the data should be locked.  If timestamp is from before block.timestamp, use block.timestamp instead
    /// @return hashedMerkleRoot Returns the hashed merkle root
    function submitNewMerkleRootWithMetadata(
        bytes32 idx,
        bytes32 merkleRoot,
        string calldata metadata,
        uint256 lockAt
    ) external onlyRole(OPERATIONAL_ADMIN_ROLE) returns (bytes32) {
        mapping(bytes32 => Submission)
            storage merkleRoots = _getMerkleRootsStorage();

        require(
            merkleRoots[idx].submittedOn == 0,
            "Cannot submitNewMerkleRoot with given Idx, already taken."
        );

        // Increment root nonce
        uint256 rootNonce = StorageSlot.getUint256Slot(_ROOT_NONCE_SLOT).value +
            1;
        StorageSlot.getUint256Slot(_ROOT_NONCE_SLOT).value = rootNonce;

        // If lock is not 0, and it is before the block timestamp, we should update it
        // so that it is the same as now
        if (lockAt != 0 && lockAt < block.timestamp) {
            lockAt = block.timestamp;
        }

        // Store new submission
        merkleRoots[idx] = Submission(
            merkleRoot,
            metadata,
            lockAt,
            block.number,
            block.number
        );

        emit NewRootSubmission(idx, merkleRoot, lockAt, metadata);
        return sha256(abi.encodePacked(merkleRoot));
    }

    /// @notice Update metadata & lock for an existing Merkle root
    /// @param idx The index of the submission
    /// @param newMetadata Additional data (JSON?) stored with the tree.
    /// @param lockAt Timestamp of when the metadata should be locked
    /// @return submission Returns the updated submission
    function updateMetadataOnMerkleRootHash(
        bytes32 idx,
        string calldata newMetadata,
        uint256 lockAt
    ) external onlyRole(OPERATIONAL_ADMIN_ROLE) returns (Submission memory) {
        mapping(bytes32 => Submission)
            storage merkleRoots = _getMerkleRootsStorage();
        Submission storage prevSubmission = merkleRoots[idx];

        require(
            prevSubmission.lockAt > block.timestamp,
            "Submission is locked"
        );
        require(prevSubmission.submittedOn != 0, "Submission does not exist");

        if (lockAt < block.timestamp) {
            lockAt = block.timestamp;
        }

        prevSubmission.metadata = newMetadata;
        prevSubmission.lockAt = lockAt;
        prevSubmission.updatedOn = block.number;

        emit RootMetadataModification(idx, lockAt, newMetadata);
        return prevSubmission;
    }

    /// @notice Update lock on the data in the hash
    /// @param idx Index used for a tree
    /// @return Submission Returns the submission in its final, locked state.
    function lockMetadataOnMerkleRootHash(
        bytes32 idx
    ) external onlyRole(OPERATIONAL_ADMIN_ROLE) returns (Submission memory) {
        mapping(bytes32 => Submission)
            storage merkleRoots = _getMerkleRootsStorage();
        Submission storage prevSubmission = merkleRoots[idx];

        require(
            prevSubmission.lockAt > block.timestamp,
            "Submission is already locked"
        );
        require(prevSubmission.submittedOn != 0, "Submission does not exist");

        prevSubmission.lockAt = block.timestamp;
        prevSubmission.updatedOn = block.number;

        emit RootMetadataModification(
            idx,
            block.timestamp,
            prevSubmission.metadata
        );
        return prevSubmission;
    }

    /// @notice Get submission details by index
    /// @param idx Index used for lookup of tree
    /// @return Submission The submission for a given merkleRoot
    function getMerkleRootOnHash(
        bytes32 idx
    ) external view returns (Submission memory) {
        mapping(bytes32 => Submission)
            storage merkleRoots = _getMerkleRootsStorage();
        return merkleRoots[idx];
    }

    /// @notice Get the total number of Merkle roots submitted
    /// @return numberMerkleRoots Returns the number of Merkle Roots stored in the contract
    function getNumberOfMerkleRoots() external view returns (uint256) {
        return StorageSlot.getUint256Slot(_ROOT_NONCE_SLOT).value;
    }

    /// @dev Internal function to access the merkle roots storage
    /// @return merkleRoots Returns a mapping of a merkleRoot to submission data about the merkle tree
    function _getMerkleRootsStorage()
        private
        view
        returns (mapping(bytes32 => Submission) storage merkleRoots)
    {
        bytes32 slot = _MERKLE_ROOTS_SLOT;
        assembly {
            merkleRoots.slot := slot
        }
    }

    function version() external pure returns (string memory) {
        return "1.0.0";
    }
}
