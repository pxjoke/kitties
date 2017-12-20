const abiDecoder = require("abi-decoder");

const auctionABI = require("../contracts-abi/auction");
const coreABI = require("../contracts-abi/core");
const siringABI = require("../contracts-abi/siring");

abiDecoder.addABI(auctionABI);
abiDecoder.addABI(coreABI);
abiDecoder.addABI(siringABI);

module.exports.decodeInput = function(input) {
  return abiDecoder.decodeMethod(input);
};