// SPDX-License-Identifier: MIT

pragma solidity ^0.8.15;

import "./TokenV1.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/draft-ERC20PermitUpgradeable.sol";

/**
 * @title TokenV1
 * @author Dmitry K. (@elawbek)
 *
 * @dev version 2 of the token implementation for the transparent-upgradeable proxy example
 * note: avoid storage collisions!
 * there are two ways to achieve this:
 * 1. to inherit directly from the first version
 * 2. add the necessary changes to the first version of the contract
 * without changing the positions of the state variables
 * (define the new variables below the existing ones)
 */
contract TokenV2 is TokenV1, ERC20PermitUpgradeable {
  /// @notice hardcode contract version value so that the function `permitInit` is triggered only once
  uint8 private constant VERSION = 2;

  /// @notice initialize permit functionality
  function permitInit() external reinitializer(VERSION) {
    __ERC20Permit_init(name());
  }
}
