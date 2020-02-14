import positionService from '../service/positionService';
import orderService from '../service/orderService';
import { Order } from '../service/orderService';
import constants from '../config/constants';
import logger from "../util/logger";
import global from "../config/global";
import ScheduleToPlaceOrderAt8PM from './scheduleToPlaceOrderAt8PM';

class FlatPositionNow {

    orderNumber : number;

    constructor(number) {
        this.orderNumber = number;
    }

    public async run() {

        setTimeout(async() => {
            console.log("User request to flat position at: " + new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')); 
            
            global.IS_USER_INTERFERE = true;
            let existingPosition: any;
            let flatDirection: string;

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
                let qtyForEachOrder = absExistingQty/this.orderNumber;
                let leftOver = 0;
                logger.info("user_qtyForEachOrder: " + qtyForEachOrder);
                logger.info("user_flatDirection: " + flatDirection);
    
                let count = 0;
                for (var i = 0 ; i < this.orderNumber; i ++) {
                    setTimeout(async() => {
                        count ++;
                        if (count == this.orderNumber) {
                            leftOver = absExistingQty - Math.round(qtyForEachOrder)*this.orderNumber;
                            logger.info("user_leftOver: " + leftOver);
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
                        logger.info("user_Flat order: " + JSON.stringify(order));
                        orderService.createNewOrder(order);
                    }, constants.STOP_LOSS_INTERVAL*i);
                }
            }
        }, 1000);
    }
}

export default FlatPositionNow;