// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Verifier.sol";

/**
 * @title ZKVoting
 * @notice Decentralized privacy-preserving e-voting contract using Groth16 ZK proofs.
 * @dev Works in tandem with a ZoKrates-generated Verifier contract.
 *      Voters submit zk-SNARK proofs proving they are registered (Merkle inclusion)
 *      without revealing their identity. A unique nullifier prevents double voting.
 */
contract ZKVoting {
    // ================================================================
    //  State
    // ================================================================

    Verifier public verifier;
    address public admin;

    string public electionTitle;
    string[] public candidates;
    uint256 public merkleRoot;
    bool public electionActive;

    /// @notice Tracks used nullifier hashes to prevent double voting.
    mapping(uint256 => bool) public nullifierUsed;

    /// @notice Candidate index → vote count.
    mapping(uint256 => uint256) public candidateTally;

    /// @notice Total number of votes cast.
    uint256 public totalVotes;

    // ================================================================
    //  Events
    // ================================================================

    event VoteCast(
        uint256 indexed nullifierHash,
        uint256 indexed candidateIndex,
        uint256 timestamp
    );

    event ElectionStarted(string title, uint256 timestamp);
    event ElectionEnded(uint256 timestamp);

    // ================================================================
    //  Modifiers
    // ================================================================

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    modifier electionIsActive() {
        require(electionActive, "Election not active");
        _;
    }

    // ================================================================
    //  Constructor
    // ================================================================

    /**
     * @param _verifier Address of the deployed Groth16 Verifier contract.
     */
    constructor(address _verifier) {
        verifier = Verifier(_verifier);
        admin = msg.sender;
    }

    // ================================================================
    //  Admin Functions
    // ================================================================

    /**
     * @notice Configure a new election. Can only be called when no election is active.
     * @param _title   Human-readable election title.
     * @param _candidates  Array of candidate names.
     * @param _merkleRoot  Root of the voter-registry Merkle tree.
     */
    function setupElection(
        string memory _title,
        string[] memory _candidates,
        uint256 _merkleRoot
    ) external onlyAdmin {
        require(!electionActive, "Election already active");
        require(_candidates.length > 0, "No candidates provided");
        require(_merkleRoot != 0, "Invalid Merkle root");

        electionTitle = _title;
        candidates = _candidates;
        merkleRoot = _merkleRoot;

        // Reset tallies
        for (uint256 i = 0; i < _candidates.length; i++) {
            candidateTally[i] = 0;
        }
        totalVotes = 0;
    }

    /**
     * @notice Start the election. Requires candidates and Merkle root to be set.
     */
    function startElection() external onlyAdmin {
        require(candidates.length > 0, "No candidates");
        require(merkleRoot != 0, "Merkle root not set");
        require(!electionActive, "Already active");
        electionActive = true;
        emit ElectionStarted(electionTitle, block.timestamp);
    }

    /**
     * @notice End the election. No more votes can be cast.
     */
    function endElection() external onlyAdmin {
        require(electionActive, "Not active");
        electionActive = false;
        emit ElectionEnded(block.timestamp);
    }

    // ================================================================
    //  Voting
    // ================================================================

    /**
     * @notice Cast a vote by submitting a valid Groth16 proof.
     * @param _proof         The zk-SNARK proof (a, b, c G-points).
     * @param _publicInputs  [merkleRoot, nullifierHash, candidateIndex, maxCandidates, returnValue]
     *                       The 5th element is the circuit return value (must be 1 = valid).
     */
    function castVote(
        Verifier.Proof memory _proof,
        uint256[5] memory _publicInputs
    ) external electionIsActive {
        uint256 _merkleRoot    = _publicInputs[0];
        uint256 _nullifier     = _publicInputs[1];
        uint256 _candidateIdx  = _publicInputs[2];
        uint256 _maxCandidates = _publicInputs[3];
        uint256 _returnValue   = _publicInputs[4];

        // --- Checks ---
        require(_returnValue == 1, "Invalid circuit return value");
        require(_merkleRoot == merkleRoot, "Invalid Merkle root");
        require(!nullifierUsed[_nullifier], "Already voted");
        require(_candidateIdx < candidates.length, "Invalid candidate");
        require(
            _maxCandidates == candidates.length,
            "Candidate count mismatch"
        );

        // --- Verify ZKP on-chain ---
        require(
            verifier.verifyTx(_proof, _publicInputs),
            "Invalid ZK proof"
        );

        // --- Record vote ---
        nullifierUsed[_nullifier] = true;
        candidateTally[_candidateIdx] += 1;
        totalVotes += 1;

        emit VoteCast(_nullifier, _candidateIdx, block.timestamp);
    }

    // ================================================================
    //  View Functions
    // ================================================================

    /**
     * @notice Get the number of candidates.
     */
    function getCandidateCount() external view returns (uint256) {
        return candidates.length;
    }

    /**
     * @notice Get the name of a candidate by index.
     */
    function getCandidateName(
        uint256 index
    ) external view returns (string memory) {
        require(index < candidates.length, "Index out of bounds");
        return candidates[index];
    }

    /**
     * @notice Get the current tally for a candidate.
     */
    function getCandidateTally(
        uint256 index
    ) external view returns (uint256) {
        require(index < candidates.length, "Index out of bounds");
        return candidateTally[index];
    }
}
