import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { parseEther } from "ethers/lib/utils";
import { signERC2612Permit } from "eth-permit";
import { constants } from "ethers";

import { deployFixture } from "./fixtures";
import {
  ProxyAdmin,
  TokenV1,
  TokenV2,
  TokenV2__factory,
} from "../typechain-types";

describe("Transparent upgradeable proxy", function () {
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;

  let tokenV1Impl: TokenV1;
  let tokenV1Proxy: TokenV1;
  let proxyAdmin: ProxyAdmin;

  let implV2: TokenV2;

  describe("Version 1", () => {
    beforeEach(async () => {
      ({ owner, alice, tokenV1Impl, tokenV1Proxy, proxyAdmin } =
        await loadFixture(deployFixture));
    });

    describe("Deployment", () => {
      it("Admin state", async () => {
        expect([
          await proxyAdmin.getProxyImplementation(tokenV1Proxy.address), // current implementation of proxy contract
          await proxyAdmin.getProxyAdmin(tokenV1Proxy.address),
          await proxyAdmin.owner(), // contract's owner
        ]).to.deep.eq([
          tokenV1Impl.address, // origin address
          proxyAdmin.address, // admin's address
          owner.address, // owner of admin contract
        ]);
      });

      it("Proxy state", async () => {
        expect([
          await tokenV1Proxy.name(), // proxy token name
          await tokenV1Proxy.symbol(), // proxy token symbol
          await tokenV1Proxy.owner(), // proxy token owner
        ]).to.deep.eq(["TokenName", "TKN", owner.address]);
      });

      describe("Origin contract", () => {
        it("Attempt to initialize the origin contract should revert", async () => {
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

      describe("Version 2", () => {
        let data: any;

        beforeEach(async () => {
          implV2 = await new TokenV2__factory(owner).deploy();
          data = implV2.interface.encodeFunctionData("permitInit");
        });

        it("Ownable check", async () => {
          await expect(
            proxyAdmin
              .connect(alice)
              .upgradeAndCall(tokenV1Proxy.address, implV2.address, data)
          ).to.revertedWith("Ownable: caller is not the owner");
        });

        it("State after upgrade", async () => {
          await proxyAdmin.upgradeAndCall(
            tokenV1Proxy.address,
            implV2.address,
            data
          );

          const tokenV2 = new TokenV2__factory(owner).attach(
            tokenV1Proxy.address
          );

          expect([
            await tokenV2.name(), // token name
            await tokenV2.symbol(), // token symbol
            await tokenV2.owner(), // token owner
          ]).to.deep.eq(["TokenName", "TKN", owner.address]);
        });

        it("New methods with V2", async () => {
          await proxyAdmin.upgradeAndCall(
            tokenV1Proxy.address,
            implV2.address,
            data
          );

          const tokenV2 = new TokenV2__factory(owner).attach(
            tokenV1Proxy.address
          );
          await tokenV2.mint(alice.address, parseEther("1000"));
          await tokenV2.mint(owner.address, parseEther("1000"));

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
});
