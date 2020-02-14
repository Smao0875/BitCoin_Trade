import * as request from "request";
var crypto = require('crypto');
import Binance from 'binance-api-node'

const binancemextUrl = 'https://api.binance.com';
const binanceApiKey = 'RArc83tNvjgs9octKVU64WCxkvtZChKC0GH28d1jxquLx0UCcyPxGNkNNRbfJ66s';
const binanceApiSecret = 'CYW9OfxPmcktsbCSDlieIkRKX3UXhzzlVObJl14W6qa9Qhes7afLmRoxXsh18DGh';

//USER binance api node
const client2 = Binance({
    apiKey: binanceApiKey,
    apiSecret: binanceApiSecret,
});

class BinanceUserDataService {
    headers = {
        'content-type' : 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-MBX-APIKEY': binanceApiKey
    };    
    constructor() {

    }

    public getBinanceUserData() {

        let date = new Date().getTime();
        let queryString = 'recvWindow=5000&timestamp=' + date;
        let signature = crypto.createHmac('sha256', binanceApiSecret).update(queryString).digest('hex');    
        let requestOptions = {
            headers: this.headers,
            url: 'https://api.binance.com/api/v3/account?' + queryString + '&signature=' + signature,
            method: 'GET'
        };         
        request.get(requestOptions,function(error, response, body) {
            console.log(JSON.stringify(response));
        });
    }

    //USER BINANCE api node
    public async getBinanceUserData1() {
        console.log(await client2.accountInfo());
    }

}

export default new BinanceUserDataService()