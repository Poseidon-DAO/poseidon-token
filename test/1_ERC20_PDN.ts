import { expect } from "chai";
import { ethers } from "hardhat";

let sampleData = new Map<string, string>();

sampleData.set("tokenName","Poseidon DAO Token");
sampleData.set("tokenSymbol","PDN");
sampleData.set("tokenTotalSupply","1000000000000000000000000000");
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

    const ERC20_PDN = await ethers.getContractFactory("ERC20_PDN");
    const erc20_PDN = await ERC20_PDN.deploy();

    return { erc20_PDN, owner, add1, add2 };
  }

  async function deployTokenERC1155Fixture() {
    let sampleData = new Map<string, string>();
    sampleData.set("zeroAddress", "0x0000000000000000000000000000000000000000");
    sampleData.set("oneGWei","1000000000000000");

    // Contracts are deployed using the first signer/account by default
    const [owner, add1, add2] = await ethers.getSigners();

    const ERC1155_PDN = await ethers.getContractFactory("ERC1155_PDN");
    const erc1155_PDN = await ERC1155_PDN.deploy();

    return { erc1155_PDN, owner, add1, add2, sampleData };
  }


  describe("Initialize", function () {
    it("Initialize Upgradeable Token", async function () {
      const { erc20_PDN, owner} = await deployTokenERC20Fixture();
      await erc20_PDN.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply"))
        );
      expect(await erc20_PDN.balanceOf(owner.address)).to.equals(
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply")));
      expect(await erc20_PDN.callStatic.owner()).to.equals(owner.address);
      const OwnerChangeEvent = await erc20_PDN.queryFilter(erc20_PDN.filters.OwnerChangeEvent());
      expect(OwnerChangeEvent[OwnerChangeEvent.length - 1].args.oldOwner).to.equals(sampleData.get("zeroAddress"));
      expect(OwnerChangeEvent[OwnerChangeEvent.length - 1].args.newOwner).to.equals(owner.address);
    });
  });

  describe("Token Basic Functionalities", function () {
    it("Run Airdrop", async function () {
      const { erc20_PDN, owner, add1, add2} = await deployTokenERC20Fixture();
      await erc20_PDN.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply"))
        );
      const addressToAirdrop = [add1.address, add2.address];
      const amountsToAirdrop = [ethers.BigNumber.from(sampleData.get("oneGWei")), ethers.BigNumber.from(sampleData.get("oneGWei"))];
      await erc20_PDN.runAirdrop(addressToAirdrop, amountsToAirdrop);
      expect(await erc20_PDN.balanceOf(add1.address)).to.equals(ethers.BigNumber.from(sampleData.get("oneGWei")));
      expect(await erc20_PDN.balanceOf(add2.address)).to.equals(ethers.BigNumber.from(sampleData.get("oneGWei")));
      expect(await erc20_PDN.balanceOf(owner.address)).to.equals(
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply"))
        .sub(ethers.BigNumber.from(sampleData.get("oneGWei"))) // address1
        .sub(ethers.BigNumber.from(sampleData.get("oneGWei"))) // address2
        );
    });

    it("Run Airdrop - Array dimensions can't dismatch", async function () {
      const { erc20_PDN, owner, add1} = await deployTokenERC20Fixture();
      await erc20_PDN.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply"))
        );
      const addressToAirdrop = [add1.address];
      const amountsToAirdrop = [ethers.BigNumber.from(sampleData.get("oneGWei")), ethers.BigNumber.from(sampleData.get("oneGWei"))];
      await expect(erc20_PDN.connect(owner).runAirdrop(addressToAirdrop, amountsToAirdrop)).to.be.revertedWith("DATA_DIMENSION_DISMATCH");
    });

    it("Run Airdrop - Non owner address can't run the function", async function () {
      const { erc20_PDN, owner, add1, add2} = await deployTokenERC20Fixture();
      await erc20_PDN.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply"))
        );
      const addressToAirdrop = [add1.address, add2.address];
      const amountsToAirdrop = [ethers.BigNumber.from(sampleData.get("oneGWei")), ethers.BigNumber.from(sampleData.get("oneGWei"))];
      await expect(erc20_PDN.connect(add1).runAirdrop(addressToAirdrop, amountsToAirdrop)).to.be.revertedWith("ONLY_ADMIN_CAN_RUN_THIS_FUNCTION");
    });

    it("Run Airdrop - Can't put null values", async function () {
      const { erc20_PDN, owner, add1, add2} = await deployTokenERC20Fixture();
      await erc20_PDN.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply"))
        );
      const addressToAirdrop = [add1.address, add2.address];
      const amountsToAirdrop = [ethers.BigNumber.from("0"), ethers.BigNumber.from(sampleData.get("oneGWei"))];
      await expect(erc20_PDN.runAirdrop(addressToAirdrop, amountsToAirdrop)).to.be.revertedWith("CANT_SET_NULL_VALUES");
    });

    it("Run Airdrop - Can't run function if available balance is lower than sum of elements", async function () {
      const { erc20_PDN, owner, add1, add2} = await deployTokenERC20Fixture();
      await erc20_PDN.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply"))
        );
      const addressToAirdrop = [add1.address, add2.address];
      const amountsToAirdrop = [ethers.BigNumber.from(sampleData.get("oneGWei")), ethers.BigNumber.from(sampleData.get("oneGWei"))];
      const tokenTotalSupply = ethers.BigNumber.from(sampleData.get("tokenTotalSupply"));
      await erc20_PDN.connect(owner).addVest(add1.address, tokenTotalSupply, ethers.BigNumber.from(sampleData.get("durationInBlocks")));
      await expect(erc20_PDN.runAirdrop(addressToAirdrop, amountsToAirdrop)).to.be.revertedWith("INSUFFICIENT_OWNER_BALANCE");
    });

    it("Set ERC1155 Connection", async function () {
      const { erc20_PDN, owner } = await deployTokenERC20Fixture();
      await erc20_PDN.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply"))
        );
      const { erc1155_PDN } = await deployTokenERC1155Fixture();
      await erc20_PDN.setERC1155(
        erc1155_PDN.address, 
        ethers.BigNumber.from(sampleData.get("ERC1155ID")), 
        ethers.BigNumber.from(sampleData.get("ratio")));
        expect(await erc20_PDN.callStatic.ERC1155Address()).to.equals(erc1155_PDN.address);
        expect(await erc20_PDN.callStatic.ID_ERC1155()).to.equals(ethers.BigNumber.from(sampleData.get("ERC1155ID")));
        expect(await erc20_PDN.callStatic.ratio()).to.equals(ethers.BigNumber.from(sampleData.get("ratio")));
    });

    it("Set ERC1155 Connection - Reverted if address is null", async function () {
      const { erc20_PDN, owner } = await deployTokenERC20Fixture();
      await erc20_PDN.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply"))
        );
      await expect(erc20_PDN.setERC1155(
        String(sampleData.get("zeroAddress")), 
        ethers.BigNumber.from(sampleData.get("ERC1155ID")), 
        ethers.BigNumber.from(sampleData.get("ratio")))).to.be.revertedWith("ADDRESS_CANT_BE_NULL");
    });

    it("Set ERC1155 Connection - Reverted if ratio is null", async function () {
      const { erc20_PDN, owner } = await deployTokenERC20Fixture();
      await erc20_PDN.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply"))
        );
      const { erc1155_PDN } = await deployTokenERC1155Fixture();
      await expect(erc20_PDN.setERC1155(
        String(erc1155_PDN.address), 
        ethers.BigNumber.from(sampleData.get("ERC1155ID")), 
        0)).to.be.revertedWith("RATIO_CANT_BE_ZERO");
    });

    it("Burn and Receive NFT - Generic Address (not owner)", async function () {
      const { erc20_PDN, owner, add1 } = await deployTokenERC20Fixture();
      await erc20_PDN.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply"))
        );
      const { erc1155_PDN } = await deployTokenERC1155Fixture();
      erc1155_PDN.initialize(String(sampleData.get("ERC155Uri")), erc20_PDN.address);
      await erc20_PDN.setERC1155(
        erc1155_PDN.address, 
        ethers.BigNumber.from(sampleData.get("ERC1155ID")), 
        ethers.BigNumber.from(sampleData.get("ratio")));
      await erc20_PDN.connect(owner).transfer(add1.address, ethers.BigNumber.from(sampleData.get("oneEther")));
      await erc20_PDN.connect(add1).burnAndReceiveNFT(ethers.BigNumber.from(sampleData.get("oneEther")));
      expect(await erc20_PDN.balanceOf(add1.address)).to.equals(ethers.BigNumber.from("0"));
      expect(await erc1155_PDN.balanceOf(add1.address, ethers.BigNumber.from(sampleData.get("ERC1155ID")))).to.equals(ethers.BigNumber.from(sampleData.get("oneEther")).div(ethers.BigNumber.from(sampleData.get("ratio"))));
    });

    it("Burn and Receive NFT - Generic Address (not owner) can't mint if amount is greater than balance", async function () {
      const { erc20_PDN, owner, add1 } = await deployTokenERC20Fixture();
      await erc20_PDN.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply"))
        );
      const { erc1155_PDN } = await deployTokenERC1155Fixture();
      erc1155_PDN.initialize(String(sampleData.get("ERC155Uri")), erc20_PDN.address);
      await erc20_PDN.setERC1155(
        erc1155_PDN.address, 
        ethers.BigNumber.from(sampleData.get("ERC1155ID")), 
        ethers.BigNumber.from(sampleData.get("ratio")));
      await erc20_PDN.connect(owner).transfer(add1.address, ethers.BigNumber.from(sampleData.get("oneEther")));
      await expect(erc20_PDN.connect(add1).burnAndReceiveNFT(ethers.BigNumber.from(sampleData.get("oneEther")).add(ethers.BigNumber.from("1")))).to.be.revertedWith("NOT_ENOUGH_TOKEN");
    });

    it("Burn and Receive NFT - Generic Address (not owner) can't mint if amount is lower than ratio", async function () {
      const { erc20_PDN, owner, add1 } = await deployTokenERC20Fixture();
      await erc20_PDN.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply"))
        );
      const { erc1155_PDN } = await deployTokenERC1155Fixture();
      erc1155_PDN.initialize(String(sampleData.get("ERC155Uri")), erc20_PDN.address);
      await erc20_PDN.setERC1155(
        erc1155_PDN.address, 
        ethers.BigNumber.from(sampleData.get("ERC1155ID")), 
        ethers.BigNumber.from(sampleData.get("ratio")));
      await erc20_PDN.connect(owner).transfer(add1.address, ethers.BigNumber.from(sampleData.get("oneEther")));
      await expect(erc20_PDN.connect(add1).burnAndReceiveNFT(ethers.BigNumber.from(sampleData.get("oneWei")))).to.be.revertedWith("NOT_ENOUGH_TOKEN_TO_RECEIVE_NFT");
    });


    it("Burn and Receive NFT - Owner can't burn if available balance is not enough", async function () {
      const { erc20_PDN, owner, add1 } = await deployTokenERC20Fixture();
      await erc20_PDN.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply"))
        );
      const { erc1155_PDN } = await deployTokenERC1155Fixture();
      erc1155_PDN.initialize(String(sampleData.get("ERC155Uri")), erc20_PDN.address);
      const tokenTotalSupply = ethers.BigNumber.from(sampleData.get("tokenTotalSupply"));
      await erc20_PDN.setERC1155(
        erc1155_PDN.address, 
        ethers.BigNumber.from(sampleData.get("ERC1155ID")), 
        ethers.BigNumber.from(sampleData.get("ratio")));
      await erc20_PDN.connect(owner).addVest(add1.address, tokenTotalSupply, ethers.BigNumber.from(sampleData.get("durationInBlocks")));
      expect(await erc20_PDN.callStatic.ownerLock()).to.equals(tokenTotalSupply);
      expect(await erc20_PDN.balanceOf(owner.address)).to.equals(tokenTotalSupply);
      await expect(erc20_PDN.connect(owner).burnAndReceiveNFT(ethers.BigNumber.from(sampleData.get("oneEther")))).to.be.revertedWith("NOT_ENOUGH_TOKEN");
    });

    it("Set Security Delay", async function () {
      const { erc20_PDN, owner } = await deployTokenERC20Fixture();
      await erc20_PDN.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply"))
      );
      await erc20_PDN.setSecurityDelay(ethers.BigNumber.from(sampleData.get("newDurationInBlocks")));
      expect(await erc20_PDN.callStatic.securityDelayInBlocks()).to.equals(ethers.BigNumber.from(sampleData.get("newDurationInBlocks")));
      const securityDelayInBlocksEvent = await erc20_PDN.queryFilter(erc20_PDN.filters.securityDelayInBlocksEvent());
      expect(securityDelayInBlocksEvent[securityDelayInBlocksEvent.length - 1].args.owner).to.equals(owner.address);
      expect(securityDelayInBlocksEvent[securityDelayInBlocksEvent.length - 1].args.securityDelayInBlocks).to.equals(ethers.BigNumber.from(sampleData.get("newDurationInBlocks")));
    });

    it("Set Security Delay - Can't set low value of security delay", async function () {
      const { erc20_PDN, owner } = await deployTokenERC20Fixture();
      await erc20_PDN.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply"))
      );
      await expect(erc20_PDN.setSecurityDelay(ethers.BigNumber.from("1"))).to.be.revertedWith("NOT_ENOUGH_DURATION_IN_BLOCKS");
    });
  });

  describe("Vesting System", function () {
    it("Add New Vest", async function () {
      const { erc20_PDN, owner, add1 } = await deployTokenERC20Fixture();
      await erc20_PDN.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply"))
        );
      const tx = await erc20_PDN.addVest(
        add1.address, 
        ethers.BigNumber.from(sampleData.get("oneGWei")), 
        ethers.BigNumber.from(sampleData.get("durationInBlocks"))
        );
      const blockNumber = ethers.BigNumber.from(tx.blockNumber);
      const vestLength = await erc20_PDN.callStatic.getVestLength(add1.address); 
      expect(vestLength).to.equals(ethers.BigNumber.from("1"));
      const vestMetaData = await erc20_PDN.callStatic.getVestMetaData(
        vestLength.sub(ethers.BigNumber.from("1")),
        add1.address
      );
      // Check Vest MetaData Value
      expect(vestMetaData[vestMetaDataIndex.amount]).to.equals(ethers.BigNumber.from(sampleData.get("oneGWei")));
      expect(vestMetaData[vestMetaDataIndex.expirationBlockHeight]).to.equals(ethers.BigNumber.from(sampleData.get("durationInBlocks")).add(blockNumber));
      // Check ownerLock Value
      expect(await erc20_PDN.callStatic.ownerLock()).to.equals(ethers.BigNumber.from(sampleData.get("oneGWei")));
      // Check AddVest Event
      const AddVestEvent = await erc20_PDN.queryFilter(erc20_PDN.filters.AddVestEvent());
      expect(AddVestEvent[AddVestEvent.length - 1].args.amount).to.equals(ethers.BigNumber.from(sampleData.get("oneGWei")));
      expect(AddVestEvent[AddVestEvent.length - 1].args.durationInBlocks).to.equals(ethers.BigNumber.from(sampleData.get("durationInBlocks")));
    });

    it("Add New Vest - Can't add new vest if block duration is lower tham security delay in blocks", async function () {
      const { erc20_PDN, owner, add1 } = await deployTokenERC20Fixture();
      await erc20_PDN.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply"))
        );
     await expect(erc20_PDN.addVest(
        add1.address, 
        ethers.BigNumber.from(sampleData.get("oneGWei")), 
        ethers.BigNumber.from("1000")
        )).to.be.revertedWith("INSUFFICIENT_DURATION_IN_BLOCKS");
    });

    it("Add New Vest - Can't add new vest if available owner balance is lower than amount", async function () {
      const { erc20_PDN, owner, add1 } = await deployTokenERC20Fixture();
      await erc20_PDN.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply"))
        );
      // Fill ownerLock balance with total supply
      await erc20_PDN.addVest(
        add1.address, 
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply")),
        ethers.BigNumber.from(sampleData.get("durationInBlocks"))
      );
     await expect(erc20_PDN.addVest(
        add1.address, 
        ethers.BigNumber.from(sampleData.get("oneGWei")), 
        ethers.BigNumber.from(sampleData.get("durationInBlocks"))
        )).to.be.revertedWith("INSUFFICIENT_OWNER_BALANCE");
    });

    it("Withdraw Vest", async function () {
      const { erc20_PDN, owner, add1 } = await deployTokenERC20Fixture();
      await erc20_PDN.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply"))
        );
      await erc20_PDN.addVest(
        add1.address, 
        ethers.BigNumber.from(sampleData.get("oneGWei")), 
        ethers.BigNumber.from(sampleData.get("durationInBlocks"))
      );
      expect(await erc20_PDN.callStatic.ownerLock()).to.equals(ethers.BigNumber.from(sampleData.get("oneGWei")));
      expect(await erc20_PDN.callStatic.getVestLength(add1.address)).to.equals(ethers.BigNumber.from("1"));
      for (let index = 0; index < Number(sampleData.get("durationInBlocks")); index++) { await ethers.provider.send("evm_mine"); }
      await erc20_PDN.connect(add1).withdrawVest(Number(0));
      expect(await erc20_PDN.callStatic.balanceOf(add1.address)).to.equals(ethers.BigNumber.from(sampleData.get("oneGWei")));
      expect(await erc20_PDN.callStatic.balanceOf(owner.address)).to.equals(
        (ethers.BigNumber.from(sampleData.get("tokenTotalSupply")))
        .sub(ethers.BigNumber.from(sampleData.get("oneGWei")))
      );
      expect(await erc20_PDN.callStatic.ownerLock()).to.equals(ethers.BigNumber.from("0"));
      expect(await erc20_PDN.callStatic.getVestLength(add1.address)).to.equals(ethers.BigNumber.from("0"));
      const WithdrawVestEvent = await erc20_PDN.queryFilter(erc20_PDN.filters.WithdrawVestEvent());
      expect(WithdrawVestEvent[WithdrawVestEvent.length - 1].args.vestIndex).to.equals(ethers.BigNumber.from("0"));
      expect(WithdrawVestEvent[WithdrawVestEvent.length - 1].args.receiver).to.equals(add1.address);
      expect(WithdrawVestEvent[WithdrawVestEvent.length - 1].args.amount).to.equals(ethers.BigNumber.from(sampleData.get("oneGWei")));
    });

    it("Withdraw Vest - Can't withdraw a wrong vest index", async function () {
      const { erc20_PDN, owner, add1 } = await deployTokenERC20Fixture();
      await erc20_PDN.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply"))
        );
      await erc20_PDN.addVest(
        add1.address, 
        ethers.BigNumber.from(sampleData.get("oneGWei")), 
        ethers.BigNumber.from(sampleData.get("durationInBlocks"))
      );
      for (let index = 0; index < Number(sampleData.get("durationInBlocks")); index++) { await ethers.provider.send("evm_mine"); }
      await expect(erc20_PDN.connect(add1).withdrawVest(Number(1))).to.be.revertedWith("VEST_INDEX_DISMATCH");
    });

    it("Withdraw Vest - Can't withdraw if vest is not expired", async function () {
      const { erc20_PDN, owner, add1 } = await deployTokenERC20Fixture();
      await erc20_PDN.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply"))
        );
      await erc20_PDN.addVest(
        add1.address, 
        ethers.BigNumber.from(sampleData.get("oneGWei")), 
        ethers.BigNumber.from(sampleData.get("durationInBlocks"))
      );
      await expect(erc20_PDN.connect(add1).withdrawVest(Number(0))).to.be.revertedWith("VEST_NOT_EXPIRED");
    });

    it("Airdrop Vest", async function () {
      const { erc20_PDN, owner, add1, add2 } = await deployTokenERC20Fixture();
      await erc20_PDN.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply"))
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
      const tx = await erc20_PDN.connect(owner).airdropVest(listOfAddress, listOfAmounts, listOfDurationsInBlock);
      const blockNumber = ethers.BigNumber.from(tx.blockNumber);
      expect(await erc20_PDN.callStatic.ownerLock()).to.equals(
        ethers.BigNumber.from(sampleData.get("oneGWei")).mul(ethers.BigNumber.from("3"))
        );
      expect(await erc20_PDN.callStatic.getVestLength(add1.address)).to.equals(ethers.BigNumber.from("2"));
      expect(await erc20_PDN.callStatic.getVestLength(add2.address)).to.equals(ethers.BigNumber.from("1"));
       // Check Vest MetaData Value
       const vestMetaData_add1_index1 = await erc20_PDN.callStatic.getVestMetaData(ethers.BigNumber.from("0"), add1.address);
       const vestMetaData_add1_index2 = await erc20_PDN.callStatic.getVestMetaData(ethers.BigNumber.from("1"), add1.address);
       const vestMetaData_add2_index1 = await erc20_PDN.callStatic.getVestMetaData(ethers.BigNumber.from("0"), add2.address);
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
      const AddVestEvent = await erc20_PDN.queryFilter(erc20_PDN.filters.AddVestEvent());
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
      const { erc20_PDN, owner, add1, add2 } = await deployTokenERC20Fixture();
      await erc20_PDN.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply"))
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
      await expect(erc20_PDN.connect(owner).airdropVest(listOfAddress, listOfAmounts, listOfDurationsInBlock))
      .to.be.revertedWith("DATA_DIMENSION_DISMATCH");
    });

    it("Airdrop Vest - Can't airdrop if data length dismatch _ 2", async function () {
      const { erc20_PDN, owner, add1, add2 } = await deployTokenERC20Fixture();
      await erc20_PDN.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply"))
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
      await expect(erc20_PDN.connect(owner).airdropVest(listOfAddress, listOfAmounts, listOfDurationsInBlock))
      .to.be.revertedWith("DATA_DIMENSION_DISMATCH");
    });

    it("Airdrop Vest - Can't airdrop if duration block is lower than security delay", async function () {
      const { erc20_PDN, owner, add1, add2 } = await deployTokenERC20Fixture();
      await erc20_PDN.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply"))
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
      await expect(erc20_PDN.connect(owner).airdropVest(listOfAddress, listOfAmounts, listOfDurationsInBlock))
      .to.be.revertedWith("INSUFFICIENT_DURATION_IN_BLOCKS");
    });

    it("Airdrop Vest - Can't airdrop if duration owner available balance is lower than sub of vest amounts", async function () {
      const { erc20_PDN, owner, add1, add2 } = await deployTokenERC20Fixture();
      await erc20_PDN.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply"))
        );
      // Fill ownerLock balance with total supply
      await erc20_PDN.addVest(
        add1.address, 
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply")),
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
      await expect(erc20_PDN.connect(owner).airdropVest(listOfAddress, listOfAmounts, listOfDurationsInBlock))
      .to.be.revertedWith("INSUFFICIENT_OWNER_BALANCE");
    });


    it("Delete Unexpired Vests", async function () {
      const { erc20_PDN, owner, add1, add2 } = await deployTokenERC20Fixture();
      await erc20_PDN.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply"))
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
      await erc20_PDN.connect(owner).airdropVest(listOfAddress, listOfAmounts, listOfDurationsInBlock);
      expect(await erc20_PDN.callStatic.getVestLength(add1.address)).to.equals(ethers.BigNumber.from("2")); 
      for (let index = 0; index < Number(sampleData.get("durationInBlocks")); index++) { await ethers.provider.send("evm_mine"); }
      expect(await erc20_PDN.callStatic.getVestLength(add1.address)).to.equals(ethers.BigNumber.from("2")); // still 2 cuase it'n not withdrew or deleted yet
      await erc20_PDN.connect(owner).deleteUnexpiredVests(add1.address);
      expect(await erc20_PDN.callStatic.getVestLength(add1.address)).to.equals(ethers.BigNumber.from("1")); // cause 1 is expired already
      const DeleteVestEvent = await erc20_PDN.queryFilter(erc20_PDN.filters.DeleteVestEvent());
      expect(DeleteVestEvent[DeleteVestEvent.length - 1].args.owner).to.equals(owner.address);
      expect(DeleteVestEvent[DeleteVestEvent.length - 1].args.to).to.equals(add1.address);
      expect(DeleteVestEvent[DeleteVestEvent.length - 1].args.amount).to.equals(ethers.BigNumber.from(listOfAmounts[0]));   
    });

    it("Delete Unexpired Vests - Can't delete vests if they are expired", async function () {
      const { erc20_PDN, owner, add1, add2 } = await deployTokenERC20Fixture();
      await erc20_PDN.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply"))
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
      await erc20_PDN.connect(owner).airdropVest(listOfAddress, listOfAmounts, listOfDurationsInBlock);
      for (let index = 0; index < Number(sampleData.get("durationInBlocks")); index++) { await ethers.provider.send("evm_mine"); }
      await expect(erc20_PDN.connect(owner).deleteUnexpiredVests(add1.address))
      .to.be.revertedWith("NO_VESTS_TO_BE_DELETED");
    });

    it("Owner can't transfer token if the available balance is lower than amount", async function () {
      const { erc20_PDN, owner, add1, add2 } = await deployTokenERC20Fixture();
      await erc20_PDN.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply"))
      );
      // Fill ownerLock balance with total supply
      await erc20_PDN.addVest(
        add1.address, 
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply")),
        ethers.BigNumber.from(sampleData.get("durationInBlocks"))
      );
      await expect(erc20_PDN.transfer(add1.address, ethers.BigNumber.from(sampleData.get("oneGWei"))))
      .to.be.revertedWith("NOT_ENOUGH_TOKEN");
    });

    it("Owner can't transfer token if the available balance is lower than amount neither with allowance", async function () {
      const { erc20_PDN, owner, add1, add2 } = await deployTokenERC20Fixture();
      await erc20_PDN.connect(owner).initialize(
        String(sampleData.get("tokenName")),
        String(sampleData.get("tokenSymbol")),
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply"))
      );
      // Fill ownerLock balance with total supply
      await erc20_PDN.addVest(
        add1.address, 
        ethers.BigNumber.from(sampleData.get("tokenTotalSupply")),
        ethers.BigNumber.from(sampleData.get("durationInBlocks"))
      );
      await erc20_PDN.approve(add1.address, ethers.BigNumber.from(sampleData.get("oneGWei")));
      await expect(erc20_PDN.connect(add1).transferFrom(owner.address, add2.address, ethers.BigNumber.from(sampleData.get("oneGWei"))))
      .to.be.revertedWith("NOT_ENOUGH_TOKEN");
    });
  });

});
