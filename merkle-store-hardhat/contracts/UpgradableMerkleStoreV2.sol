// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/StorageSlot.sol";

contract UpgradableMerkleStoreV2 is Initializable, AccessControlUpgradeable, UUPSUpgradeable {
    // Storage slots for variables
    bytes32 private constant _ROOT_NONCE_SLOT = keccak256("upgradable.merkle.store.root.nonce");
    bytes32 private constant _MERKLE_ROOTS_SLOT = keccak256("upgradable.merkle.store.merkle.roots");

    // Roles
    bytes32 public constant UPGRADE_ADMIN_ROLE = keccak256("UPGRADE_ADMIN_ROLE");
    bytes32 public constant OPERATIONAL_ADMIN_ROLE = keccak256("OPERATIONAL_ADMIN_ROLE");

    // Events 
    event NewRootSubmission(bytes32 indexed merkleRoot, bool indexed lock, string data, string metadata);
    event RootMetadataModification(bytes32 indexed merkleRoot, bool indexed lock, string metadata);

    /// A Merkle Tree submission
    struct Submission {
        /// The merkle tree root
        bytes32 merkleRoot;
        /// Immutable data, should be used for any data that needs to be stored permanently
        /// with this tree.
        string metadata;
        /// Lock prevents modifying the submission.
        bool lock;
        /// Mutable metadata, should be used for things that can change depending on
        /// how it runs.
        uint256 submittedOn;
        /// The block number of the UpdatedOn
        uint256 updatedOn;

    }

    /// @notice Initializes the contract and sets up roles
    /// @param gnosisSafe The address for the Upgrade Admin role
    /// @param operationalAdmin The address for the Operational Admin role
    function initialize(address gnosisSafe, address operationalAdmin) public initializer {
        require(gnosisSafe != address(0), "Gnosis Safe address cannot be zero");
        require(operationalAdmin != address(0), "Operational Admin address cannot be zero");

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
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADE_ADMIN_ROLE) {}

    /// @notice Submit a new Merkle root with metadata
    /// @param merkleRoot The merkle root of the tree submission
    /// @param metadata Any metadata stored 
    /// @param lock Whether or not the submission data is locked.
    /// @return hashedMerkleRoot Returns the hashed merkle root
    function submitNewMerkleRootWithMetadata(
        bytes32 merkleRoot,
        string calldata metadata,
        bool lock
    ) external onlyRole(OPERATIONAL_ADMIN_ROLE) returns (bytes32) {
        // Increment root nonce
        uint256 rootNonce = StorageSlot.getUint256Slot(_ROOT_NONCE_SLOT).value + 1;
        StorageSlot.getUint256Slot(_ROOT_NONCE_SLOT).value = rootNonce;

        // Store new submission
        mapping(bytes32 => Submission) storage merkleRoots = _getMerkleRootsStorage();
        merkleRoots[merkleRoot] = Submission(
            merkleRoot,
            metadata,
            lock,
            block.number,
            block.number
        );

        emit NewRootSubmission(merkleRoot, lock, metadata, metadata);
        return sha256(abi.encodePacked(merkleRoot));
    }

    /// @notice Update metadata & lock for an existing Merkle root
    /// @param merkleRoot The merkle root of the tree we look up
    /// @param newMetadata Additional data (JSON?) stored with the tree.
    /// @param lock Whether or not the submission should be locked, cannot upgrade after that.
    /// @return submission Returns the updated submission
    function updateMetadataOnMerkleRootHash(
        bytes32 merkleRoot,
        string calldata newMetadata,
        bool lock
    ) external onlyRole(OPERATIONAL_ADMIN_ROLE) returns (Submission memory) {
        mapping(bytes32 => Submission) storage merkleRoots = _getMerkleRootsStorage();
        Submission storage prevSubmission = merkleRoots[merkleRoot];

        require(!prevSubmission.lock, "Submission is locked");
        require(prevSubmission.submittedOn != 0, "Submission does not exist");

        prevSubmission.metadata = newMetadata;
        prevSubmission.lock = lock;
        prevSubmission.updatedOn = block.number;

        emit RootMetadataModification(merkleRoot, lock, newMetadata);
        return prevSubmission;
    }

    /// @notice Update lock on the data in the hash
    /// @param merkleRoot The merkle root of the tree we look up to lock
    /// @return Submission Returns the submission in its final, locked state.
    function lockMetadataOnMerkleRootHash(
        bytes32 merkleRoot
    ) external onlyRole(OPERATIONAL_ADMIN_ROLE) returns (Submission memory) {
        mapping(bytes32 => Submission) storage merkleRoots = _getMerkleRootsStorage();
        Submission storage prevSubmission = merkleRoots[merkleRoot];

        require(!prevSubmission.lock, "Submission was already locked");
        require(prevSubmission.submittedOn != 0, "Submission does not exist");

        prevSubmission.lock = true;
        prevSubmission.updatedOn = block.number;

        emit RootMetadataModification(merkleRoot, true, prevSubmission.metadata);
        return prevSubmission;
    }

    /// @notice Get submission details by index
    /// @param merkleRoot Returns the Submission of a merkle tree
    /// @return Submission The submission for a given merkleRoot
    function getMerkleRootOnHash(bytes32 merkleRoot) external view returns (Submission memory) {
        mapping(bytes32 => Submission) storage merkleRoots = _getMerkleRootsStorage();
        return merkleRoots[merkleRoot];
    }

    /// @notice Get the total number of Merkle roots submitted
    /// @return numberMerkleRoots Returns the number of Merkle Roots stored in the contract
    function getNumberOfMerkleRoots() external view returns (uint256) {
        return StorageSlot.getUint256Slot(_ROOT_NONCE_SLOT).value;
    }

    /// @dev Internal function to access the merkle roots storage
    /// @return merkleRoots Returns a mapping of a merkleRoot to submission data about the merkle tree
    function _getMerkleRootsStorage() private view returns (mapping(bytes32 => Submission) storage merkleRoots) {
        bytes32 slot = _MERKLE_ROOTS_SLOT;
        assembly {
            merkleRoots.slot := slot
        }
    }

    function version() external pure returns (string memory) {
        return "2.0.0";
    }
}
