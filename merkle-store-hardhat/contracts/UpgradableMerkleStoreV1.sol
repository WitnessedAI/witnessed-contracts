// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/StorageSlot.sol";

contract UpgradableMerkleStoreV1 is Initializable, AccessControlUpgradeable, UUPSUpgradeable {
    // Storage slots for variables
    bytes32 private constant _ROOT_NONCE_SLOT = keccak256("upgradable.merkle.store.root.nonce");
    bytes32 private constant _MERKLE_ROOTS_SLOT = keccak256("upgradable.merkle.store.merkle.roots");

    // Roles
    bytes32 public constant UPGRADE_ADMIN_ROLE = keccak256("UPGRADE_ADMIN_ROLE");
    bytes32 public constant OPERATIONAL_ADMIN_ROLE = keccak256("OPERATIONAL_ADMIN_ROLE");

    // Events
    event NewRootSubmission(bytes32 indexed idx);
    event RootModification(bytes32 indexed idx);

    struct Submission {
        string merkleRoot;
        string datafileURL;
        string batchMetadata;
        uint256 submittedOn;
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
    function submitNewMerkleRootWithMetadata(
        bytes32 idx,
        string calldata merkleRoot,
        string calldata datafileURL,
        string calldata roundMetadata
    ) external onlyRole(OPERATIONAL_ADMIN_ROLE) returns (bytes32) {
        // Increment root nonce
        uint256 rootNonce = StorageSlot.getUint256Slot(_ROOT_NONCE_SLOT).value + 1;
        StorageSlot.getUint256Slot(_ROOT_NONCE_SLOT).value = rootNonce;

        // Store new submission
        mapping(bytes32 => Submission) storage merkleRoots = _getMerkleRootsStorage();
        merkleRoots[idx] = Submission(
            merkleRoot,
            datafileURL,
            roundMetadata,
            block.number,
            block.number
        );

        emit NewRootSubmission(idx);
        return sha256(abi.encodePacked(merkleRoot));
    }

    /// @notice Update metadata for an existing Merkle root
    function updateMetadataOnMerkleRootHash(
        bytes32 idx,
        string calldata newMetadata
    ) external onlyRole(OPERATIONAL_ADMIN_ROLE) returns (Submission memory) {
        mapping(bytes32 => Submission) storage merkleRoots = _getMerkleRootsStorage();
        Submission storage prevSubmission = merkleRoots[idx];

        require(prevSubmission.submittedOn != 0, "Submission does not exist");

        prevSubmission.batchMetadata = newMetadata;
        prevSubmission.updatedOn = block.number;

        emit RootModification(idx);
        return prevSubmission;
    }

    /// @notice Get submission details by index
    function getMerkleRootOnHash(bytes32 idx) external view returns (Submission memory) {
        mapping(bytes32 => Submission) storage merkleRoots = _getMerkleRootsStorage();
        return merkleRoots[idx];
    }

    /// @notice Get the total number of Merkle roots submitted
    function getNumberOfMerkleRoots() external view returns (uint256) {
        return StorageSlot.getUint256Slot(_ROOT_NONCE_SLOT).value;
    }

    /// @dev Internal function to access the merkle roots storage
    function _getMerkleRootsStorage() private view returns (mapping(bytes32 => Submission) storage merkleRoots) {
        bytes32 slot = _MERKLE_ROOTS_SLOT;
        assembly {
            merkleRoots.slot := slot
        }
    }

    function version() external pure returns (string memory) {
        return "1.0.0";
    }
}
