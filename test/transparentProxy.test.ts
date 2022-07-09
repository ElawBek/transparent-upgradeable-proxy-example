import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { parseEther } from "ethers/lib/utils";
import { signERC2612Permit } from "eth-permit";
import { constants } from "ethers";

import { deployFixture, changeImplementationFixture } from "./helpers/fixtures";

describe("Transparent upgradeable proxy", function () {
  describe("Deployment", () => {
    it("Admin state", async () => {
      const { proxyAdmin, tokenV1, tokenV1Impl, owner } = await loadFixture(
        deployFixture
      );

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
      const { tokenV1, owner } = await loadFixture(deployFixture);

      expect([
        await tokenV1.name(), // proxy token name
        await tokenV1.symbol(), // proxy token symbol
        await tokenV1.owner(), // proxy token owner
      ]).to.deep.eq(["TokenName", "TKN", owner.address]);
    });

    describe("Origin contract", () => {
      it("Should be an error when trying to initialize the origin contract", async () => {
        const { tokenV1Impl } = await loadFixture(deployFixture);

        await expect(
          tokenV1Impl.initialize("OriginRevert", "RVT")
        ).to.revertedWith("Initializable: contract is already initialized");
      });

      it("Origin implementation's state", async () => {
        const { tokenV1Impl } = await loadFixture(deployFixture);

        expect([
          await tokenV1Impl.name(), // origin name
          await tokenV1Impl.symbol(), // origin symbol
          await tokenV1Impl.owner(), // origin owner
        ]).to.deep.eq(["", "", constants.AddressZero]);
      });
    });

    describe("Change implementation", () => {
      it("State after upgrade", async () => {
        const { alice, owner, tokenV2 } = await loadFixture(
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
        const { alice, owner, tokenV2 } = await loadFixture(
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
