import { expect } from "chai";
import { ethers, upgrades } from "hardhat";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { parseEther } from "ethers/lib/utils";

import { signERC2612Permit } from "eth-permit";

import {
  TokenV1,
  TokenV1__factory,
  TokenV2,
  TokenV2__factory,
} from "../typechain-types";
import { constants } from "ethers";

describe("Transparent upgradeable proxy", function () {
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;

  let tokenV1: TokenV1;
  let tokenV2: TokenV2;

  beforeEach(async () => {
    [owner, alice] = await ethers.getSigners();

    const TokenV1ImplFactory = new TokenV1__factory(owner);

    tokenV1 = (await upgrades.deployProxy(
      TokenV1ImplFactory,
      ["TokenName", "TKN"],
      { initializer: "initialize", kind: "transparent" }
    )) as TokenV1;
  });

  describe("Deployment", () => {
    it("Admin state", async () => {
      // This is the keccak-256 hash of "eip1967.proxy.admin" subtracted by 1
      const adminAddress = await upgrades.erc1967.getAdminAddress(
        tokenV1.address
      );

      // adminContract instance
      const adminContract = (await upgrades.admin.getInstance()).attach(
        adminAddress
      );

      expect([
        await adminContract.getProxyImplementation(tokenV1.address), // current implementation of proxy contract
        await adminContract.getProxyAdmin(tokenV1.address),
        await adminContract.owner(), // contract's owner
      ]).to.deep.eq([
        await upgrades.erc1967.getImplementationAddress(tokenV1.address),
        adminAddress, // admin's' address
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
      let originImpl: TokenV1;

      beforeEach(async () => {
        const tokenV1ImplAddress =
          await upgrades.erc1967.getImplementationAddress(tokenV1.address);

        originImpl = new TokenV1__factory(owner).attach(tokenV1ImplAddress);
      });

      it("Should be an error when trying to initialize the origin contract", async () => {
        await expect(
          originImpl.initialize("OriginRevert", "RVT")
        ).to.revertedWith("Initializable: contract is already initialized");
      });

      it("Origin implementation's state", async () => {
        expect([
          await originImpl.name(), // origin name
          await originImpl.symbol(), // origin symbol
          await originImpl.owner(), // origin owner
        ]).to.deep.eq(["", "", constants.AddressZero]);
      });
    });

    describe("Change implementation", () => {
      beforeEach(async () => {
        // some actions with proxy
        await tokenV1.mint(owner.address, parseEther("1000"));
        await tokenV1.mint(alice.address, parseEther("1000"));

        const ImplFactory = new TokenV2__factory(owner);

        tokenV2 = (await upgrades.upgradeProxy(tokenV1.address, ImplFactory, {
          call: "permitInit",
          kind: "transparent",
        })) as TokenV2;
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
