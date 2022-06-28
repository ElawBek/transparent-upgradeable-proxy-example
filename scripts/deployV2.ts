import { ethers, run } from "hardhat";
import { parseEther } from "ethers/lib/utils";

import {
  TokenV2__factory,
  ProxyAdmin__factory,
  TransparentUpgradeableProxy__factory,
} from "../typechain-types";

const ADMIN_ADDRESS = "";
const PROXY_ADDRESS = "";

async function main() {
  const [signer] = await ethers.getSigners();

  const tokenV2Impl = await new TokenV2__factory(signer).deploy();
  await tokenV2Impl.deployed();

  const data = tokenV2Impl.interface.encodeFunctionData("permitInit");

  const proxyAdmin = new ProxyAdmin__factory(signer).attach(ADMIN_ADDRESS);
  const tx = await proxyAdmin.upgradeAndCall(
    PROXY_ADDRESS,
    tokenV2Impl.address,
    data
  );
  await tx.wait();

  await run("verify:verify", {
    address: tokenV2Impl.address,
    contract: "contracts/TokenV2.sol:TokenV2",
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
