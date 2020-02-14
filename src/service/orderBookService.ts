import logger from '../util/logger';
import config from '../config/config';

const BitMEXClient = require('bitmex-realtime-api');
const wsBitMex = new BitMEXClient({
    testnet: config.isTestNet,
    apiKeyID: config.bitMexApiKey,
    apiKeySecret: config.bitMexApiSecret,
    maxTableLen: 10000
});

class OrderBookService {
    public static buyOne = 0;
    public static sellOne = 0;
    
    constructor() {}
    
    // TODO: We might need to remove this method in the future.
    public initOrderBookStream() {}

    public getBuyOne(){
        return OrderBookService.buyOne;
    }

    public getSellOne(){
        return OrderBookService.sellOne;
    }
}

wsBitMex.addStream('XBTUSD', 'orderBookL2', function (data) {
    if (!data.length) return;
    
    let sell:any[] = []
    let buy:any[] = []
    
    for(var i = 0; i < data.length; i++) {
        var e = data[i];
        if(e.side == 'Buy') {
            buy.push({
                size: e.size,
                price: e.price
            });
        } else {
            sell.push({
                size: e.size,
                price: e.price
            });
        }
    }

    buy.sort(function(a, b){
        return a.price - b.price;
    })
    sell.sort(function(a, b){
        return b.price - a.price;
    })

    while(buy.length > 10){
        buy.shift();
    }
    while(sell.length > 10){
        sell.shift();
    }

    buy.sort(function(a, b){
        return b.price - a.price;
    })

    OrderBookService.buyOne = buy[0].price;
    OrderBookService.sellOne = sell[9].price;

    // console.log("sellOne: ", OrderBookService.sellOne);
    // console.log("buyOne: ", OrderBookService.buyOne);
    // console.log("*********************");
});

wsBitMex.on("error", (error)=> {
    logger.error('Bitmext Socketio Connection has error!!!');
    logger.error(error);
});

export default new OrderBookService();