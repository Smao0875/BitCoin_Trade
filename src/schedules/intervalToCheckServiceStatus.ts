import * as SocketIO from "socket.io";
import constants from '../config/constants';
import IntervalToEmitFairPrice from '../schedules/intervalToEmitFairPrice';
import dbConfig from "../config/dbConfig";
import logger from '../util/logger';

class IntervalToCheckServiceStatus {
    io: SocketIO.Server;

    constructor(io) {
        this.io = io;
    }

    public run() {  
        let timer:number = 0;
        let prevFairPrice: number;

        setInterval(async ()=> {
            if (prevFairPrice != IntervalToEmitFairPrice.currFairPrice) {
                prevFairPrice = IntervalToEmitFairPrice.currFairPrice;
                timer = 0;
            } else {
                timer ++;
                // there is something wrong, we set it to 2 because I want to make sure the server is down.
                if (timer >= 2) { 
                    logger.info("Something is wrong, we are switching database connection");
                    
                    timer = 0;
                    dbConfig.switchDbPool();
                }
            }
        },constants.CHECK_SERVER_DOWN_INTERVAL);       
    }
}

export default IntervalToCheckServiceStatus;