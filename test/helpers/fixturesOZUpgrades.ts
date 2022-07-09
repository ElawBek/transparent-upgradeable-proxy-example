import { ethers, upgrades } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { parseEther } from "ethers/lib/utils";

import {
  TokenV1__factory,
  TokenV1,
  TokenV2__factory,
  TokenV2,
} from "../../typechain-types";

export async function deployFixture() {
  const [owner, alice] = await ethers.getSigners();

  const TokenV1ImplFactory = new TokenV1__factory(owner);

  const tokenV1 = (await upgrades.deployProxy(
    TokenV1ImplFactory,
    ["TokenName", "TKN"],
    { initializer: "initialize", kind: "transparent" }
  )) as TokenV1;

  const tokenV1ImplAddress = await upgrades.erc1967.getImplementationAddress(
    tokenV1.address
  );

  const originImpl = new TokenV1__factory(owner).attach(tokenV1ImplAddress);

  return { tokenV1, alice, owner, originImpl };
}

export async function changeImplementationFixture() {
  const { owner, alice, tokenV1 } = await loadFixture(deployFixture);

  await tokenV1.mint(owner.address, parseEther("1000"));
  await tokenV1.mint(alice.address, parseEther("1000"));

  const ImplFactory = new TokenV2__factory(owner);

  const tokenV2 = (await upgrades.upgradeProxy(tokenV1.address, ImplFactory, {
    call: "permitInit",
    kind: "transparent",
  })) as TokenV2;

  return { tokenV2, alice, owner };
}
