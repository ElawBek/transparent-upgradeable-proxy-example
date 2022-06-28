// SPDX-License-Identifier: MIT

pragma solidity ^0.8.15;

import "./TokenV1.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/draft-ERC20PermitUpgradeable.sol";

contract TokenV2 is TokenV1, ERC20PermitUpgradeable {
  uint8 private constant VERSION = 2;

  function permitInit() external reinitializer(VERSION) {
    __ERC20Permit_init(name());
  }
}
