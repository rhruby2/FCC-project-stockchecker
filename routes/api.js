

'use strict';
const fetch = require ('node-fetch');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const {Stock, User} = require('../schema');
const {
  cleanUpStockNames,
  findOrCreateStock,
  getStocks,
  findOrCreateUser,
  setStockLikes,
  fetchStockPrice,
  constructStockData,
  setRelativeLikes
} = require('./api-helper');

module.exports = function api(app) {

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
