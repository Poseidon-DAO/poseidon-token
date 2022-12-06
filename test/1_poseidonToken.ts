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

describe("Poseidon Token", function () {
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
    it("Initialize Upgradeable Token", async function () {
      const { poseidonToken, owner} = await deployTokenERC20Fixture();
      await poseidonToken.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply")),
        ethers.BigNumber.from(sampleData.get("tokenDecimals"))
        );
      expect(await poseidonToken.balanceOf(owner.address)).to.equals(
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply"))
        .mul(ethers.BigNumber.from("10").pow(ethers.BigNumber.from(sampleData.get("tokenDecimals")))));
      expect(await poseidonToken.callStatic.owner()).to.equals(owner.address);
      const OwnerChangeEvent = await poseidonToken.queryFilter(poseidonToken.filters.OwnerChangeEvent());
      expect(OwnerChangeEvent[OwnerChangeEvent.length - 1].args.oldOwner).to.equals(sampleData.get("zeroAddress"));
      expect(OwnerChangeEvent[OwnerChangeEvent.length - 1].args.newOwner).to.equals(owner.address);
    });
  });

  describe("Token Basic Functionalities", function () {
    it("Run Airdrop", async function () {
      const { poseidonToken, owner, add1, add2} = await deployTokenERC20Fixture();
      await poseidonToken.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply")),
        ethers.BigNumber.from(sampleData.get("tokenDecimals"))
        );
      const addressToAirdrop = [add1.address, add2.address];
      const amountsToAirdrop = [ethers.BigNumber.from(sampleData.get("oneGWei")), ethers.BigNumber.from(sampleData.get("oneGWei"))];
      await poseidonToken.runAirdrop(addressToAirdrop, amountsToAirdrop);
      expect(await poseidonToken.balanceOf(add1.address)).to.equals(ethers.BigNumber.from(sampleData.get("oneGWei")));
      expect(await poseidonToken.balanceOf(add2.address)).to.equals(ethers.BigNumber.from(sampleData.get("oneGWei")));
      expect(await poseidonToken.balanceOf(owner.address)).to.equals(
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply")).mul(ethers.BigNumber.from("10").pow(ethers.BigNumber.from(sampleData.get("tokenDecimals"))))
        .sub(ethers.BigNumber.from(sampleData.get("oneGWei"))) // address1
        .sub(ethers.BigNumber.from(sampleData.get("oneGWei"))) // address2
        );
    });

    it("Run Airdrop - Array dimensions can't dismatch", async function () {
      const { poseidonToken, owner, add1} = await deployTokenERC20Fixture();
      await poseidonToken.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply")),
        ethers.BigNumber.from(sampleData.get("tokenDecimals"))
        );
      const addressToAirdrop = [add1.address];
      const amountsToAirdrop = [ethers.BigNumber.from(sampleData.get("oneGWei")), ethers.BigNumber.from(sampleData.get("oneGWei"))];
      await expect(poseidonToken.connect(owner).runAirdrop(addressToAirdrop, amountsToAirdrop)).to.be.revertedWith("DATA_DIMENSION_DISMATCH");
    });

    it("Run Airdrop - Non owner address can't run the function", async function () {
      const { poseidonToken, owner, add1, add2} = await deployTokenERC20Fixture();
      await poseidonToken.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply")),
        ethers.BigNumber.from(sampleData.get("tokenDecimals"))
        );
      const addressToAirdrop = [add1.address, add2.address];
      const amountsToAirdrop = [ethers.BigNumber.from(sampleData.get("oneGWei")), ethers.BigNumber.from(sampleData.get("oneGWei"))];
      await expect(poseidonToken.connect(add1).runAirdrop(addressToAirdrop, amountsToAirdrop)).to.be.revertedWith("ONLY_ADMIN_CAN_RUN_THIS_FUNCTION");
    });

    it("Run Airdrop - Can't put null values", async function () {
      const { poseidonToken, owner, add1, add2} = await deployTokenERC20Fixture();
      await poseidonToken.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply")),
        ethers.BigNumber.from(sampleData.get("tokenDecimals"))
        );
      const addressToAirdrop = [add1.address, add2.address];
      const amountsToAirdrop = [ethers.BigNumber.from("0"), ethers.BigNumber.from(sampleData.get("oneGWei"))];
      await expect(poseidonToken.runAirdrop(addressToAirdrop, amountsToAirdrop)).to.be.revertedWith("CANT_SET_NULL_VALUES");
    });

    it("Run Airdrop - Can't run function if available balance is lower than sum of elements", async function () {
      const { poseidonToken, owner, add1, add2} = await deployTokenERC20Fixture();
      await poseidonToken.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply")),
        ethers.BigNumber.from(sampleData.get("tokenDecimals"))
        );
      const addressToAirdrop = [add1.address, add2.address];
      const amountsToAirdrop = [ethers.BigNumber.from(sampleData.get("oneGWei")), ethers.BigNumber.from(sampleData.get("oneGWei"))];
      const tokenTotalSupply = ethers.BigNumber.from(sampleData.get("tokenTotalSupply")).mul(ethers.BigNumber.from("10").pow(ethers.BigNumber.from(sampleData.get("tokenDecimals"))));
      await poseidonToken.connect(owner).addVest(add1.address, tokenTotalSupply, ethers.BigNumber.from(sampleData.get("durationInBlocks")));
      await expect(poseidonToken.runAirdrop(addressToAirdrop, amountsToAirdrop)).to.be.revertedWith("INSUFFICIENT_OWNER_BALANCE");
    });

    it("Set ERC1155 Connection", async function () {
      const { poseidonToken, owner } = await deployTokenERC20Fixture();
      await poseidonToken.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply")),
        ethers.BigNumber.from(sampleData.get("tokenDecimals"))
        );
      const { poseidonNFT } = await deployTokenERC1155Fixture();
      await poseidonToken.setERC1155(
        poseidonNFT.address, 
        ethers.BigNumber.from(sampleData.get("ERC1155ID")), 
        ethers.BigNumber.from(sampleData.get("ratio")));
        expect(await poseidonToken.callStatic.ERC1155Address()).to.equals(poseidonNFT.address);
        expect(await poseidonToken.callStatic.ID_ERC1155()).to.equals(ethers.BigNumber.from(sampleData.get("ERC1155ID")));
        expect(await poseidonToken.callStatic.ratio()).to.equals(ethers.BigNumber.from(sampleData.get("ratio")));
    });

    it("Set ERC1155 Connection - Reverted if address is null", async function () {
      const { poseidonToken, owner } = await deployTokenERC20Fixture();
      await poseidonToken.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply")),
        ethers.BigNumber.from(sampleData.get("tokenDecimals"))
        );
      await expect(poseidonToken.setERC1155(
        String(sampleData.get("zeroAddress")), 
        ethers.BigNumber.from(sampleData.get("ERC1155ID")), 
        ethers.BigNumber.from(sampleData.get("ratio")))).to.be.revertedWith("ADDRESS_CANT_BE_NULL");
    });

    it("Set ERC1155 Connection - Reverted if ratio is null", async function () {
      const { poseidonToken, owner } = await deployTokenERC20Fixture();
      await poseidonToken.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply")),
        ethers.BigNumber.from(sampleData.get("tokenDecimals"))
        );
      const { poseidonNFT } = await deployTokenERC1155Fixture();
      await expect(poseidonToken.setERC1155(
        String(poseidonNFT.address), 
        ethers.BigNumber.from(sampleData.get("ERC1155ID")), 
        0)).to.be.revertedWith("RATIO_CANT_BE_ZERO");
    });

    it("Burn and Receive NFT - Generic Address (not owner)", async function () {
      const { poseidonToken, owner, add1 } = await deployTokenERC20Fixture();
      await poseidonToken.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply")),
        ethers.BigNumber.from(sampleData.get("tokenDecimals"))
        );
      const { poseidonNFT } = await deployTokenERC1155Fixture();
      poseidonNFT.initialize(String(sampleData.get("ERC155Uri")), poseidonToken.address);
      await poseidonToken.setERC1155(
        poseidonNFT.address, 
        ethers.BigNumber.from(sampleData.get("ERC1155ID")), 
        ethers.BigNumber.from(sampleData.get("ratio")));
      await poseidonToken.connect(owner).transfer(add1.address, ethers.BigNumber.from(sampleData.get("oneEther")));
      await poseidonToken.connect(add1).burnAndReceiveNFT(ethers.BigNumber.from(sampleData.get("oneEther")));
      expect(await poseidonToken.balanceOf(add1.address)).to.equals(ethers.BigNumber.from("0"));
      expect(await poseidonNFT.balanceOf(add1.address, ethers.BigNumber.from(sampleData.get("ERC1155ID")))).to.equals(ethers.BigNumber.from(sampleData.get("oneEther")).div(ethers.BigNumber.from(sampleData.get("ratio"))));
    });

    it("Burn and Receive NFT - Generic Address (not owner) can't mint if amount is greater than balance", async function () {
      const { poseidonToken, owner, add1 } = await deployTokenERC20Fixture();
      await poseidonToken.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply")),
        ethers.BigNumber.from(sampleData.get("tokenDecimals"))
        );
      const { poseidonNFT } = await deployTokenERC1155Fixture();
      poseidonNFT.initialize(String(sampleData.get("ERC155Uri")), poseidonToken.address);
      await poseidonToken.setERC1155(
        poseidonNFT.address, 
        ethers.BigNumber.from(sampleData.get("ERC1155ID")), 
        ethers.BigNumber.from(sampleData.get("ratio")));
      await poseidonToken.connect(owner).transfer(add1.address, ethers.BigNumber.from(sampleData.get("oneEther")));
      await expect(poseidonToken.connect(add1).burnAndReceiveNFT(ethers.BigNumber.from(sampleData.get("oneEther")).add(ethers.BigNumber.from("1")))).to.be.revertedWith("NOT_ENOUGH_TOKEN");
    });

    it("Burn and Receive NFT - Generic Address (not owner) can't mint if amount is lower than ratio", async function () {
      const { poseidonToken, owner, add1 } = await deployTokenERC20Fixture();
      await poseidonToken.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply")),
        ethers.BigNumber.from(sampleData.get("tokenDecimals"))
        );
      const { poseidonNFT } = await deployTokenERC1155Fixture();
      poseidonNFT.initialize(String(sampleData.get("ERC155Uri")), poseidonToken.address);
      await poseidonToken.setERC1155(
        poseidonNFT.address, 
        ethers.BigNumber.from(sampleData.get("ERC1155ID")), 
        ethers.BigNumber.from(sampleData.get("ratio")));
      await poseidonToken.connect(owner).transfer(add1.address, ethers.BigNumber.from(sampleData.get("oneEther")));
      await expect(poseidonToken.connect(add1).burnAndReceiveNFT(ethers.BigNumber.from(sampleData.get("oneWei")))).to.be.revertedWith("NOT_ENOUGH_TOKEN_TO_RECEIVE_NFT");
    });


    it("Burn and Receive NFT - Owner can't burn if available balance is not enough", async function () {
      const { poseidonToken, owner, add1 } = await deployTokenERC20Fixture();
      await poseidonToken.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply")),
        ethers.BigNumber.from(sampleData.get("tokenDecimals"))
        );
      const { poseidonNFT } = await deployTokenERC1155Fixture();
      poseidonNFT.initialize(String(sampleData.get("ERC155Uri")), poseidonToken.address);
      const tokenTotalSupply = ethers.BigNumber.from(sampleData.get("tokenTotalSupply")).mul(ethers.BigNumber.from("10").pow(ethers.BigNumber.from(sampleData.get("tokenDecimals"))));
      await poseidonToken.setERC1155(
        poseidonNFT.address, 
        ethers.BigNumber.from(sampleData.get("ERC1155ID")), 
        ethers.BigNumber.from(sampleData.get("ratio")));
      await poseidonToken.connect(owner).addVest(add1.address, tokenTotalSupply, ethers.BigNumber.from(sampleData.get("durationInBlocks")));
      expect(await poseidonToken.callStatic.ownerLock()).to.equals(tokenTotalSupply);
      expect(await poseidonToken.balanceOf(owner.address)).to.equals(tokenTotalSupply);
      await expect(poseidonToken.connect(owner).burnAndReceiveNFT(ethers.BigNumber.from(sampleData.get("oneEther")))).to.be.revertedWith("NOT_ENOUGH_TOKEN");
    });

    it("Set Security Delay", async function () {
      const { poseidonToken, owner } = await deployTokenERC20Fixture();
      await poseidonToken.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply")),
        ethers.BigNumber.from(sampleData.get("tokenDecimals"))
      );
      await poseidonToken.setSecurityDelay(ethers.BigNumber.from(sampleData.get("newDurationInBlocks")));
      expect(await poseidonToken.callStatic.securityDelayInBlocks()).to.equals(ethers.BigNumber.from(sampleData.get("newDurationInBlocks")));
      const securityDelayInBlocksEvent = await poseidonToken.queryFilter(poseidonToken.filters.securityDelayInBlocksEvent());
      expect(securityDelayInBlocksEvent[securityDelayInBlocksEvent.length - 1].args.owner).to.equals(owner.address);
      expect(securityDelayInBlocksEvent[securityDelayInBlocksEvent.length - 1].args.securityDelayInBlocks).to.equals(ethers.BigNumber.from(sampleData.get("newDurationInBlocks")));
    });

    it("Set Security Delay - Can't set low value of security delay", async function () {
      const { poseidonToken, owner } = await deployTokenERC20Fixture();
      await poseidonToken.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply")),
        ethers.BigNumber.from(sampleData.get("tokenDecimals"))
      );
      await expect(poseidonToken.setSecurityDelay(ethers.BigNumber.from("1"))).to.be.revertedWith("NOT_ENOUGH_DURATION_IN_BLOCKS");
    });
  });

  describe("Vesting System", function () {
    it("Add New Vest", async function () {
      const { poseidonToken, owner, add1 } = await deployTokenERC20Fixture();
      await poseidonToken.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply")),
        ethers.BigNumber.from(sampleData.get("tokenDecimals"))
        );
      const tx = await poseidonToken.addVest(
        add1.address, 
        ethers.BigNumber.from(sampleData.get("oneGWei")), 
        ethers.BigNumber.from(sampleData.get("durationInBlocks"))
        );
      const blockNumber = ethers.BigNumber.from(tx.blockNumber);
      const vestLength = await poseidonToken.callStatic.getVestLength(add1.address); 
      expect(vestLength).to.equals(ethers.BigNumber.from("1"));
      const vestMetaData = await poseidonToken.callStatic.getVestMetaData(
        vestLength.sub(ethers.BigNumber.from("1")),
        add1.address
      );
      // Check Vest MetaData Value
      expect(vestMetaData[vestMetaDataIndex.amount]).to.equals(ethers.BigNumber.from(sampleData.get("oneGWei")));
      expect(vestMetaData[vestMetaDataIndex.expirationBlockHeight]).to.equals(ethers.BigNumber.from(sampleData.get("durationInBlocks")).add(blockNumber));
      // Check ownerLock Value
      expect(await poseidonToken.callStatic.ownerLock()).to.equals(ethers.BigNumber.from(sampleData.get("oneGWei")));
      // Check AddVest Event
      const AddVestEvent = await poseidonToken.queryFilter(poseidonToken.filters.AddVestEvent());
      expect(AddVestEvent[AddVestEvent.length - 1].args.amount).to.equals(ethers.BigNumber.from(sampleData.get("oneGWei")));
      expect(AddVestEvent[AddVestEvent.length - 1].args.durationInBlocks).to.equals(ethers.BigNumber.from(sampleData.get("durationInBlocks")));
    });

    it("Add New Vest - Can't add new vest if block duration is lower tham security delay in blocks", async function () {
      const { poseidonToken, owner, add1 } = await deployTokenERC20Fixture();
      await poseidonToken.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply")),
        ethers.BigNumber.from(sampleData.get("tokenDecimals"))
        );
     await expect(poseidonToken.addVest(
        add1.address, 
        ethers.BigNumber.from(sampleData.get("oneGWei")), 
        ethers.BigNumber.from("1000")
        )).to.be.revertedWith("INSUFFICIENT_DURATION_IN_BLOCKS");
    });

    it("Add New Vest - Can't add new vest if available owner balance is lower than amount", async function () {
      const { poseidonToken, owner, add1 } = await deployTokenERC20Fixture();
      await poseidonToken.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply")),
        ethers.BigNumber.from(sampleData.get("tokenDecimals"))
        );
      // Fill ownerLock balance with total supply
      await poseidonToken.addVest(
        add1.address, 
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply")).mul(ethers.BigNumber.from("10").pow(ethers.BigNumber.from(sampleData.get("tokenDecimals")))),
        ethers.BigNumber.from(sampleData.get("durationInBlocks"))
      );
     await expect(poseidonToken.addVest(
        add1.address, 
        ethers.BigNumber.from(sampleData.get("oneGWei")), 
        ethers.BigNumber.from(sampleData.get("durationInBlocks"))
        )).to.be.revertedWith("INSUFFICIENT_OWNER_BALANCE");
    });

    it("Withdraw Vest", async function () {
      const { poseidonToken, owner, add1 } = await deployTokenERC20Fixture();
      await poseidonToken.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply")),
        ethers.BigNumber.from(sampleData.get("tokenDecimals"))
        );
      await poseidonToken.addVest(
        add1.address, 
        ethers.BigNumber.from(sampleData.get("oneGWei")), 
        ethers.BigNumber.from(sampleData.get("durationInBlocks"))
      );
      expect(await poseidonToken.callStatic.ownerLock()).to.equals(ethers.BigNumber.from(sampleData.get("oneGWei")));
      expect(await poseidonToken.callStatic.getVestLength(add1.address)).to.equals(ethers.BigNumber.from("1"));
      for (let index = 0; index < Number(sampleData.get("durationInBlocks")); index++) { await ethers.provider.send("evm_mine"); }
      await poseidonToken.connect(add1).withdrawVest(Number(0));
      expect(await poseidonToken.callStatic.balanceOf(add1.address)).to.equals(ethers.BigNumber.from(sampleData.get("oneGWei")));
      expect(await poseidonToken.callStatic.balanceOf(owner.address)).to.equals(
        (ethers.BigNumber.from(sampleData.get("tokenTotalSupply")).mul(ethers.BigNumber.from("10").pow(ethers.BigNumber.from(sampleData.get("tokenDecimals")))))
        .sub(ethers.BigNumber.from(sampleData.get("oneGWei")))
      );
      expect(await poseidonToken.callStatic.ownerLock()).to.equals(ethers.BigNumber.from("0"));
      expect(await poseidonToken.callStatic.getVestLength(add1.address)).to.equals(ethers.BigNumber.from("0"));
      const WithdrawVestEvent = await poseidonToken.queryFilter(poseidonToken.filters.WithdrawVestEvent());
      expect(WithdrawVestEvent[WithdrawVestEvent.length - 1].args.vestIndex).to.equals(ethers.BigNumber.from("0"));
      expect(WithdrawVestEvent[WithdrawVestEvent.length - 1].args.receiver).to.equals(add1.address);
      expect(WithdrawVestEvent[WithdrawVestEvent.length - 1].args.amount).to.equals(ethers.BigNumber.from(sampleData.get("oneGWei")));
    });

    it("Withdraw Vest - Can't withdraw a wrong vest index", async function () {
      const { poseidonToken, owner, add1 } = await deployTokenERC20Fixture();
      await poseidonToken.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply")),
        ethers.BigNumber.from(sampleData.get("tokenDecimals"))
        );
      await poseidonToken.addVest(
        add1.address, 
        ethers.BigNumber.from(sampleData.get("oneGWei")), 
        ethers.BigNumber.from(sampleData.get("durationInBlocks"))
      );
      for (let index = 0; index < Number(sampleData.get("durationInBlocks")); index++) { await ethers.provider.send("evm_mine"); }
      await expect(poseidonToken.connect(add1).withdrawVest(Number(1))).to.be.revertedWith("VEST_INDEX_DISMATCH");
    });

    it("Withdraw Vest - Can't withdraw if vest is not expired", async function () {
      const { poseidonToken, owner, add1 } = await deployTokenERC20Fixture();
      await poseidonToken.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply")),
        ethers.BigNumber.from(sampleData.get("tokenDecimals"))
        );
      await poseidonToken.addVest(
        add1.address, 
        ethers.BigNumber.from(sampleData.get("oneGWei")), 
        ethers.BigNumber.from(sampleData.get("durationInBlocks"))
      );
      await expect(poseidonToken.connect(add1).withdrawVest(Number(0))).to.be.revertedWith("VEST_NOT_EXPIRED");
    });

    it("Airdrop Vest", async function () {
      const { poseidonToken, owner, add1, add2 } = await deployTokenERC20Fixture();
      await poseidonToken.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply")),
        ethers.BigNumber.from(sampleData.get("tokenDecimals"))
        );
      const listOfAddress = [
        add1.address, 
        add1.address, 
        add2.address
      ];
      const listOfAmounts = [
        ethers.BigNumber.from(sampleData.get("oneGWei")), 
        ethers.BigNumber.from(sampleData.get("oneGWei")), 
        ethers.BigNumber.from(sampleData.get("oneGWei"))
      ];
      const listOfDurationsInBlock = [
        ethers.BigNumber.from(sampleData.get("durationInBlocks")).mul(ethers.BigNumber.from("2")), 
        ethers.BigNumber.from(sampleData.get("durationInBlocks")),
        ethers.BigNumber.from(sampleData.get("durationInBlocks"))
      ];
      const tx = await poseidonToken.connect(owner).airdropVest(listOfAddress, listOfAmounts, listOfDurationsInBlock);
      const blockNumber = ethers.BigNumber.from(tx.blockNumber);
      expect(await poseidonToken.callStatic.ownerLock()).to.equals(
        ethers.BigNumber.from(sampleData.get("oneGWei")).mul(ethers.BigNumber.from("3"))
        );
      expect(await poseidonToken.callStatic.getVestLength(add1.address)).to.equals(ethers.BigNumber.from("2"));
      expect(await poseidonToken.callStatic.getVestLength(add2.address)).to.equals(ethers.BigNumber.from("1"));
       // Check Vest MetaData Value
       const vestMetaData_add1_index1 = await poseidonToken.callStatic.getVestMetaData(ethers.BigNumber.from("0"), add1.address);
       const vestMetaData_add1_index2 = await poseidonToken.callStatic.getVestMetaData(ethers.BigNumber.from("1"), add1.address);
       const vestMetaData_add2_index1 = await poseidonToken.callStatic.getVestMetaData(ethers.BigNumber.from("0"), add2.address);
       expect(vestMetaData_add1_index1[vestMetaDataIndex.amount]).to.equals(listOfAmounts[0]);
       expect(vestMetaData_add1_index1[vestMetaDataIndex.expirationBlockHeight]).to.equals(
        ethers.BigNumber.from(listOfDurationsInBlock[0]).add(blockNumber)
        );
       expect(vestMetaData_add1_index2[vestMetaDataIndex.amount]).to.equals(listOfAmounts[1]);
       expect(vestMetaData_add1_index2[vestMetaDataIndex.expirationBlockHeight]).to.equals(
        ethers.BigNumber.from(listOfDurationsInBlock[1]).add(blockNumber)
        );
       expect(vestMetaData_add2_index1[vestMetaDataIndex.amount]).to.equals(listOfAmounts[2]);
       expect(vestMetaData_add2_index1[vestMetaDataIndex.expirationBlockHeight]).to.equals(
        ethers.BigNumber.from(listOfDurationsInBlock[2]).add(blockNumber)
        );
      const AddVestEvent = await poseidonToken.queryFilter(poseidonToken.filters.AddVestEvent());
      expect(AddVestEvent[AddVestEvent.length - 1].args.to).to.equals(add2.address);
      expect(AddVestEvent[AddVestEvent.length - 1].args.amount).to.equals(ethers.BigNumber.from(listOfAmounts[2]));
      expect(AddVestEvent[AddVestEvent.length - 1].args.durationInBlocks).to.equals(ethers.BigNumber.from(listOfDurationsInBlock[2]));
      expect(AddVestEvent[AddVestEvent.length - 2].args.to).to.equals(add1.address);
      expect(AddVestEvent[AddVestEvent.length - 2].args.amount).to.equals(ethers.BigNumber.from(listOfAmounts[1]));
      expect(AddVestEvent[AddVestEvent.length - 2].args.durationInBlocks).to.equals(ethers.BigNumber.from(listOfDurationsInBlock[1]));
      expect(AddVestEvent[AddVestEvent.length - 3].args.to).to.equals(add1.address);
      expect(AddVestEvent[AddVestEvent.length - 3].args.amount).to.equals(ethers.BigNumber.from(listOfAmounts[0]));
      expect(AddVestEvent[AddVestEvent.length - 3].args.durationInBlocks).to.equals(ethers.BigNumber.from(listOfDurationsInBlock[0]));
    });

    it("Airdrop Vest - Can't airdrop if data length dismatch _ 1", async function () {
      const { poseidonToken, owner, add1, add2 } = await deployTokenERC20Fixture();
      await poseidonToken.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply")),
        ethers.BigNumber.from(sampleData.get("tokenDecimals"))
        );
      const listOfAddress = [
        add1.address, 
        add1.address, 
        add2.address
      ];
      const listOfAmounts = [
        ethers.BigNumber.from(sampleData.get("oneGWei")), 
        ethers.BigNumber.from(sampleData.get("oneGWei"))
      ];
      const listOfDurationsInBlock = [
        ethers.BigNumber.from(sampleData.get("durationInBlocks")).mul(ethers.BigNumber.from("2")), 
        ethers.BigNumber.from(sampleData.get("durationInBlocks")),
        ethers.BigNumber.from(sampleData.get("durationInBlocks"))
      ];
      await expect(poseidonToken.connect(owner).airdropVest(listOfAddress, listOfAmounts, listOfDurationsInBlock))
      .to.be.revertedWith("DATA_DIMENSION_DISMATCH");
    });

    it("Airdrop Vest - Can't airdrop if data length dismatch _ 2", async function () {
      const { poseidonToken, owner, add1, add2 } = await deployTokenERC20Fixture();
      await poseidonToken.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply")),
        ethers.BigNumber.from(sampleData.get("tokenDecimals"))
        );
      const listOfAddress = [
        add1.address, 
        add1.address, 
        add2.address
      ];
      const listOfAmounts = [
        ethers.BigNumber.from(sampleData.get("oneGWei")), 
        ethers.BigNumber.from(sampleData.get("oneGWei")),
        ethers.BigNumber.from(sampleData.get("oneGWei"))
      ];
      const listOfDurationsInBlock = [
        ethers.BigNumber.from(sampleData.get("durationInBlocks")).mul(ethers.BigNumber.from("2")), 
        ethers.BigNumber.from(sampleData.get("durationInBlocks"))
      ];
      await expect(poseidonToken.connect(owner).airdropVest(listOfAddress, listOfAmounts, listOfDurationsInBlock))
      .to.be.revertedWith("DATA_DIMENSION_DISMATCH");
    });

    it("Airdrop Vest - Can't airdrop if duration block is lower than security delay", async function () {
      const { poseidonToken, owner, add1, add2 } = await deployTokenERC20Fixture();
      await poseidonToken.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply")),
        ethers.BigNumber.from(sampleData.get("tokenDecimals"))
        );
      const listOfAddress = [
        add1.address, 
        add1.address, 
        add2.address
      ];
      const listOfAmounts = [
        ethers.BigNumber.from(sampleData.get("oneGWei")), 
        ethers.BigNumber.from(sampleData.get("oneGWei")),
        ethers.BigNumber.from(sampleData.get("oneGWei"))
      ];
      const listOfDurationsInBlock = [
        ethers.BigNumber.from(sampleData.get("durationInBlocks")).div(ethers.BigNumber.from("2")), 
        ethers.BigNumber.from(sampleData.get("durationInBlocks")),
        ethers.BigNumber.from(sampleData.get("durationInBlocks"))
      ];
      await expect(poseidonToken.connect(owner).airdropVest(listOfAddress, listOfAmounts, listOfDurationsInBlock))
      .to.be.revertedWith("INSUFFICIENT_DURATION_IN_BLOCKS");
    });

    it("Airdrop Vest - Can't airdrop if duration owner available balance is lower than sub of vest amounts", async function () {
      const { poseidonToken, owner, add1, add2 } = await deployTokenERC20Fixture();
      await poseidonToken.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply")),
        ethers.BigNumber.from(sampleData.get("tokenDecimals"))
        );
      // Fill ownerLock balance with total supply
      await poseidonToken.addVest(
        add1.address, 
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply")).mul(ethers.BigNumber.from("10").pow(ethers.BigNumber.from(sampleData.get("tokenDecimals")))),
        ethers.BigNumber.from(sampleData.get("durationInBlocks"))
      );
      const listOfAddress = [
        add1.address, 
        add1.address, 
        add2.address
      ];
      const listOfAmounts = [
        ethers.BigNumber.from(sampleData.get("oneGWei")), 
        ethers.BigNumber.from(sampleData.get("oneGWei")),
        ethers.BigNumber.from(sampleData.get("oneGWei"))
      ];
      const listOfDurationsInBlock = [
        ethers.BigNumber.from(sampleData.get("durationInBlocks")).mul(ethers.BigNumber.from("2")), 
        ethers.BigNumber.from(sampleData.get("durationInBlocks")),
        ethers.BigNumber.from(sampleData.get("durationInBlocks"))
      ];
      await expect(poseidonToken.connect(owner).airdropVest(listOfAddress, listOfAmounts, listOfDurationsInBlock))
      .to.be.revertedWith("INSUFFICIENT_OWNER_BALANCE");
    });


    it("Delete Unexpired Vests", async function () {
      const { poseidonToken, owner, add1, add2 } = await deployTokenERC20Fixture();
      await poseidonToken.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply")),
        ethers.BigNumber.from(sampleData.get("tokenDecimals"))
        );
      const listOfAddress = [
        add1.address, 
        add1.address, 
        add2.address
      ];
      const listOfAmounts = [
        ethers.BigNumber.from(sampleData.get("oneGWei")).mul(ethers.BigNumber.from("2")), // not expired on our test
        ethers.BigNumber.from(sampleData.get("oneGWei")),
        ethers.BigNumber.from(sampleData.get("oneGWei"))
      ];
      const listOfDurationsInBlock = [
        ethers.BigNumber.from(sampleData.get("durationInBlocks")).mul(ethers.BigNumber.from("10")), 
        ethers.BigNumber.from(sampleData.get("durationInBlocks")),
        ethers.BigNumber.from(sampleData.get("durationInBlocks"))
      ];
      await poseidonToken.connect(owner).airdropVest(listOfAddress, listOfAmounts, listOfDurationsInBlock);
      expect(await poseidonToken.callStatic.getVestLength(add1.address)).to.equals(ethers.BigNumber.from("2")); 
      for (let index = 0; index < Number(sampleData.get("durationInBlocks")); index++) { await ethers.provider.send("evm_mine"); }
      expect(await poseidonToken.callStatic.getVestLength(add1.address)).to.equals(ethers.BigNumber.from("2")); // still 2 cuase it'n not withdrew or deleted yet
      await poseidonToken.connect(owner).deleteUnexpiredVests(add1.address);
      expect(await poseidonToken.callStatic.getVestLength(add1.address)).to.equals(ethers.BigNumber.from("1")); // cause 1 is expired already
      const DeleteVestEvent = await poseidonToken.queryFilter(poseidonToken.filters.DeleteVestEvent());
      expect(DeleteVestEvent[DeleteVestEvent.length - 1].args.owner).to.equals(owner.address);
      expect(DeleteVestEvent[DeleteVestEvent.length - 1].args.to).to.equals(add1.address);
      expect(DeleteVestEvent[DeleteVestEvent.length - 1].args.amount).to.equals(ethers.BigNumber.from(listOfAmounts[0]));   
    });

    it("Delete Unexpired Vests - Can't delete vests if they are expired", async function () {
      const { poseidonToken, owner, add1, add2 } = await deployTokenERC20Fixture();
      await poseidonToken.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply")),
        ethers.BigNumber.from(sampleData.get("tokenDecimals"))
        );
      const listOfAddress = [
        add1.address, 
        add1.address, 
        add2.address
      ];
      const listOfAmounts = [
        ethers.BigNumber.from(sampleData.get("oneGWei")).mul(ethers.BigNumber.from("2")), // not expired on our test
        ethers.BigNumber.from(sampleData.get("oneGWei")),
        ethers.BigNumber.from(sampleData.get("oneGWei"))
      ];
      const listOfDurationsInBlock = [
        ethers.BigNumber.from(sampleData.get("durationInBlocks")), 
        ethers.BigNumber.from(sampleData.get("durationInBlocks")),
        ethers.BigNumber.from(sampleData.get("durationInBlocks"))
      ];
      await poseidonToken.connect(owner).airdropVest(listOfAddress, listOfAmounts, listOfDurationsInBlock);
      for (let index = 0; index < Number(sampleData.get("durationInBlocks")); index++) { await ethers.provider.send("evm_mine"); }
      await expect(poseidonToken.connect(owner).deleteUnexpiredVests(add1.address))
      .to.be.revertedWith("NO_VESTS_TO_BE_DELETED");
    });

    it("Owner can't transfer token if the available balance is lower than amount", async function () {
      const { poseidonToken, owner, add1, add2 } = await deployTokenERC20Fixture();
      await poseidonToken.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply")),
        ethers.BigNumber.from(sampleData.get("tokenDecimals"))
      );
      // Fill ownerLock balance with total supply
      await poseidonToken.addVest(
        add1.address, 
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply")).mul(ethers.BigNumber.from("10").pow(ethers.BigNumber.from(sampleData.get("tokenDecimals")))),
        ethers.BigNumber.from(sampleData.get("durationInBlocks"))
      );
      await expect(poseidonToken.transfer(add1.address, ethers.BigNumber.from(sampleData.get("oneGWei"))))
      .to.be.revertedWith("NOT_ENOUGH_TOKEN");
    });

    it("Owner can't transfer token if the available balance is lower than amount neither with allowance", async function () {
      const { poseidonToken, owner, add1, add2 } = await deployTokenERC20Fixture();
      await poseidonToken.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply")),
        ethers.BigNumber.from(sampleData.get("tokenDecimals"))
      );
      // Fill ownerLock balance with total supply
      await poseidonToken.addVest(
        add1.address, 
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply")).mul(ethers.BigNumber.from("10").pow(ethers.BigNumber.from(sampleData.get("tokenDecimals")))),
        ethers.BigNumber.from(sampleData.get("durationInBlocks"))
      );
      await poseidonToken.approve(add1.address, ethers.BigNumber.from(sampleData.get("oneGWei")));
      await expect(poseidonToken.connect(add1).transferFrom(owner.address, add2.address, ethers.BigNumber.from(sampleData.get("oneGWei"))))
      .to.be.revertedWith("NOT_ENOUGH_TOKEN");
    });
  });

});
