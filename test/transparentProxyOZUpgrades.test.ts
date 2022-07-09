import { expect } from "chai";
import { upgrades } from "hardhat";

import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import {
  deployFixture,
  changeImplementationFixture,
} from "./helpers/fixturesOZUpgrades";

import { parseEther } from "ethers/lib/utils";
import { constants } from "ethers";

import { signERC2612Permit } from "eth-permit";

describe("Transparent upgradeable proxy", function () {
  describe("Deployment", () => {
    it("Admin state", async () => {
      const { tokenV1, owner } = await loadFixture(deployFixture);

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
      const { owner, tokenV1 } = await loadFixture(deployFixture);

      expect([
        await tokenV1.name(), // proxy token name
        await tokenV1.symbol(), // proxy token symbol
        await tokenV1.owner(), // proxy token owner
      ]).to.deep.eq(["TokenName", "TKN", owner.address]);
    });

    describe("Origin contract", () => {
      it("Should be an error when trying to initialize the origin contract", async () => {
        const { originImpl } = await loadFixture(deployFixture);

        await expect(
          originImpl.initialize("OriginRevert", "RVT")
        ).to.revertedWith("Initializable: contract is already initialized");
      });

      it("Origin implementation's state", async () => {
        const { originImpl } = await loadFixture(deployFixture);

        expect([
          await originImpl.name(), // origin name
          await originImpl.symbol(), // origin symbol
          await originImpl.owner(), // origin owner
        ]).to.deep.eq(["", "", constants.AddressZero]);
      });
    });

    describe("Change implementation", () => {
      it("State after upgrade", async () => {
        const { tokenV2, alice, owner } = await loadFixture(
          changeImplementationFixture
        );

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
        const { tokenV2, alice, owner } = await loadFixture(
          changeImplementationFixture
        );

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
