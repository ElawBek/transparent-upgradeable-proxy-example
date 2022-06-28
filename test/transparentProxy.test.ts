import { expect } from "chai";
import { ethers } from "hardhat";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { parseEther } from "ethers/lib/utils";
import { signERC2612Permit } from "eth-permit";

import {
  TokenV1,
  TokenV1__factory,
  TokenV2,
  TokenV2__factory,
  ProxyAdmin,
  ProxyAdmin__factory,
  TransparentUpgradeableProxy__factory,
} from "../typechain-types";
import { constants } from "ethers";

describe("Transparent upgradeable proxy", function () {
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;

  let proxyAdmin: ProxyAdmin;
  let tokenV1Impl: TokenV1;

  let tokenV1: TokenV1;
  let tokenV2: TokenV2;

  beforeEach(async () => {
    [owner, alice] = await ethers.getSigners();

    tokenV1Impl = await new TokenV1__factory(owner).deploy();

    const data = tokenV1Impl.interface.encodeFunctionData("initialize", [
      "TokenName",
      "TKN",
    ]);

    proxyAdmin = await new ProxyAdmin__factory(owner).deploy();

    const TUP = await new TransparentUpgradeableProxy__factory(owner).deploy(
      tokenV1Impl.address,
      proxyAdmin.address,
      data
    );

    tokenV1 = new TokenV1__factory(owner).attach(TUP.address);
  });

  describe("Deployment", () => {
    it("Admin state", async () => {
      expect([
        await proxyAdmin.getProxyImplementation(tokenV1.address), // current implementation of proxy contract
        await proxyAdmin.getProxyAdmin(tokenV1.address),
        await proxyAdmin.owner(), // contract's owner
      ]).to.deep.eq([
        tokenV1Impl.address, // origin address
        proxyAdmin.address, // admin's address
        owner.address, // owner of admin contract
      ]);
    });

    it("Proxy state", async () => {
      expect([
        await tokenV1.name(), // proxy token name
        await tokenV1.symbol(), // proxy token symbol
        await tokenV1.owner(), // proxy token owner
      ]).to.deep.eq(["TokenName", "TKN", owner.address]);
    });

    describe("Origin contract", () => {
      it("Should be an error when trying to initialize the origin contract", async () => {
        await expect(
          tokenV1Impl.initialize("OriginRevert", "RVT")
        ).to.revertedWith("Initializable: contract is already initialized");
      });

      it("Origin implementation's state", async () => {
        expect([
          await tokenV1Impl.name(), // origin name
          await tokenV1Impl.symbol(), // origin symbol
          await tokenV1Impl.owner(), // origin owner
        ]).to.deep.eq(["", "", constants.AddressZero]);
      });
    });

    describe("Change implementation", () => {
      beforeEach(async () => {
        // some actions with proxy
        await tokenV1.mint(owner.address, parseEther("1000"));
        await tokenV1.mint(alice.address, parseEther("1000"));

        const tokenV2Impl = await new TokenV2__factory(owner).deploy();
        const data = tokenV2Impl.interface.encodeFunctionData("permitInit");

        await proxyAdmin.upgradeAndCall(
          tokenV1.address,
          tokenV2Impl.address,
          data
        );

        tokenV2 = new TokenV2__factory(owner).attach(tokenV1.address);
      });

      it("State after upgrade", async () => {
        expect([
          await tokenV2.name(), // token name
          await tokenV2.symbol(), // token symbol
          await tokenV2.owner(), // token owner
          await tokenV2.totalSupply(),
          await tokenV2.balanceOf(owner.address),
          await tokenV2.balanceOf(alice.address),
        ]).to.deep.eq([
          "TokenName",
          "TKN",
          owner.address,
          parseEther("2000"),
          parseEther("1000"),
          parseEther("1000"),
        ]);
      });

      it("New methods with V2", async () => {
        const signature = await signERC2612Permit(
          alice,
          tokenV2.address,
          alice.address,
          owner.address,
          parseEther("500").toString()
        );

        await tokenV2
          .connect(owner)
          .permit(
            alice.address,
            owner.address,
            parseEther("500"),
            signature.deadline,
            signature.v,
            signature.r,
            signature.s
          );

        await tokenV2
          .connect(owner)
          .transferFrom(alice.address, owner.address, parseEther("500"));

        expect([
          await tokenV2.balanceOf(owner.address),
          await tokenV2.balanceOf(alice.address),
        ]).to.deep.eq([parseEther("1500"), parseEther("500")]);
      });
    });
  });
});
