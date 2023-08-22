1. Create a decentralized NFT marketplace
   1. `listItem`: List NFTs on the marketplace
   2. `buyItem`: Buy the NFTs
   3. `cacelItem`: Cancel a listing
   4. `updateListing`: Update price
   5. `widthrawProceeds`: Withdraw payment for my bought NFTs


```shell
yarn 
yarn install
```
To deploy the contract
```
yarn hardhat deploy
```
To Mint and list nft to the marketplce
```
yarn hardhat run scripts/mint-and-list.js --network localhost
```
