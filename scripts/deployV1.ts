import { ethers, run } from "hardhat";
import { parseEther } from "ethers/lib/utils";

import {
  TokenV1__factory,
  ProxyAdmin__factory,
  TransparentUpgradeableProxy__factory,
} from "../typechain-types";

async function main() {
  const [signer] = await ethers.getSigners();

  const tokenV1Impl = await new TokenV1__factory(signer).deploy();
  await tokenV1Impl.deployed();

  const data = tokenV1Impl.interface.encodeFunctionData("initialize", [
    "SuperToken",
    "STKn",
  ]);

  const proxyAdmin = await new ProxyAdmin__factory(signer).deploy();
  await proxyAdmin.deployed();

  const transparentProxy = await new TransparentUpgradeableProxy__factory(
    signer
  ).deploy(tokenV1Impl.address, proxyAdmin.address, data);
  await transparentProxy.deployed();

  await run("verify:verify", {
    address: tokenV1Impl.address,
    contract: "contracts/TokenV1.sol:TokenV1",
  });

  await run("verify:verify", {
    address: proxyAdmin.address,
    contract: "contracts/openzeppelin/ProxyAdmin.sol:ProxyAdmin",
  });

  await run("verify:verify", {
    address: transparentProxy.address,
    contract:
      "contracts/openzeppelin/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy",
    constructorArguments: [tokenV1Impl.address, proxyAdmin.address, data],
  });

  const tokenV1 = new TokenV1__factory(signer).attach(transparentProxy.address);

  const tx = await tokenV1.mint(signer.address, parseEther("1000"));
  await tx.wait();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
