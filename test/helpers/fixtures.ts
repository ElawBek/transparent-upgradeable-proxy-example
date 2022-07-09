import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { parseEther } from "ethers/lib/utils";
import {
  TokenV1__factory,
  TokenV2__factory,
  TransparentUpgradeableProxy__factory,
  ProxyAdmin__factory,
} from "../../typechain-types";

export async function deployFixture() {
  const [owner, alice] = await ethers.getSigners();

  const tokenV1Impl = await new TokenV1__factory(owner).deploy();

  const data = tokenV1Impl.interface.encodeFunctionData("initialize", [
    "TokenName",
    "TKN",
  ]);

  const proxyAdmin = await new ProxyAdmin__factory(owner).deploy();

  const TUP = await new TransparentUpgradeableProxy__factory(owner).deploy(
    tokenV1Impl.address,
    proxyAdmin.address,
    data
  );

  const tokenV1 = new TokenV1__factory(owner).attach(TUP.address);

  return { owner, alice, tokenV1Impl, proxyAdmin, tokenV1 };
}

export async function changeImplementationFixture() {
  const { owner, alice, tokenV1, proxyAdmin } = await loadFixture(
    deployFixture
  );

  await tokenV1.mint(owner.address, parseEther("1000"));
  await tokenV1.mint(alice.address, parseEther("1000"));

  const tokenV2Impl = await new TokenV2__factory(owner).deploy();
  const data = tokenV2Impl.interface.encodeFunctionData("permitInit");

  await proxyAdmin.upgradeAndCall(tokenV1.address, tokenV2Impl.address, data);

  const tokenV2 = new TokenV2__factory(owner).attach(tokenV1.address);

  return { owner, alice, proxyAdmin, tokenV2 };
}
