/**
 * https://visionmedia.github.io/superagent/
 * 
 * TODO: change api-helper functions to class definition
 */

const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;

const server = require('../server');
const {Stock, User} = require('../schema');
const {
    cleanUpStockNames,
    findOrCreateStock,
    getStocks,
    doesUserExist,
    findOrCreateUser,
    setStockLikes,
    removeUserLikeFromStock,
    fetchStockPrice,
    constructStockData,
    setRelativeLikes
  } = require('../routes/api-helper');

chai.use(chaiHttp);

//async tests with callbacks either error out or pass with failing assertions.
//therefore, switching to iterative testing style
suite('Functional Tests', function() {
    suite('GET Request Tests', function() {

        test('pre-cleanup', async function(){
            const testIP = '1.2.3.4';
            await removeUserLikeFromStock("GOOG", testIP);

            let user = await findOrCreateUser(testIP);
            assert.notInclude(user.likedStocks, "GOOG", "user's liked stocks should not contain stock name 'GOOG'");

        })

        test('viewing one stock', async function() {
            let apiStockPrice = await fetchStockPrice("GOOG");

            let res = await chai.request(server)
                .get('/api/stock-prices?stock=GOOG')
                .catch((err) => { console.error(err); });
 
            assert.equal(res.status, 200);
            assert.exists(res.body.stockData, 'response contains "stockData" wrapper');
            assert.exists(res.body.stockData.stock, 'stockData contains "stock" property');
            assert.exists(res.body.stockData.price, 'stockData contains "price" property');
            assert.exists(res.body.stockData.likes, 'stockData contains "likes property');
            assert.equal(res.body.stockData.stock, "GOOG", 'stock name is correctly set');
            assert.equal(res.body.stockData.price, apiStockPrice, 'stock price should match immediate stock price fetched from api proxy');
        });

        test('viewing and liking one stock', async function() {
            const testIP = '1.2.3.4';
            
            //getting like count of stock before user like
            let {likes : preLikes} = await findOrCreateStock("GOOG");

            res = await chai.request(server)
                .get('/api/stock-prices?stock=GOOG&like=true')
                .set('x-forwarded-for',testIP)
                .catch((err) => { console.error(err); });
                            
            let user = await findOrCreateUser(testIP);
            
            assert.include(user.likedStocks, "GOOG", "user's liked stocks should contain stock name 'GOOG'");

            assert.equal(res.status, 200);
            assert.exists(res.body.stockData, 'response contains "stockData" wrapper');
            assert.equal(preLikes + 1, res.body.stockData.likes, "stock should contain one more like from user");

            // CLEAN UP //
            await removeUserLikeFromStock("GOOG", testIP);
        });

        test('attempting to like the same stock again', async function() {
            const testIP = '1.2.3.4';

            let res = await chai.request(server)
                .get('/api/stock-prices?stock=GOOG&like=true')
                .set('x-forwarded-for',testIP)
                .catch((err) => { console.error(err); });

            let preLikes = res.body.stockData.likes;

            res = await chai.request(server)
                .get('/api/stock-prices?stock=GOOG&like=true')
                .set('x-forwarded-for',testIP)
                .catch((err) => { console.error(err); });

            let user = await findOrCreateUser(testIP);

            assert.include(user.likedStocks, "GOOG", "user's liked stocks should contain stock name 'GOOG'");

            assert.equal(res.status, 200);
            assert.exists(res.body.stockData, 'response contains "stockData" wrapper');
            assert.equal(res.body.stockData.stock, "GOOG");
            assert.equal(preLikes, res.body.stockData.likes, "stock should contain same amount of likes from user. user should not be able to like twice");

            // CLEAN UP //
            await removeUserLikeFromStock("GOOG", testIP);
        });

        test('viewing two stocks', async function() {
            const testIP = '1.2.3.4';

            let apiStockPriceGOOG = await fetchStockPrice("GOOG");
            let apiStockPriceMSFT = await fetchStockPrice("MSFT");

            let res = await chai.request(server)
                .get('/api/stock-prices?stock=GOOG&stock=MSFT')
                .catch((err) => { console.error(err); });

            assert.equal(res.status, 200);
            assert.exists(res.body.stockData, 'response contains "stockData" wrapper');
            assert.isArray(res.body.stockData, 'stockData should be an array');
            assert.equal(res.body.stockData.length, 2, 'stockData array should contain two stock objects');
            assert.equal(res.body.stockData[0].price, apiStockPriceGOOG, 'GOOG stock price should match immediate stock price fetched from api proxy');
            assert.equal(res.body.stockData[1].price, apiStockPriceMSFT, 'MSFT stock price should match immediate stock price fetched from api proxy');
            assert.exists(res.body.stockData[0]["rel-likes"], '"rel-likes" property should be included instead of "likes" property');
            assert.exists(res.body.stockData[1]["rel-likes"], '"rel-likes" property should be included instead of "likes" property');
        });

        test('viewing and liking two stocks', async function() {
            const testIP = '1.2.3.4';

            let {likes : preLikesGOOG} = await findOrCreateStock("GOOG");
            let {likes : preLikesMSFT} = await findOrCreateStock("MSFT");

            let res = await chai.request(server)
                .get('/api/stock-prices?stock=GOOG&stock=MSFT&like=true')
                .set('x-forwarded-for',testIP)
                .catch((err) => { console.error(err); });

            let {likes : postLikesGOOG} = await findOrCreateStock("GOOG");
            let {likes : postLikesMSFT} = await findOrCreateStock("MSFT");


            let user = await findOrCreateUser(testIP);

            assert.equal(res.status, 200);
            assert.exists(res.body.stockData, 'response contains "stockData" wrapper');
            assert.isArray(res.body.stockData, 'stockData should be an array');
            assert.equal(res.body.stockData.length, 2, 'stockData array should contain two stock objects');
            assert.include(user.likedStocks, "GOOG", "user's liked stocks should contain stock name 'GOOG'");
            assert.include(user.likedStocks, "MSFT", "user's liked stocks should contain stock name 'MSFT'");
            assert.equal(preLikesGOOG + 1, postLikesGOOG, "stock should contain one more like because of user.");
            assert.equal(preLikesMSFT + 1, postLikesMSFT, "stock should contain one more like because of user.");
            
        
            //CLEAN UP//
            await removeUserLikeFromStock("GOOG", testIP);
            await removeUserLikeFromStock("MSFT", testIP);
        });

        test('post-cleanup', async function(){
            const testIP = '1.2.3.4';
            await removeUserLikeFromStock("GOOG", testIP);
            await removeUserLikeFromStock("MSFT", testIP);

            let user = await findOrCreateUser(testIP);
            assert.notInclude(user.likedStocks, "GOOG", "user's liked stocks should not contain stock name 'GOOG'");
            assert.notInclude(user.likedStocks, "MSFT", "user's liked stocks should not contain stock name 'MSFT'");
        })
    });
});
