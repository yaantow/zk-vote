// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Verifier.sol";

/**
 * @title MockVerifier
 * @notice A mock verifier that always returns true for testing purposes.
 * @dev Used in E2E integration tests to bypass ZKP verification when
 *      the trusted setup has not been completed. All vote logic in
 *      ZKVoting.sol still runs (nullifier checks, candidate validation, etc.)
 */
contract MockVerifier is Verifier {
    /**
     * @notice Override verifyTx to always return true.
     */
    function verifyTx(
        Proof memory,
        uint256[4] memory
    ) public pure override returns (bool) {
        return true;
    }
}
