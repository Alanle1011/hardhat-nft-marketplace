const { assert, expect } = require("chai");
const { network, deployments, ethers } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Nft MarketPlace Unit Tests", function () {
      let nftMarketPlace, nftMarketPlaceContract, basicNft, basicNftContract;
      const PRICE = ethers.utils.parseEther("0.1");
      const TOKEN_ID = 0;

      beforeEach(async () => {
        accounts = await ethers.getSigners(); // could also do with getNamedAccounts
        deployer = accounts[0];
        user = accounts[1];
        await deployments.fixture(["all"]);
        nftMarketPlaceContract = await ethers.getContract("NftMarketPlace");
        nftMarketPlace = nftMarketPlaceContract.connect(deployer);
        basicNftContract = await ethers.getContract("BasicNft");
        basicNft = basicNftContract.connect(deployer);
        await basicNft.mintNft();
        await basicNft.approve(nftMarketPlaceContract.address, TOKEN_ID);
      });

      describe("listItem", function () {
        it("emits an event after listing an item", async function () {
          expect(
            await nftMarketPlace.listItem(basicNft.address, TOKEN_ID, PRICE)
          ).to.emit("ItemListed");
        });
        it("exclusively items that haven't been listed", async function () {
          await nftMarketPlace.listItem(basicNft.address, TOKEN_ID, PRICE);
          const error = `AlreadyListed("${basicNft.address}", ${TOKEN_ID})`;
          //   await expect(
          //       nftMarketPlace.listItem(basicNft.address, TOKEN_ID, PRICE)
          //   ).to.be.revertedWith("AlreadyListed")
          await expect(
            nftMarketPlace.listItem(basicNft.address, TOKEN_ID, PRICE)
          ).to.be.revertedWith(error);
        });
        it("exclusively allows owners to list", async function () {
          nftMarketPlace = nftMarketPlaceContract.connect(user);
          await basicNft.approve(user.address, TOKEN_ID);
          await expect(
            nftMarketPlace.listItem(basicNft.address, TOKEN_ID, PRICE)
          ).to.be.revertedWith("NotOwner");
        });
        it("needs approvals to list item", async function () {
          await basicNft.approve(ethers.constants.AddressZero, TOKEN_ID);
          await expect(
            nftMarketPlace.listItem(basicNft.address, TOKEN_ID, PRICE)
          ).to.be.revertedWith("NftMarketPlace__NotApproveForMarketPlace()");
        });
        it("Updates listing with seller and price", async function () {
          await nftMarketPlace.listItem(basicNft.address, TOKEN_ID, PRICE);
          const listing = await nftMarketPlace.getListing(
            basicNft.address,
            TOKEN_ID
          );
          assert(listing.price.toString() == PRICE.toString());
          assert(listing.seller.toString() == deployer.address);
        });
        it("reverts if the price be 0", async () => {
          const ZERO_PRICE = ethers.utils.parseEther("0");
          await expect(
            nftMarketPlace.listItem(basicNft.address, TOKEN_ID, ZERO_PRICE)
          ).revertedWith(
            nftMarketPlace,
            "NftMarketPlace__PriceMustBeAboveZero"
          );
        });
      });
      describe("cancelListing", function () {
        it("reverts if there is no listing", async function () {
          const error = `NotListed("${basicNft.address}", ${TOKEN_ID})`;
          await expect(
            nftMarketPlace.cancelListing(basicNft.address, TOKEN_ID)
          ).to.be.revertedWith(error);
        });
        it("reverts if anyone but the owner tries to call", async function () {
          await nftMarketPlace.listItem(basicNft.address, TOKEN_ID, PRICE);
          nftMarketPlace = nftMarketPlaceContract.connect(user);
          await basicNft.approve(user.address, TOKEN_ID);
          await expect(
            nftMarketPlace.cancelListing(basicNft.address, TOKEN_ID)
          ).to.be.revertedWith("NotOwner");
        });
        it("emits event and removes listing", async function () {
          await nftMarketPlace.listItem(basicNft.address, TOKEN_ID, PRICE);
          expect(
            await nftMarketPlace.cancelListing(basicNft.address, TOKEN_ID)
          ).to.emit("ItemCanceled");
          const listing = await nftMarketPlace.getListing(
            basicNft.address,
            TOKEN_ID
          );
          assert(listing.price.toString() == "0");
        });
      });
      describe("buyItem", function () {
        it("reverts if the item isnt listed", async function () {
          await expect(
            nftMarketPlace.buyItem(basicNft.address, TOKEN_ID)
          ).to.be.revertedWith("NotListed");
        });
        it("reverts if the price isnt met", async function () {
          await nftMarketPlace.listItem(basicNft.address, TOKEN_ID, PRICE);
          await expect(
            nftMarketPlace.buyItem(basicNft.address, TOKEN_ID)
          ).to.be.revertedWith("PriceNotMet");
        });
        it("transfers the nft to the buyer and updates internal proceeds record", async function () {
          await nftMarketPlace.listItem(basicNft.address, TOKEN_ID, PRICE);
          nftMarketPlace = nftMarketPlaceContract.connect(user);
          expect(
            await nftMarketPlace.buyItem(basicNft.address, TOKEN_ID, {
              value: PRICE,
            })
          ).to.emit("ItemBought");
          const newOwner = await basicNft.ownerOf(TOKEN_ID);
          const deployerProceeds = await nftMarketPlace.getProceeds(
            deployer.address
          );
          assert(newOwner.toString() == user.address);
          assert(deployerProceeds.toString() == PRICE.toString());
        });
      });
      describe("updateListing", function () {
        it("must be owner and listed", async function () {
          await expect(
            nftMarketPlace.updateListing(basicNft.address, TOKEN_ID, PRICE)
          ).to.be.revertedWith("NotListed");
          await nftMarketPlace.listItem(basicNft.address, TOKEN_ID, PRICE);
          nftMarketPlace = nftMarketPlaceContract.connect(user);
          await expect(
            nftMarketPlace.updateListing(basicNft.address, TOKEN_ID, PRICE)
          ).to.be.revertedWith("NotOwner");
        });
        it("reverts if new price is 0", async function () {
          const updatedPrice = ethers.utils.parseEther("0");
          await nftMarketPlace.listItem(basicNft.address, TOKEN_ID, PRICE);
          await expect(
            nftMarketPlace.updateListing(
              basicNft.address,
              TOKEN_ID,
              updatedPrice
            )
          ).to.be.revertedWith("PriceMustBeAboveZero");
        });
        it("updates the price of the item", async function () {
          const updatedPrice = ethers.utils.parseEther("0.2");
          await nftMarketPlace.listItem(basicNft.address, TOKEN_ID, PRICE);
          expect(
            await nftMarketPlace.updateListing(
              basicNft.address,
              TOKEN_ID,
              updatedPrice
            )
          ).to.emit("ItemListed");
          const listing = await nftMarketPlace.getListing(
            basicNft.address,
            TOKEN_ID
          );
          assert(listing.price.toString() == updatedPrice.toString());
        });
      });
      describe("withdrawProceeds", function () {
        it("doesn't allow 0 proceed withdrawls", async function () {
          await expect(nftMarketPlace.withdrawProceeds()).to.be.revertedWith(
            "NoProceeds"
          );
        });
        it("withdraws proceeds", async function () {
          await nftMarketPlace.listItem(basicNft.address, TOKEN_ID, PRICE);
          nftMarketPlace = nftMarketPlaceContract.connect(user);
          await nftMarketPlace.buyItem(basicNft.address, TOKEN_ID, {
            value: PRICE,
          });
          nftMarketPlace = nftMarketPlaceContract.connect(deployer);

          const deployerProceedsBefore = await nftMarketPlace.getProceeds(
            deployer.address
          );
          const deployerBalanceBefore = await deployer.getBalance();
          const txResponse = await nftMarketPlace.withdrawProceeds();
          const transactionReceipt = await txResponse.wait(1);
          const { gasUsed, effectiveGasPrice } = transactionReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);
          const deployerBalanceAfter = await deployer.getBalance();

          assert(
            deployerBalanceAfter.add(gasCost).toString() ==
              deployerProceedsBefore.add(deployerBalanceBefore).toString()
          );
        });
      });
    });
