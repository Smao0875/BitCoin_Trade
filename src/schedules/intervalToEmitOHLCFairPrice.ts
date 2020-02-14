import fairPriceRespository from '../repository/fairPriceRepository';
import calcParameters from "../util/calcParameters";
import * as SocketIO from "socket.io";
import constants from '../config/constants';
import logger from "../util/logger";

class IntervalToEmitOHLCFairPrice {
    io: SocketIO.Server;
    static efficiency;
    constructor(io) {
        this.io = io;
    }

    public run() {  
        // Check and update OHLC fairPrice every minites
        setInterval(async ()=>{
            try {
                let fairPriceToday =  await fairPriceRespository.findOHLCFairPriceForToday();
                let OHLCFairPrice8days = await fairPriceRespository.findOHLCFairPriceForLast8Days();
    
                OHLCFairPrice8days[0].push({
                    openPrice: fairPriceToday[0][0].openPrice,
                    highPrice: fairPriceToday[0][0].highPrice,
                    lowPrice: fairPriceToday[0][0].lowPrice,
                    closePrice: fairPriceToday[0][0].closePrice,
                    efficiency: 0
                });
                IntervalToEmitOHLCFairPrice.efficiency = calcParameters.calculateEfficiency(OHLCFairPrice8days[0]);
                
                this.io.emit("fair_price",{type:'OHLC_TODAY', data: {fairPriceToday : fairPriceToday}});                
            } catch (error) {
                logger.error('Emit OHLC Fair Price: ');
                logger.error(error);
            }

        },constants.CHECK_FAIRPRICE_INTERVAL);      
    }
}

export default IntervalToEmitOHLCFairPrice;