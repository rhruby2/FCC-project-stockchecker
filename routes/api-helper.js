'use strict';

const fetch = require ('node-fetch');
const bcrypt = require('bcrypt');

const {Stock, User} = require('../schema');


class APIHelper {

  constructor(){
    this._stockPriceProxyURL = "https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/[symbol]/quote";
  }

  /**
   * converts stockNames into correct and iterable format
   * @param {String | [String]} stockNames 
   * @returns {[String]} stockNames
   */
  cleanUpStockNames = (stockNames) => {
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
   * @async
   * @param {String} stockName 
   * @returns {Stock} Stock document
   */
  findOrCreateStock = async (stockName) => {
    const stock = await Stock.findOne(
      {
        name: stockName
      }
    ).exec();

    return stock || Stock.create({name: stockName})
  }

  /**
   * gets stock documents in database
   * @async
   * @param {[String]} stockNames 
   * @returns {[Stock]} array of Stock documents
   */
  getStocks = async(stockNames) => {
    const stocks = stockNames.map(async (stockName) => {
      return await this.findOrCreateStock(stockName);
    });

    return await Promise.all(stocks);
  }


  /**
   * used for testing purposes in tests/functional-tests.js
   * @async
   * @param {String} ip user's ip (non-hashed)
   * @returns {Boolean} if user is not undefined
   */
  doesUserExist = async (ip) => {
    const saltRounds = 10;
    const users = await User.find();

    //returns undefined if not found
    const user = users.find(async (user) => {
        await bcrypt.compare(ip, user.ip);
    });

    user === undefined ? console.log('user does not exist') : console.log('user does exist');

    return user === undefined ? false : true;
  }

  /**
   * @async
   * @param {String} ip User's IP Address
   * @returns {User} User document
   * 
   * @ignore TODO: implement user cache
   */
  findOrCreateUser = async (ip) => {
      const saltRounds = 10;
      const users = await User.find();
      //compare hashed passwords to current user ip
      //  Array.find() returns first element found, which might be slightly faster than Array.filter(),
      //  given that there should only be one match

      const user = users.find(async (user) => {
          await bcrypt.compare(ip, user.ip);
      });

      if(user === undefined){
          console.log('findOrCreateUser(): user does not exist. Creating User');
      }


      return user || await User.create({"ip": bcrypt.hashSync(ip, saltRounds )})
  }

  /**
   * used for testing purposes in tests/functional-tests.js
   * @async
   * @param {String} stockName
   * @param {String} ip user ip  string (non-hashed) 
   */
  removeUserLikeFromStock = async (stockName, ip) => {
    let userDocument = await this.findOrCreateUser(ip);
    let stockDocument = await this.findOrCreateStock(stockName);
    
    //only modify if user has liked the stock
    if(userDocument.likedStocks.includes(stockName)){
      let preLikedStocksLength = userDocument.likedStocks.length;

      //removed stockName from likedStocks
      userDocument.likedStocks = userDocument.likedStocks.filter((stock) => {
          return stock != stockName;
      });

      //only remove like if the liked stock was removed
      //removes more than one like to account for duplicates error
      if(preLikedStocksLength > userDocument.likedStocks.length){
          stockDocument.likes -= (preLikedStocksLength-userDocument.likedStocks.length);
          //accounting for negative likes error
          if(stockDocument.likes < 0){
            stockDocument.likes = 0;
          }
      }
      console.log('removeUserLikeFromStock(): removed user like from stock');

      await userDocument.save();
      await stockDocument.save();
    } else {
      console.log('removeUserLikeFromStock(): user did not like stock');
    }
  }

  /**
   * Adds user likes if it exists, and they haven't liked the stock already
   * https://stackfame.com/get-ip-address-node
   * @async
   * @param {Object} req request object
   * @param {[Stock]} stocks array of Stock Documents
   * @returns {[Stock]} array of Stock Documents
   */
  setStockLikes = async (req, stocks) => {
    if(req.query.like === "true"){
      const ip = req.header('x-forwarded-for') || req.connection.remoteAddress;
      console.log(`setStockLikes(), ip: ${ip}`);
      const user = await this.findOrCreateUser(ip);

      const updatedStocks = stocks.map((stock) => {
        if(!user.likedStocks.includes(stock.name)){
          console.log(`-- adding user like to ${stock.name}`);
          //add to user liked stocks
          user.likedStocks.push(stock.name)
          //increment Stock document likes
          stock.likes += 1;
        }
        return stock;
      });

      await Stock.create(updatedStocks); //update stocks in database
      await user.save();

      return updatedStocks;
    }

    return stocks;
  }

  /**
   * @description makes an api call to get the stock price
   * @param {String} stock 
   * @returns {Number} stock price
   */
  fetchStockPrice = async (stock) => {
    let url = this._stockPriceProxyURL.replace("[symbol]", stock);
    
    const response = await fetch(url);
    const data = await response.json();

    return data.latestPrice;
  }

  /**
   * @description generalized function to get stock data from 1 to n stocks
   * @param {[Stock]} stocks array of Stock Documents
   * @returns {[Object]} array of stock objects for JSON response
   */
  constructStockData = async (stocks) => {
    const stockData = stocks.map(async (stock) => {           
      const stockPrice = await this.fetchStockPrice(stock.name);

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
   * @returns {[Object]} stock objects for JSON response
   */
  setRelativeLikes = (stockData) => {
    if(stockData.length > 1){
      stockData[0]["rel-likes"] = stockData[0].likes - stockData[1].likes;
      stockData[1]["rel-likes"] = stockData[1].likes - stockData[0].likes;

      delete stockData[0].likes;
      delete stockData[1].likes;
    }
    return stockData
  }

}

module.exports = new APIHelper();