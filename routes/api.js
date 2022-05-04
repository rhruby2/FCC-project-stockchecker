'use strict';
const fetch = require ('node-fetch');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const {Stock, User} = require('../schema');

module.exports = function (app) {

const stockPriceProxyURL = "https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/[symbol]/quote"


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
 * @description makes api calls to get the stock prices
 * @param {String} stock 
 * @returns Number
 */
 const fetchStockPrice = async (stock) => {
  let url = stockPriceProxyURL.replace("[symbol]",stock)
  
  const response = await fetch(url)
  const data = await response.json()
  
  //console.log(data)
  
  return data.latestPrice;
}

/**
 * @description generalized function to get stock data from 1 to n stocks
 * @param {[Stock]} stocks
 * @returns {[Object]}
 */
const constructStockData = async (stocks) => {
    const stockData = stocks.map(async (stock) => {           
      const stockPrice = await fetchStockPrice(stock.name);

      return {
        stock: stock.name,
        price: stockPrice,
        likes: stock.likes
      }
    });

    return await Promise.all(stockData)
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
  const user = users.filter(async (user) => {
    return await bcrypt.compare(ip, user.ip);
  })

  return await Promise.all(user) || User.create({"ip": bcrypt.hashSync(ip, saltRounds )})
}

/**
 * Adds user likes if it exists, and they haven't liked the stock already
 * https://stackfame.com/get-ip-address-node
 * @param {Object} req
 * @param {[Stock]} stocks 
 */
const setStockLikes = async (req, stocks) => {
  let ip = req.header('x-forwarded-for') || req.connection.remoteAddress;

  if(req.query.like){
    const user = findOrCreateUser(ip);
    stocks.map( async (stock) => {

    })
  }
}

/**
 * changes "like" property to "rel-likes" (relative likes) property if comparing stocks
 * @param {[Stock]} stocks 
 */
const getRelativeLikes = (stocks) => {
  //placeholder
  return stocks
}

app.route('/api/stock-prices')
  .get(function (req, res){
    //convert input into an array, if one does not exist already
    let stockNames = (Array.isArray(req.query.stock)) ? req.query.stock : new Array(req.query.stock);
    
    getStocks(stockNames)
      .then((stocks) => { setStockLikes(req, stocks) })
      .then((stocks) => { getRelativeLikes(stocks) })
      .then((stocks) => { constructStockData(stocks) })
      .then((stocks) => {
        //unwrap array if there is only one stock
        return stocks.length === 1 ? stocks[0] : stocks
      })
      .then(stocks => res.json(
        {
          "stockData": stocks
        }
      ));
  });
    
};
