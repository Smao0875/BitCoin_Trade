import * as request from "request";
import logger from '../util/logger';
var crypto = require('crypto');
import config from '../config/config';
import constants from '../config/constants';
import global from '../config/global';
import mailService from '../service/mailService';

const bitmextUrl = config.bitMexUrl;
const apiKey = config.bitMexApiKey;
const apiSecret = config.bitMexApiSecret;

/**
 * This Service is for bitcoing order, will move all order related function to here
 */

export interface Order {
    symbol: string;
    side?: string; //Default to Buy
    //We intentionally set the contract sizes of BitMEX products at low values to encourage traders both large and small to trade on BitMEX.
    //However, some traders abuse this and spam the orderbook or trade feed with many small orders.
    //Accounts with too many open orders with a gross value less than 0.0025 XBT each will be labeled as a Spam Account.
    simpleOrderQty?: number;
    orderQty?: number;
    price?: number;
    displayQty?: number;
    stopPx?: number;
    clOrdID?: string;
    clOrdLinkID?: string;
    pegOffsetValue?: number;
    pegPriceType?: string;
    ordType?: string;
    timeInForce?: string;
    execInst?: string;
    contingencyType?: string;
    text?: string;
}
/**
 * filter: Generic table filter. Send JSON key/value pairs, such as {"key": "value"}. 
 * columns: Array of column names to fetch. If omitted, will return all columns.
 * reverse: default false, If true, will sort results newest first.
 */
export interface OrderFilter {
    symbol?: string;
    filter?: any;
    columns?: string;
    count?: number;
    start?: number;
    reverse?: number;
    startTime?: Date;
    endTime?: Date;
}

class OrderService {
    headers = {
        'content-type' : 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        // This example uses the 'expires' scheme. You can also use the 'nonce' scheme. See
        // https://www.bitmex.com/app/apiKeysUsage for more details.
        'api-expires': 0,
        'api-key': apiKey,
        'api-signature': ''
    };

    constructor() {

    }

    public async cancelAllOrders() {
        return new Promise((resolve, reject)=> {
            let verb = 'DELETE';
            let path = '/api/v1/order/all';
            let requestOptions = this.setDeleteRequestOptions(verb, path);

            request.delete(requestOptions, function(error, response, body) {
                if (error) { 
                    logger.error(error);
                    return reject({message: error});
                }

                logger.info("" + response.statusCode); 
                if(response.statusCode != 200) {
                    return reject({status: response.statusCode, message: body});
                }
                resolve(response);
            });
        }).catch(function(error){
            logger.error(error);
        });
    }

    // Create New Orders.
    public async createNewOrder(order: Order) {
        const self = this;

        return new Promise((resolve, reject)=> {
            let verb = 'POST';
            let path = '/api/v1/order';
            let requestOptions = this.setPostRequestOptions(order, verb, path);

            request.post(requestOptions, function(error, response, body) {
                if (error) { 
                    logger.error(error);
                    return reject({message: error});
                }

                logger.info("" + response.statusCode); 

                if(response.statusCode != 200) {
                    // SYSTEM OVERLOADED !
                    if(response.statusCode == 503){
                        logger.info("Re-submit order"); 

                        if(!global.SYSTEM_OVERLOAD){
                            let mailOptions = {
                                from: 'daily2work@gmail.com',
                                to: 'windmsh@gmail.com, evoleoxu@gmail.com',
                                subject: 'BitMex system overload',
                                text: 'BitMex system overload',
                            };
                            
                            mailService.sendMail(mailOptions);
                            global.SYSTEM_OVERLOAD = true;
                        }

                        setTimeout(async() => {
                            if (order.orderQty) {
                                let orderBook:any;
                                orderBook = await self.getOrderBook(constants.BTC_SYMBOL, 20);
                                let entryPrice = order.side == constants.DIRECTION_SELL ? 
                                                                    orderBook.buyOne : orderBook.sellOne;
                                order.price = entryPrice;
                            }
                            self.createNewOrder(order);
                        }, constants.RESUBMIT_INTERVAL);
                    }
                    return reject({status: response.statusCode, message: body});
                }
                resolve(response);
            });
        }).catch(function(error){
            logger.error(error);
        });
    }

