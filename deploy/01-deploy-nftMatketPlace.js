const { network } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");
const { ethers } = require("ethers");
const { verify } = require("../utils/verify");

module.exports = async function ({ deployments, getNamedAccounts }) {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  log("--------------------------------");
  const args = [];

  const nftMarketPlace = await deploy("NftMarketPlace", {
    from: deployer,
    args: args,
    log: true,
    waitConfirmation: network.config.blockConfirmations || 1,
  });
  
  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    log("verifying...");
    await verify(nftMarketPlace.address, args);
  }
  log("--------------------------------");
};

module.exports.tags = ["all", "NftMarketPlace"];
