const Web3 = require("web3");
const async = require("async");
const MongoClient = require("mongodb").MongoClient;

const utils = require("./utils");

const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

const startBlockIdx = 4600000;
const lastBlockIdx = 4744062;

// Connection URL
const url = "mongodb://localhost:27017";

// Database Name
const dbName = "kitTest";

const auctionAddress = "0xb1690C08E213a35Ed9bAb7B318DE14420FB57d8C";
const coreAddress = "0x06012c8cf97BEaD5deAe237070F9587f8E7A266d";
const siringAddress = "0xC7af99Fe5513eB6710e6D5f44F9989dA40F27F26";

const contractNames = {
    [auctionAddress]: "CryptoKittiesAuction",
    [coreAddress]: "CryptoKittiesCore",
    [siringAddress]: "CryptoKittiesSiring"
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

const getContractName = ({to, from}) =>
    contractNames[to] || contractNames[from];

const convertTx = tx => {
    return Object.assign({}, tx, {
        decodedInput: utils.decodeInput(tx.input),
        decodedValue: web3.utils.fromWei(tx.value),
        contractName: getContractName(tx)
    });
};

const decodeTxInput = ({to, from, input}) => {
    let decoder = decoders[to] ? decoders[to] : decoders[from];
    return decoder(input);
};

const getParameterValue = (paramName, params) => {
    const param = params.find(p => p.name === paramName);
    return param ? param.value : null;
};

const getStoreTxRequest = convertedTx => {
    const {name, params} = convertedTx.decodedInput;

    switch (name) {
        case "bid":
        case "createSaleAuction":
        case "createSiringAuction":
            return [
                {
                    kittyId: getParameterValue("_kittyId", params),
                    name,
                    dataToStore: {
                        tx: convertedTx
                    }
                }
            ];
        case "bidOnSiringAuction":
        case "breedWithAuto":
            return [
                {
                    kittyId: getParameterValue("_matronId", params),
                    name,
                    dataToStore: {
                        genderRole: "matron",
                        tx: convertedTx
                    }
                },
                {
                    kittyId: getParameterValue("_sireId", params),
                    name,
                    dataToStore: {
                        genderRole: "sire",
                        tx: convertedTx
                    }
                }
            ];
        default:
            return [];
    }
};

const groupTxsByKitties = (kitties, tx) => {
    if (!isKittyTx(tx)) {
        return kitties;
    }

    const convertedTx = convertTx(tx);
    const storeTxRequest = getStoreTxRequest(convertedTx);

    storeTxRequest.forEach(request => {
        const {kittyId, name, dataToStore} = request;
        let kitty = kitties.find(k => k.kittyId === kittyId);
        if (!kitty) {
            kitty = {kittyId};
            kitties.push(kitty);
        }

        kitty[name] = Array.isArray(kitty[name]) ? [...kitty[name], dataToStore] : [dataToStore];
    });

    return kitties;
};

const generateIndexesArray = (start, end) =>
    [...Array(end - start)].map((v, i) => i + start);

const processBlock = (block, index, db, callback) => {
    const txsByKitties = block.transactions.reduce(groupTxsByKitties, []);

    console.log(`Block #${index}`);
    console.log(txsByKitties);
    callback();
    db
      .collection("kitties")
      .insertMany(txToStore)
      .catch(err => console.log(err))
      .then(callback);
};

function storeKittyTxs(db, startBlockIdx, endBlockIdx, callback) {
    const blockIndexes = generateIndexesArray(startBlockIdx, endBlockIdx);

    async.eachLimit(
        blockIndexes,
        20,
        (index, callback) =>
            web3.eth
                .getBlock(index, true)
                .then(block => processBlock(block, index, db, callback)),
        callback
    );
}

MongoClient.connect(url, function (err, client) {
    if (err) {
        console.log(err);
    }

    const db = client.db(dbName);
    storeKittyTxs(db, 4610019, 4610100, () => client.close());
});
