import { ethers, upgrades } from "hardhat";

import {
  TokenV1__factory,
  TransparentUpgradeableProxy__factory,
  ProxyAdmin__factory,
  TokenV1,
} from "../typechain-types";

export async function deployFixture() {
  const [owner, alice] = await ethers.getSigners();

  const tokenV1Impl = await new TokenV1__factory(owner).deploy();

  const data = tokenV1Impl.interface.encodeFunctionData("initialize", [
    "TokenName",
    "TKN",
  ]);

  const proxyAdmin = await new ProxyAdmin__factory(owner).deploy();

  const TUProxy = await new TransparentUpgradeableProxy__factory(owner).deploy(
    tokenV1Impl.address,
    proxyAdmin.address,
    data
  );

  const tokenV1Proxy = new TokenV1__factory(owner).attach(TUProxy.address);

  return { owner, alice, tokenV1Impl, proxyAdmin, tokenV1Proxy };
}

export async function deployUpgradesFixture() {
  const [owner, alice] = await ethers.getSigners();

  const TokenV1ImplFactory = new TokenV1__factory(owner);

  const tokenV1Proxy = (await upgrades.deployProxy(
    TokenV1ImplFactory,
    ["TokenName", "TKN"],
    { initializer: "initialize", kind: "transparent" }
  )) as TokenV1;

  const tokenV1ImplAddress = await upgrades.erc1967.getImplementationAddress(
    tokenV1Proxy.address
  );

  const tokenV1Impl = new TokenV1__factory(owner).attach(tokenV1ImplAddress);

  return { tokenV1Proxy, alice, owner, tokenV1Impl };
}
