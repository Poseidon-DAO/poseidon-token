const hre = require("hardhat");

async function main() {
  const smartContractList = [];

  const ERC20_PDN = await hre.ethers.getContractFactory(
    "ERC20_PDN"
  );
  const erc20_PDN = await ERC20_PDN.deploy();

  await erc20_PDN.deployed();

  // await metaborgStars.initialize(IPFSList)
  console.log(
    "erc20_PDN deployed to:",
    erc20_PDN.address
  );

  smartContractList.push(erc20_PDN.address);

  const ERC1155_PDN = await hre.ethers.getContractFactory(
    "ERC1155_PDN"
  );
  const erc1155_PDN = await ERC1155_PDN.deploy();

  await erc1155_PDN.deployed();

  // await metaborgStars.initialize(IPFSList)
  console.log(
    "erc1155_PDN deployed to:",
    erc1155_PDN.address
  );

  smartContractList.push(erc1155_PDN.address);

  // SMART CONTRACT VERIFICATION

  const { exec } = require("child_process");
  const network = "goerli";
  exec(
    "npx hardhat verify --network " + network + " " + smartContractList[0],
    (err, stdout, stderr) => {
      console.log(err);
    }
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

