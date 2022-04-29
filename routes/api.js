'use strict';
const fetch = require ('node-fetch');
const mongoose = require('mongoose');

const {Stock, User} = require('../schema');

module.exports = function (app) {

const stockPriceProxyURL = "https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/[symbol]/quote"

/**
 * @description makes an api call to get the stock price
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
 * @param {[String]} stocks 
 * @returns {[String]}
 */
const constructStockData = async (stocks) => {
    const stockData = stocks.map(async (stockName) => {
      const stockPrice = await fetchStockPrice(stockName);

      return {
        stock: stockName,
        price: stockPrice,
        likes: "not yet implemented"
      }
    });

    return await Promise.all(stockData)
}

app.route('/api/stock-prices')
  .get(function (req, res){
    //convert input into an array, if one does not exist already
    let stockNames = (Array.isArray(req.query.stock)) ? req.query.stock : new Array(req.query.stock);
    
    constructStockData(stockNames)
      .then((stockPrices) => {
        //unwrap array if there is only one stock
        return stockPrices.length === 1 ? stockPrices[0] : stockPrices 
      })
      .then(stockPrices => res.json(stockPrices));
  });
    
};
