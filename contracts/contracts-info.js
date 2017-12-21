const auctionAddress = "0xb1690C08E213a35Ed9bAb7B318DE14420FB57d8C";
const coreAddress = "0x06012c8cf97BEaD5deAe237070F9587f8E7A266d";
const siringAddress = "0xC7af99Fe5513eB6710e6D5f44F9989dA40F27F26";

const contractNames = {
  [auctionAddress]: "CryptoKittiesAuction",
  [coreAddress]: "CryptoKittiesCore",
  [siringAddress]: "CryptoKittiesSiring"
};

const getContractName = ({to, from}) =>
  contractNames[to] || contractNames[from];

module.exports = {auctionAddress, coreAddress, siringAddress, contractNames, getContractName};
