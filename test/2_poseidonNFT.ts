import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";
import { EtherscanConfig } from "@nomiclabs/hardhat-etherscan/dist/src/types";

let sampleData = new Map<string, string>();

sampleData.set("tokenName","Poseidon DAO Token");
sampleData.set("tokenSymbol","PDN");
sampleData.set("tokenTotalSupply","1000000000");
sampleData.set("tokenDecimals","18");
sampleData.set("zeroAddress", "0x0000000000000000000000000000000000000000");
sampleData.set("oneEther", "1000000000000000000");
sampleData.set("oneGWei","1000000000000000");
sampleData.set("oneWei","1");
sampleData.set("ERC1155ID","1");
sampleData.set("ratio","1000000000000000"); // = 1 GWei
sampleData.set("ERC1155Uri", "#");
sampleData.set("durationInBlocks", "5760");
sampleData.set("newDurationInBlocks", "6000");

enum vestMetaDataIndex {
  amount,
  expirationBlockHeight
}

describe("Poseidon NFT", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployTokenERC20Fixture() {
    

    // Contracts are deployed using the first signer/account by default
    const [owner, add1, add2] = await ethers.getSigners();

    const PoseidonToken = await ethers.getContractFactory("ERC20_PDN");
    const poseidonToken = await PoseidonToken.deploy();

    return { poseidonToken, owner, add1, add2 };
  }

  async function deployTokenERC1155Fixture() {
    let sampleData = new Map<string, string>();
    sampleData.set("zeroAddress", "0x0000000000000000000000000000000000000000");
    sampleData.set("oneGWei","1000000000000000");

    // Contracts are deployed using the first signer/account by default
    const [owner, add1, add2] = await ethers.getSigners();

    const PoseidonNFT = await ethers.getContractFactory("ERC1155_PDN");
    const poseidonNFT = await PoseidonNFT.deploy();

    return { poseidonNFT, owner, add1, add2, sampleData };
  }


  describe("Initialize", function () {
    it("Initialize Upgradeable NFT Smart Contract", async function () {
      const { poseidonToken, owner} = await deployTokenERC20Fixture();
      await poseidonToken.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply")),
        ethers.BigNumber.from(sampleData.get("tokenDecimals"))
        );
      const { poseidonNFT } = await deployTokenERC1155Fixture();
      await poseidonNFT.connect(owner).initialize(String(sampleData.get("ERC1155Uri")), poseidonToken.address);
      expect(await poseidonNFT.callStatic.ERC20Address()).to.equals(poseidonToken.address);
      expect(await poseidonNFT.callStatic.owner()).to.equals(owner.address);
    });
  });

  describe("Mint and Transfer Functions", function () {
    it("No one except ERC20 Address can Mint", async function () {
      const { poseidonToken, owner} = await deployTokenERC20Fixture();
      await poseidonToken.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply")),
        ethers.BigNumber.from(sampleData.get("tokenDecimals"))
        );
      const { poseidonNFT } = await deployTokenERC1155Fixture();
      await expect(poseidonNFT.connect(owner).mint(owner.address, 0, 1, "0x00000000"))
      .to.be.revertedWith("ADDRESS_DISMATCH");
    });

    it("Safe Transfer From is reverted", async function () {
      const { poseidonToken, owner, add1} = await deployTokenERC20Fixture();
      await poseidonToken.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply")),
        ethers.BigNumber.from(sampleData.get("tokenDecimals"))
        );
      const { poseidonNFT } = await deployTokenERC1155Fixture();
      await expect(poseidonNFT.connect(owner).safeTransferFrom(owner.address, add1.address, 0, 1, "0x00000000"))
      .to.be.reverted;
    });

    it("Safe Batch Transfer From is reverted", async function () {
      const { poseidonToken, owner, add1} = await deployTokenERC20Fixture();
      await poseidonToken.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply")),
        ethers.BigNumber.from(sampleData.get("tokenDecimals"))
        );
      const { poseidonNFT } = await deployTokenERC1155Fixture();
      await expect(poseidonNFT.connect(owner).safeBatchTransferFrom(owner.address, add1.address, [0,1], [1,2], "0x00000000"))
      .to.be.reverted;
    });

  });

  

});
