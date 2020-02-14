import fairPriceRespository from '../repository/fairPriceRepository';
import * as SocketIO from "socket.io";
import constants from '../config/constants';
import logger from "../util/logger";
import userAccountService from '../service/userAccountService';
import positionService from '../service/positionService';

class IntervalToEmitFairPrice {
    io: SocketIO.Server;
    static currFairPrice;
    constructor(io) {
        this.io = io;
    }

    public run() {  
        setInterval(async ()=>{
            try {
                let price =  await fairPriceRespository.find();
                IntervalToEmitFairPrice.currFairPrice = price[0][0].currfairprice;
                this.io.emit("fair_price",{type:'FAIR_PRICE', data: {
                    price : price,
                }});            
            } catch(error) {
                logger.error(error);
            }
        },constants.CHECK_CURR_PRICE_INTERVAL);

        setInterval(async () => {
            try {
                let margin : any;
                margin = await userAccountService.getUserMargin();

                this.io.emit("user_margin",{type:'USER_MARGIN', data: {
                    userMargin : margin[0],
                }});            
            } catch(error) {
                logger.error(error);
            }
        }, constants.CHECK_POSITION_MARGIN_INTERVAL);

        setInterval(async () => {
            try {
                let existingPosition : any;
                existingPosition = await positionService.getPosition({
                    "filter": {"symbol": "XBTUSD"},
                    "count" : 1
                });

                this.io.emit("curr_position",{type:'CURR_POSITION', data: {
                    currPosition : existingPosition[0],
                }});
            } catch(error) {
                logger.error(error);
            }
        }, constants.CHECK_POSITION_MARGIN_INTERVAL);
    }
}

export default IntervalToEmitFairPrice;