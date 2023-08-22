const { ethers, network } = require("hardhat");
const fs = require("fs");
const frontEndContractsFile =
  "../nextjs-nft-marketplace-thegraph/constants/networkMapping.json";
const frontEndAbiLocation = "../nextjs-nft-marketplace-thegraph/constants/";

module.exports = async function () {
  if (process.env.UPDATE_FRONT_END) {
    console.log("Updating front end");
    await updateContractAddresses();
    await updateApi();
  }
};

async function updateApi() {
  const nftMArketPlace = await ethers.getContract("NftMarketPlace");
  fs.writeFileSync(
    `${frontEndAbiLocation}NftMarketPlace.json`,
    nftMArketPlace.interface.format(ethers.utils.FormatTypes.json)
  );

  const basicNft = await ethers.getContract("BasicNft");
  fs.writeFileSync(
    `${frontEndAbiLocation}BasicNft.json`,
    basicNft.interface.format(ethers.utils.FormatTypes.json)
  );
}

async function updateContractAddresses() {
  const chainId = network.config.chainId.toString();
  const nftMarketplace = await ethers.getContract("NftMarketPlace");
  const contractAddresses = JSON.parse(
    fs.readFileSync(frontEndContractsFile, "utf8")
  );
  if (chainId in contractAddresses) {
    if (
      !contractAddresses[chainId]["NftMarketPlace"].includes(
        nftMarketplace.address
      )
    ) {
      contractAddresses[chainId]["NftMarketPlace"].push(nftMarketplace.address);
    }
  } else {
    contractAddresses[chainId] = { NftMarketPlace: [nftMarketplace.address] };
  }
  fs.writeFileSync(frontEndContractsFile, JSON.stringify(contractAddresses));
}

module.exports.tags = ["all", "frontend"];
