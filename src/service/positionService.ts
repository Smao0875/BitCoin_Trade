import * as request from "request";
import logger from '../util/logger';
var crypto = require('crypto');
import config from '../config/config';

const bitmextUrl = config.bitMexUrl;
const apiKey = config.bitMexApiKey;
const apiSecret = config.bitMexApiSecret;

export interface Order {
    symbol: string;
    side?: string; //Default to Buy
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

/* 
* filter: Table filter. For example, send {"symbol": "XBTUSD"}.
* columns: Which columns to fetch. For example, send ["columnName"].
* count: Number of rows to fetch.
*/
export interface Position {
    filter?: any;
    columns?: string;
    count?: number;
}

/**
 * symbol: Symbol of position to adjust.
 * leverage: Leverage value. Send a number between 0.01 and 100 to enable isolated margin with a fixed leverage. Send 0 to enable cross margin.
 */
export interface PositionLeverage {
    symbol: string;
    leverage: number;
}


class PositionService {
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

    //Get Position
    public getPosition(position: Position) {
        return new Promise((resolve, reject)=> {
            let verb = 'GET';
            let path = '/api/v1/position?';
            if(position.filter) {
                path = path + 'filter=' + encodeURIComponent(JSON.stringify(position.filter));
            }
            if(position.columns) {
                path = path + '&' + position.columns;
            }
            if(position.count) {
                path = path + '&count=' + position.count;
            }
            let requestOptions = this.setGetRequestOptions(position, verb, path);
    
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
            logger.error('Get Position: ');
            logger.error(error);
        });
    }
    
    // Set Position Leverage
    public setPositionLeverage(positionLeverage: PositionLeverage) {
        return new Promise((resolve, reject)=> {
            let verb = 'POST';
            let path = '/api/v1/position/leverage';

            let requestOptions = this.setPostRequestOptions(positionLeverage, verb, path);
    
            request.post(requestOptions, function(error, response, body) {
                if (error) { 
                    logger.error(error);
                    return reject({message: error});
                 }
                if(response.statusCode != 200) {
                    logger.info(path);
                    logger.error(body);
                    return reject({status: response.statusCode, message: body});
                }
                resolve(response.body);
            });
        }).catch(function(error){
            logger.error('setPositionLeverage: ');
            logger.error(error);
        });
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
    private setGetRequestOptions(payload, verb, path) {
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

export default new PositionService();