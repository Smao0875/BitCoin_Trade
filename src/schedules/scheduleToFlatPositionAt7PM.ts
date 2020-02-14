import * as schedule from "node-schedule";
import positionService from '../service/positionService';
import orderService from '../service/orderService';
import { Order } from '../service/orderService';
import constants from '../config/constants';
import ScheduleToPlaceOrderAt8PM from './scheduleToPlaceOrderAt8PM';
import logger from "../util/logger";

class ScheduleToFlatPositionAt7PM {
    
    public async run() {
        // We don't need to set leverage if we are flatting our position.
        schedule.scheduleJob('00 45 23 * * *', async () => {
            console.log("flat existing position at: " + new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')); 
            
            let existingPosition: any;
            let flatDirection: string;
            ScheduleToPlaceOrderAt8PM.isNotCurrentlyBuying = false;
            logger.info("ScheduleToPlaceOrderAt8PM.isNotCurrentlyBuying is set to : " 
                    + ScheduleToPlaceOrderAt8PM.isNotCurrentlyBuying);

            orderService.cancelAllOrders();

            existingPosition = await positionService.getPosition({
                "filter": {"symbol": "XBTUSD"},
                "count" : 1
            });
            let quantity = existingPosition[0].currentQty;
            let absExistingQty = quantity > 0 ? quantity : quantity * (-1);
    
            if(quantity > 0) {
                flatDirection = constants.DIRECTION_SELL;
            } else if( quantity < 0){
                flatDirection = constants.DIRECTION_BUY;
            } else {
                return;
            }

            if (absExistingQty <= 100) {
                let orderBook:any;
                orderBook = await orderService.getOrderBook(constants.BTC_SYMBOL, 20);
                let entryPrice = flatDirection == constants.DIRECTION_SELL ? orderBook.buyOne : orderBook.sellOne;

                let order:Order = {
                    symbol: constants.BTC_SYMBOL,
                    side: flatDirection,
                    orderQty: absExistingQty,
                    price: entryPrice,
                    execInst : "ReduceOnly",
                };
                orderService.createNewOrder(order);
            } else {
                let qtyForEachOrder = absExistingQty/constants.FLAT_POSITION_NUMBER;
                let leftOver = 0;
                logger.info("qtyForEachOrder: " + qtyForEachOrder);
                logger.info("flatDirection: " + flatDirection);
    
                let count = 0;
                for (var i = 0 ; i < constants.FLAT_POSITION_NUMBER; i ++) {
                    setTimeout(async() => {
                        count ++;
                        if (count == constants.FLAT_POSITION_NUMBER) {
                            leftOver = absExistingQty - Math.round(qtyForEachOrder)*constants.FLAT_POSITION_NUMBER;
                            logger.info("leftOver: " + leftOver);
                        }
    
                        let orderBook:any;
                        orderBook = await orderService.getOrderBook(constants.BTC_SYMBOL, 20);
                        let entryPrice = flatDirection == constants.DIRECTION_SELL ? orderBook.buyOne : orderBook.sellOne;
    
                        let order:Order = {
                            symbol: constants.BTC_SYMBOL,
                            side: flatDirection,
                            orderQty: Math.round(qtyForEachOrder) + leftOver,
                            price: entryPrice,
                            execInst : "ReduceOnly",
                        };
                        logger.info("Flat order: " + JSON.stringify(order));
                        orderService.createNewOrder(order);
                    }, constants.FLAT_POSITION_INTERVAL*i);
                }
            }            
        });
    }
}

export default new ScheduleToFlatPositionAt7PM();