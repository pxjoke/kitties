db.getCollection('transactions').aggregate({$group: {_id:'$decodedInput.name', count: { $sum: 1 }}})

