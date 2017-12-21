const Web3 = require('web3');
const async = require('async');
const elasticsearch = require('elasticsearch');

const {getStoreTxRequest, isKittyTx, generateIndexesArray} = require("./utils");

const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

const elastic = new elasticsearch.Client({
  host: 'localhost:9200',
  // log: 'trace'
});

const generateEmptyKitty = () => ({
  bid: [],
  createSaleAuction: [],
  createSiringAuction: [],
  bidOnSiringAuction: [],
  breedWithAuto: []
});

const upsertKitty = ({kittyId, method, dataToStore}) => {
  return elastic.update({
    index: 'kitties',
    type: 'kitty',
    id: kittyId,
    retryOnConflict: 10,
    body: {
      scripted_upsert: true,
      upsert: generateEmptyKitty(),
      script: {
        lang: "painless",
        source: "ctx._source[params.method].add(params.value)",
        params: {
          method,
          value: [dataToStore]
        }
      }
    }
  })
};

const processBlock = (block, index, callback) => {
  console.log(index);
  const storeRequests = block.transactions
    .filter(isKittyTx)
    .map((tx) => getStoreTxRequest(tx, web3))
    .reduce((acc, requests) => acc.concat(requests), []);

  return Promise.all(storeRequests.map(upsertKitty))
    .then(() => callback())
    .catch(err => (console.log('ERROR', err), callback()));
};

function storeTxs(startBlockIdx, endBlockIdx, callback) {
  const blockIndexes = generateIndexesArray(startBlockIdx, endBlockIdx);

  async.eachLimit(
    blockIndexes,
    30,
    (index, callback) =>
      web3.eth
        .getBlock(index, true)
        .then(block => processBlock(block, index, callback)),
    callback
  );
}

storeTxs(4640000, 4645000);
// upsertKitty({
//   kittyId: 12,
//   method: 'bid',
//   dataToStore: 'Sored 1'
// });
