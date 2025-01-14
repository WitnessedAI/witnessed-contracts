// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract UpgradableMerkleStoreV1 is Initializable, AccessControlUpgradeable, UUPSUpgradeable {
    uint256 private _rootNonce;
    mapping(bytes32 => Submission) private _merkleRoots;

    // Roles
    bytes32 public constant UPGRADE_ADMIN_ROLE = keccak256("UPGRADE_ADMIN_ROLE");
    bytes32 public constant OPERATIONAL_ADMIN_ROLE = keccak256("OPERATIONAL_ADMIN_ROLE");

    // Events
    event NewRootSubmission(bytes32 indexed idx);
    event RootModification(bytes32 indexed idx);

    struct Submission {
        string merkleRoot;
        string datafileURL;
        string batchMetadata; // Stringified JSON
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

        // // Assign roles using grantRole
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender); // Deployer is default admin initially
        _grantRole(UPGRADE_ADMIN_ROLE, gnosisSafe); // Assign Upgrade Admin
        _grantRole(OPERATIONAL_ADMIN_ROLE, operationalAdmin); // Assign Operational Admin

        // Set role admins
        _setRoleAdmin(UPGRADE_ADMIN_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(OPERATIONAL_ADMIN_ROLE, DEFAULT_ADMIN_ROLE);
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
        _rootNonce += 1;
        _merkleRoots[idx] = Submission(
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
        Submission storage prevSubmission = _merkleRoots[idx];

        if (prevSubmission.submittedOn == 0) {
            revert("Submission does not exist");
        }

        _merkleRoots[idx] = Submission(
            prevSubmission.merkleRoot,
            prevSubmission.datafileURL,
            newMetadata,
            prevSubmission.submittedOn,
            block.number
        );

        emit RootModification(idx);
        return _merkleRoots[idx];
    }

    /// @notice Get submission details by index
    function getMerkleRootOnHash(bytes32 idx) external view returns (Submission memory) {
        return _merkleRoots[idx];
    }

    /// @notice Get the total number of Merkle roots submitted
    function getNumberOfMerkleRoots() external view returns (uint256) {
        return _rootNonce;
    }

    function version() external pure returns (string memory) {
        return "1.0.0";
    }
}
