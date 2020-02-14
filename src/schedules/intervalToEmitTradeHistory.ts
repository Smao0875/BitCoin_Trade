import tradeHistoryRepository from '../repository/tradeHistoryRepository';
import * as SocketIO from "socket.io";
import constants from '../config/constants';
import logger from "../util/logger";
import orderService from '../service/orderService';

class IntervalToEmitTradeHistory {
    io: SocketIO.Server;
    
    constructor(io) {
        this.io = io;
    }

    public run() {  
        // Update tradeHistory every 5 minites
        setInterval(async ()=>{
            try {
                let recentTradeHistory =  await tradeHistoryRepository.getTradingHistoryFromAPI();
                this.io.emit("trade_history",{type:'TRADE_HISTORY', data: {tradeHistory : recentTradeHistory}});                
            } catch (error) {
                logger.error('Emit trade history: ');
                logger.error(error);
            }
        },constants.UPDATE_TRADE_HISTORY_INTERVAL);   

        setInterval(async ()=>{
            try {
                let recentOrderHistory =  await orderService.getOrders();
                this.io.emit("order_history",{type:'ORDER_HISTORY', data: {orderHistory : recentOrderHistory}});                
            } catch (error) {
                logger.error('Emit order history: ');
                logger.error(error);
            }
        },constants.UPDATE_TRADE_HISTORY_INTERVAL);   
    }
}   

export default IntervalToEmitTradeHistory;