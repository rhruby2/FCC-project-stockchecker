'use strict';
const fetch = require ('node-fetch');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const {Stock, User} = require('../schema');

module.exports = function (app) {

const stockPriceProxyURL = "https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/[symbol]/quote"


/**
 * converts stockNames into correct and iterable format
 * @param {String || [String]} stockNames 
 * @returns [String] stockNames
 */
const cleanUpStockNames = (stockNames) => {
  //wrap stockNames into an array
  stockNames = (Array.isArray(stockNames)) ? stockNames : new Array(stockNames);
  //ignore stockNames greater than 2
  if(stockNames.length > 2){
    stockNames = stockNames.slice(0,3);
  }
  stockNames = stockNames.map((stockName) => {
    return stockName.toUpperCase();
  })
  return stockNames;
}

/**
 * 
 * @param {String} stockName 
 * @returns Stock document
 */
 const findOrCreateStock = async (stockName) => {
  const stock = await Stock.findOne(
    {
      name: stockName
    }
  ).exec();

  return stock || Stock.create({name: stockName})
}

/**
 * gets stock documents in database
 * @param {[String]} stockNames 
 * @returns {[Stock]} array of Stock documents
 */
const getStocks = async(stockNames) => {
  const stocks = stockNames.map(async (stockName) => {
    return await findOrCreateStock(stockName);
  });

  return await Promise.all(stocks);
}

/**
 * 
 * @param {String} ip User's IP Address
 * @returns User document
 */
const findOrCreateUser = async (ip) => {
  const saltRounds = 10;
  const users = await User.find();
  //compare hashed passwords to current user ip
  //  Array.find() returns first element found, which might be slightly faster than Array.filter()
  //  given that there should only be one match
  /*
  const user = users.filter(async (user) => {
    return await bcrypt.compare(ip, user.ip);
  })
  */
  const user = users.find(async (user) => {
    await bcrypt.compare(ip, user.ip);
  });


  return user || await User.create({"ip": bcrypt.hashSync(ip, saltRounds )})
}

/**
 * Adds user likes if it exists, and they haven't liked the stock already
 * https://stackfame.com/get-ip-address-node
 * @param {Object} req
 * @param {[Stock]} stocks 
 */
const setStockLikes = async (req, stocks) => {
  console.log("SET STOCK LIKES ()");

  if(req.query.like === "true"){
    console.log("-- like")
    const ip = req.header('x-forwarded-for') || req.connection.remoteAddress;
    const user = await findOrCreateUser(ip);

    const updatedStocks = stocks.map((stock) => {
      if(!user.likedStocks.includes(stock.name)){
        //add to user liked stocks
        user.likedStocks.push(stock.name)
        //increment Stock document likes
        stock.likes += 1;
      }
      return stock;
    });
    console.log("---UPDATED STOCKS:")
    console.log(updatedStocks);
    Stock.create(updatedStocks);
    user.save();
    return updatedStocks;
  }

  console.log("-- returning stocks ()");
  return stocks;
}

/**
 * @description makes api calls to get the stock prices
 * @param {String} stock 
 * @returns Number
 */
 const fetchStockPrice = async (stock) => {
  let url = stockPriceProxyURL.replace("[symbol]",stock)
  
  const response = await fetch(url)
  const data = await response.json()

  return data.latestPrice;
}

/**
 * @description generalized function to get stock data from 1 to n stocks
 * @param {[Stock]} stocks
 * @returns {[Object]}
 */
const constructStockData = async (stocks) => {
  console.log("CONSTRUCT STOCK DATA")
  console.log(stocks);
  const stockData = stocks.map(async (stock) => {           
    const stockPrice = await fetchStockPrice(stock.name);

    return {
      stock: stock.name,
      price: stockPrice,
      likes: stock.likes
    }
  });

  return await Promise.all(stockData);
}

/**
 * changes "like" property to "rel-likes" (relative likes) property if comparing stocks
 * @param {[Object]} stockData
 * @returns {[Object]} stockData
 */
 const setRelativeLikes = (stockData) => {
  if(stockData.length > 1){
    stockData[0]["rel-likes"] = stockData[0].likes - stockData[1].likes;
    stockData[1]["rel-likes"] = stockData[1].likes - stockData[0].likes;

    delete stockData[0].likes;
    delete stockData[1].likes;
  }
  return stockData
}

app.route('/api/stock-prices')
  .get(function (req, res){
    let stockNames = cleanUpStockNames(req.query.stock);

    getStocks(stockNames)
      .then((stocks) => setStockLikes(req, stocks))
      .then((stocks) => constructStockData(stocks))
      .then((stockData) => setRelativeLikes(stockData))
      .then((stockData) => {
        //unwrap array if there is only one stock
        return stockData.length === 1 ? stockData[0] : stockData
      })
      .then(stockData => res.json(
        {
          "stockData": stockData
        }
      ))
      .catch((err) => console.log(err));
  });
    
};