    // Get Orders
    public getOrders() {
        return new Promise((resolve, reject)=> {
            let verb = 'GET';
            let path = '/api/v1/order?reverse=true&count=500&startTime=';

            var date = new Date().getTime();
            path = path + new Date(date-5*24*3600*1000).toISOString();

            let requestOptions = this.setGetRequestOptions(verb, path);

            request.get(requestOptions, function(error, response, body) {
                if (error) { 
                    logger.error(error);
                    return reject({message: error});
                }

                if(response.statusCode != 200) {
                    return reject({status: response.statusCode, message: body});
                }
                resolve(JSON.parse(response.body));
            });
        }).catch(function(error){
            logger.error(error);
        });
    }

    // Get OrderBook
    public async getOrderBook(symbol?, depth?) {
        return new Promise((resolve, reject)=> {
            let bitMextSymbol:string = symbol ? symbol : 'XBTUSD';
            let bitMexDepth: number = depth ? depth : 25;
            let verb = 'GET';
            let path = '/orderBook/L2';
            let requestOptions = {
                headers: {'Accept': 'application/json'},
                url: 'https://www.bitmex.com/api/v1' + path + '?symbol=' + bitMextSymbol + '&depth=' + bitMexDepth,
                method: verb
            }; 
            request.get(requestOptions, (error, response, body) => {
                if (error) { 
                    logger.error(error);
                    return reject({message: error});
                 }
                if(response.statusCode != 200) {
                    logger.error(body);
                    return reject({status: response.statusCode, message: body});
                }

                let sellBuyOne = this.processOrderBookData(JSON.parse(response.body));

                resolve(sellBuyOne);
            });
        }).catch(function(error){
            logger.error('getOrderBook: ');
            logger.error(error);
        });
    }

    // Create Bulk Order
    public async createBulkOrder(orders: Order[]) {
        const self = this;

        return new Promise((resolve, reject)=> {
            let verb = 'POST';
            let path = '/api/v1/order/bulk';
            let requestOptions = this.setPostRequestOptions(orders, verb, path);

            request.post(requestOptions, function(error, response, body) {
                if (error) { 
                    logger.error(error);
                    return reject({message: error});
                }

                logger.info("" + response.statusCode); 

                if(response.statusCode != 200) {
                    // SYSTEM OVERLOADED !
                    if(response.statusCode == 503){
                        logger.info("Re-submit order"); 

                        if(!global.SYSTEM_OVERLOAD){
                            let mailOptions = {
                                from: 'daily2work@gmail.com',
                                to: 'windmsh@gmail.com, evoleoxu@gmail.com',
                                subject: 'BitMex system overload',
                                text: 'BitMex system overload',
                            };
                            
                            mailService.sendMail(mailOptions);
                            global.SYSTEM_OVERLOAD = true;
                        }

                    }

                    // How to re-submit
                    
                    return reject({status: response.statusCode, message: body});
                }
                resolve(response);
            });
        }).catch(function(error){
            logger.error(error);
        });
    }

    private processOrderBookData(data:any[]) {
        let sell:any[] = [];
        let buy:any[] = [];

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

        return {buyOne: buy[2].price, sellOne: sell[7].price};
    }

    // Set DELET Request Options
    private setDeleteRequestOptions(verb, path) {
        let expires = new Date().getTime() + (60 * 1000);// 1 min in the future
        let signature = crypto.createHmac('sha256', apiSecret).update(verb + path + expires).digest('hex');  

        this.headers["api-expires"] = expires;
        this.headers["api-signature"] = signature;    
        let requestOptions = {
            headers: this.headers,
            url: bitmextUrl + path,
            method: verb
        }; 
        
        return requestOptions;
    }

    // Set POST Request Options
    private setPostRequestOptions(payload, verb, path) {
        let postBody = JSON.stringify(payload);
        let expires = new Date().getTime() + (60 * 1000);// 1 min in the future
        let signature = crypto.createHmac('sha256', apiSecret).update(verb + path + expires + postBody).digest('hex');  

        this.headers["api-expires"] = expires;
        this.headers["api-signature"] = signature;    
        let requestOptions = {
            headers: this.headers,
            url: bitmextUrl + path,
            method: verb,
            body: postBody
        }; 
        
        return requestOptions;
    }

        // Set Get Request Options
        private setGetRequestOptions(verb, path) {
            let postBody = '';
            let expires = new Date().getTime() + (60 * 1000);// 1 min in the future
            let signature = crypto.createHmac('sha256', apiSecret).update(verb + path + expires + postBody).digest('hex');  
    
            this.headers["api-expires"] = expires;
            this.headers["api-signature"] = signature;    
            let requestOptions = {
                headers: this.headers,
                url: bitmextUrl + path,
                method: verb
            }; 

            return requestOptions;
        }
    
}

export default new OrderService();