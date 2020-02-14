import logger from '../util/logger';
import config from '../config/config';
import request from 'request';
var crypto = require('crypto');

const bitmextUrl = config.bitMexUrl;
const apiKey = config.bitMexApiKey;
const apiSecret = config.bitMexApiSecret;

class TradingHistoryRepository {
    
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

    // public async getTradingHistoryFromDatabase(): Promise<any>{
    //     return new Promise<any>((resolve, reject)=> {
    //         dbClient.pool.query(TRADE_HISTORY_SQL, function(error, results, fields) {
    //             if(error) {
    //                 logger.error("getTradingHistory: ");
    //                 logger.error(error);
    //                 return reject(error);
    //             }
    //             resolve(results);
    //         });
    //     }).catch(function(error){
    //         logger.error("getTradingHistory: " + error);
    //     });
    // }

    public async getTradingHistoryFromAPI(): Promise<any>{
        
        return new Promise<any>((resolve, reject)=> {
            let verb = 'GET';
            let path = '/api/v1/execution/tradeHistory?reverse=true&count=500&startTime=';

            // we will show the most recent 500 records in the past trading day.
            var date = new Date().getTime();
            path = path + new Date(date-10*24*3600*1000).toISOString();
    
            let expires = new Date().getTime() + (60 * 1000); // 1 min in the future
            let signature = crypto.createHmac('sha256', apiSecret).update(verb + path + expires).digest('hex');  
    
            this.headers["api-expires"] = expires;
            this.headers["api-signature"] = signature;    
            let requestOptions = {
                headers: this.headers,
                url: bitmextUrl + path, 
                method: verb
            };

            request.get(requestOptions, function(error, response, body) {
                if (error) { 
                    logger.error(error);
                    return reject({message: error});
                 }
                if(response.statusCode != 200) {
                    logger.info(path);
                    logger.error(body);
                    return reject({status: response.statusCode, message: body});
                }
                resolve(JSON.parse(response.body));
            });
        }).catch(function(error){
            logger.error("getTradingHistoryFromAPI: " + error);
        });
    }
}

export default new TradingHistoryRepository();