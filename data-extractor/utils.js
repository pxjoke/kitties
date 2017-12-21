const abiDecoder = require("abi-decoder");

const auctionABI = require("../contracts-abi/auction");
const coreABI = require("../contracts-abi/core");
const siringABI = require("../contracts-abi/siring");

const {auctionAddress, coreAddress, siringAddress, getContractName} = require( "../contracts/contracts-info");

abiDecoder.addABI(auctionABI);
abiDecoder.addABI(coreABI);
abiDecoder.addABI(siringABI);

const decodeInput = input => abiDecoder.decodeMethod(input);

const getParameterValue = (paramName, params) => {
  const param = params.find(p => p.name === paramName);
  return param ? param.value : null;
};

const getStoreTxRequest = (tx, web3) => {
  const convertedTx = convertTx(tx, web3);
  if(!convertedTx) {
    return [];
  }

  const {method, methodParams} = convertedTx;
  switch (method) {
    case "bid":
      return [
        {
          kittyId: getParameterValue("_tokenId", methodParams),
          method,
          dataToStore: {
            tx: convertedTx
          }
        }
      ];
    case "createSaleAuction":
    case "createSiringAuction":
      return [
        {
          kittyId: getParameterValue("_kittyId", methodParams),
          method,
          dataToStore: {
            tx: convertedTx
          }
        }
      ];
    case "bidOnSiringAuction":
    case "breedWithAuto":
      return [
        {
          kittyId: getParameterValue("_matronId", methodParams),
          method,
          dataToStore: {
            tx: Object.assign(convertedTx, {genderRole: "matron"})
          }
        },
        {
          kittyId: getParameterValue("_sireId", methodParams),
          method,
          dataToStore: {
            tx: Object.assign(convertedTx, {genderRole: "sire"})
          }
        }
      ];
    default:
      return [];
  }
};

const convertTx = (tx, web3) => {
  const { blockHash, blockNumber, from, to, gas, gasPrice, hash, input, value} = tx;
  const decodedInput = decodeInput(input);
  if (!decodedInput) {
    return null;
  }
  return {
    from, to, hash, blockHash, blockNumber, gas,
    gasPrice: web3.utils.fromWei(gasPrice),
    contract: getContractName(tx),
    method: decodedInput.name,
    methodParams: decodedInput.params,
    value: web3.utils.fromWei(value)
  };
};

const isKittyTx = ({to, from}) => {
  return (
    to === coreAddress ||
    to === auctionAddress ||
    to === siringAddress ||
    from === coreAddress ||
    from === auctionAddress ||
    from === siringAddress
  );
};

const generateIndexesArray = (start, end) =>
  [...Array(end - start)].map((v, i) => i + start);

module.exports = {decodeInput, getStoreTxRequest, isKittyTx, generateIndexesArray};
