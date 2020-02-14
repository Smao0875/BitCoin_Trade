import * as request from "request";
import logger from '../util/logger';
var crypto = require('crypto');
import config from '../config/config';

const bitmextUrl = config.bitMexUrl;
const apiKey = config.bitMexApiKey;
const apiSecret = config.bitMexApiSecret;


class UserAccountService {
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

    //Get User Margin
    public getUserMargin() {
        return new Promise((resolve, reject)=> {
            let verb = 'GET';
            let path = '/api/v1/user/margin?currency=all';//Parameter is currency

            let requestOptions = this.setGetRequestOptions(verb, path);
    
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
                //logger.info(JSON.stringify(response)); 
                resolve(JSON.parse(response.body));
            });
        });
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

export default new UserAccountService();