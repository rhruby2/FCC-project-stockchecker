const mongoose = require('mongoose')

const StockSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Stock name is not provided, yet required"]
    },
    likes: {
        type: Number,
        default: 0
    }
});

const Stock = mongoose.model('stock', StockSchema);

/*  It is more probable
    that users have liked less stocks than stocks recieved likes,
    therefore, for the purpose of scanning for duplicate likes, users will recieve a list of liked stocks,
    instead of stocks containing an array of all users that liked it 
 */
const UserSchema = new mongoose.Schema({
    ip: {
        type: String,
        required: [true, "IP is not provided, yet required"]
    },
    likedStocks: {
        type: [String],
        default: []
    }
});

const User = mongoose.model('user', UserSchema);

module.exports = { Stock, User };
