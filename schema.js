const mongoose = require('mongoose')

module.exports = function (app) {

const StockSchema = new mongoose.Schema({
    stock: {
        type: String,
        required: [true, "Stock name is not provided, yet required"]
    },
    likes: {
        type: Number,
        default: 0
    }
});

const Stock = mongoose.model('stock', StockSchema);

/*  stocks may contain millions of likes, and it is more probable
    that users have liked less stocks than stocks recieved likes,
    therefore, for the purpose of scanning for duplicate likes, users will recieve a list of liked stocks,
    instead of stocks containing an array of all users that liked it 
 */
const UserSchema = new mongoose.Schema({
    ip: {
        type: String,
        required: [true, "IP is not provided, yet required"]
    },
    likedStocksId: [String]
});

const User = mongoose.model('user', UserSchema);

};