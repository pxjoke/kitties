const Web3 = require('web3');
const async = require('async');
const elasticsearch = require('elasticsearch');

const {convertTx, isKittyTx, generateIndexesArray} = require("./utils");

const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

const elastic = new elasticsearch.Client({
  host: 'localhost:9200',
  log: 'trace'
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

const insertTx = tx => {
  return elastic.index({
    index: 'cryptokitties',
    type: 'tx',
    body: tx
  })
};

const insertTxs = txs => {
  if(txs.length === 0) {
    return Promise.resolve();
  }

  const body = txs.reduce((acc, tx) => {
    return acc.concat({
      index: {
        _index: 'cryptokitties',
        _type: 'tx'
      }
    }, tx);
  }, []);

  return elastic.bulk({ body });
};

const processBlock = (block, index, callback) => {
  console.log(index);
  const txs = block.transactions
    .filter(isKittyTx)
    .map((tx) => convertTx(tx, web3));

  return insertTxs(txs)
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

storeTxs(4640000, 4640010);
// upsertKitty({
//   kittyId: 12,
//   method: 'bid',
//   dataToStore: 'Sored 1'
// });
