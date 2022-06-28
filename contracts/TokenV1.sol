// SPDX-License-Identifier: MIT

pragma solidity ^0.8.15;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title TokenV1
 * @author Dmitry K. (@elawbek)
 *
 * @dev version 1 of the token implementation for the transparent-upgradeable proxy example
 */
contract TokenV1 is
  Initializable,
  ERC20Upgradeable,
  ERC20BurnableUpgradeable,
  OwnableUpgradeable
{
  /**
   * @dev disable the `initialize` function for the origin contract
   * @custom:oz-upgrades-unsafe-allow constructor
   */
  constructor() {
    _disableInitializers();
  }

  /**
   * @notice initialize contract: set name and symbol for the token
   *
   * @dev this function is executed only once, as a constructor (for a proxy)
   */
  function initialize(string calldata _name, string calldata _symbol)
    external
    initializer
  {
    __ERC20_init(_name, _symbol);
    __ERC20Burnable_init();
    __Ownable_init();
  }

  function mint(address to, uint256 amount) external onlyOwner {
    _mint(to, amount);
  }
}
