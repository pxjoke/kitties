const Web3 = require('web3');
const async = require('async');

const {getStoreTxRequest, isKittyTx, generateIndexesArray} = require("./utils");

const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));


const processBlock = (block, index, callback) => {
    const storeRequests = block.transactions
        .filter(isKittyTx)
        .map((tx) => getStoreTxRequest(tx, web3));

    storeRequests.forEach(request => {
      console.log(request);
    });
    callback();
};

function storeTxs(startBlockIdx, endBlockIdx, callback) {
    const blockIndexes = generateIndexesArray(startBlockIdx, endBlockIdx);

    async.eachLimit(
        blockIndexes,
        20,
        (index, callback) =>
            web3.eth
                .getBlock(index, true)
                .then(block => processBlock(block, index, callback)),
        callback
    );
}

storeTxs(4610019, 4610100);
