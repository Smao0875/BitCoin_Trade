import * as schedule from "node-schedule";
import positionService from '../service/positionService';
import orderService from '../service/orderService';
import userAccountService from '../service/userAccountService';
import mailService from '../service/mailService';
import { Order } from '../service/orderService';
import constants from '../config/constants';
import global from '../config/global';
import IntervalToEmitFairPrice from "./intervalToEmitFairPrice";
import IntervalToEmitOHLCFairPrice from "./intervalToEmitOHLCFairPrice";
import logger from "../util/logger";
import fairPriceRepository from "../repository/fairPriceRepository";

class ScheduleToPlaceOrderAt8PM {
    io: SocketIO.Server;

    static isNotCurrentlyBuying : boolean = true;
    entryFairPrice : number = 4268;
    
    stopLossPrice : number = 4111;
    initialAvailableBalance : number = 104.96;
    direction : string = constants.DIRECTION_BUY;
    volatility : number = 0.0673;

    priceChangeEmailSent : boolean = false;

    constructor(io) {
        this.io = io;
    }

    public async run() {

        this.checkIfStopLoss();

        schedule.scheduleJob('00 50 23 * * *', async ()=>{
            logger.info("scheduleToPlaceOrder started at " + new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')); 
            
            ScheduleToPlaceOrderAt8PM.isNotCurrentlyBuying = false;
            this.priceChangeEmailSent = false;
            global.SYSTEM_OVERLOAD = false;
            global.IS_USER_INTERFERE = false;

            let systemLeverage: number;
            let efficiency = IntervalToEmitOHLCFairPrice.efficiency;
            this.entryFairPrice = IntervalToEmitFairPrice.currFairPrice;
            let isBuying = efficiency > global.EFFICIENCY_THRESHOLD;
            this.direction = isBuying ? constants.DIRECTION_BUY : constants.DIRECTION_SELL;
            let margin : any;
            
            systemLeverage = isBuying ? global.SYSTEM_LEVERAGE_BUY : global.SYSTEM_LEVERAGE_SELL;
            margin = await userAccountService.getUserMargin();
            this.initialAvailableBalance = margin[0].availableMargin / constants.DIVISION_FACTOR;
            let balanceToTrade = this.initialAvailableBalance * global.EXPOSURE_FACTOR * systemLeverage;
            let qtyForEachOrder = balanceToTrade / constants.NORMAL_ORDER_NUMBER;
            let limitOrderNum = constants.NORMAL_ORDER_NUMBER * (1 - global.LIMIT_ORDER_SIZE_WEIGHT);

            logger.info( "initialAvailableBalance : " + this.initialAvailableBalance); 
            logger.info( "qtyForEachOrder : " + qtyForEachOrder); 
            logger.info( "efficiency : " + efficiency);
            
            let count = 0;
            for(var i = 0; i < constants.NORMAL_ORDER_NUMBER; i ++) {
                setTimeout(async() => {
                    if(!global.IS_USER_INTERFERE){
                        count++;
                        
                        if (count == constants.NORMAL_ORDER_NUMBER/2 + 1) {
                            let volatilitySql = await fairPriceRepository.getCurrVolatility();
                            this.volatility = volatilitySql[0][0].volatilitySTD;
                            
                            let currFairPrice = IntervalToEmitFairPrice.currFairPrice;
                            this.stopLossPrice = currFairPrice * (1 + (isBuying ? (-1) * (this.volatility*global.STOP_LOSS_PARAMETER/(global.SYSTEM_LEVERAGE_BUY + 1)) 
                            : this.volatility*global.STOP_LOSS_PARAMETER/(global.SYSTEM_LEVERAGE_SELL - 1)));
                            
                            logger.info( "volatility : " + this.volatility);
                            logger.info( "currFairPrice : " + currFairPrice); 
                            logger.info( "stopLossPrice : " + this.stopLossPrice); 
                        }
                        
                        let order : any;
                        if(count <= limitOrderNum){
                            let orderBook:any;
                            orderBook = await orderService.getOrderBook(constants.BTC_SYMBOL, 20);
                            let currentPrice = this.direction == constants.DIRECTION_SELL ? orderBook.buyOne : orderBook.sellOne;

                            order = {
                                symbol: constants.BTC_SYMBOL,
                                side: this.direction,
                                orderQty: Math.round(qtyForEachOrder * currentPrice),
                                price: Math.round(currentPrice)
                            };
                        } else {
                            let limitPrice = 0;

                            // we use volatility at 7:50pm if this limit order is placed before 8:00 pm
                            if(count <= constants.NORMAL_ORDER_NUMBER/2){
                                let volatilitySql = await fairPriceRepository.getCurrVolatility750();
                                let volatility750 = volatilitySql[0][0].volatilitySTD;
                                let stopLossPrice750 = this.entryFairPrice * (1 + (isBuying ? (-1) * (volatility750*global.STOP_LOSS_PARAMETER/(global.SYSTEM_LEVERAGE_BUY + 1)) 
                                : volatility750*global.STOP_LOSS_PARAMETER/(global.SYSTEM_LEVERAGE_SELL - 1)));

                                limitPrice = this.entryFairPrice*global.LIMIT_ORDER_DISTANCE 
                                                + stopLossPrice750*(1-global.LIMIT_ORDER_DISTANCE) 
                                                - global.BITMEX_SPREAD;
                            } else { // we use stopLossPrice if this limit order is placed after 8:00 pm
                                limitPrice = this.entryFairPrice*global.LIMIT_ORDER_DISTANCE 
                                                + this.stopLossPrice*(1-global.LIMIT_ORDER_DISTANCE) 
                                                - global.BITMEX_SPREAD;
                            } 

                            order = {
                                symbol: constants.BTC_SYMBOL,
                                side: this.direction,
                                orderQty: Math.round(qtyForEachOrder * limitPrice),
                                price: Math.round(limitPrice)
                            };
                        }

                        logger.info("Order # : " + count);
                        logger.info("Initial buying order: " + JSON.stringify(order));
                        orderService.createNewOrder(order).then(result => {
                            positionService.setPositionLeverage({symbol: constants.BTC_SYMBOL, leverage: systemLeverage}).then(result => {
                                if(count == constants.NORMAL_ORDER_NUMBER) {
                                    logger.info("Buying finished");
                                    ScheduleToPlaceOrderAt8PM.isNotCurrentlyBuying = true;      
                                }
                            });
                        });
                    }
                }, constants.ORDER_INTERVAL*i);
            }
        });
    }

    private checkIfStopLoss() {
        setInterval(async ()=> {

            if(ScheduleToPlaceOrderAt8PM.isNotCurrentlyBuying && !global.IS_USER_INTERFERE) { 
                let existingPosition : any;
                existingPosition = await positionService.getPosition({
                    "filter": {"symbol": "XBTUSD"},
                    "count" : 1
                });
        
                let quantity = existingPosition[0].currentQty;
                let absExistingQty = quantity > 0 ? quantity : quantity * (-1);
                let currFairPrice = IntervalToEmitFairPrice.currFairPrice;

                if(Math.abs((currFairPrice - this.entryFairPrice)/this.entryFairPrice) >= 0.015 && !this.priceChangeEmailSent ){
                    let mailOptions = {
                        from: 'daily2work@gmail.com',
                        to: 'windmsh@gmail.com, evoleoxu@gmail.com',
                        subject: 'Price is changing fast',
                        text: 'Entry fair price : ' + this.entryFairPrice + ', Current fair price: ' + currFairPrice,
                    };
                    
                    mailService.sendMail(mailOptions);
                    this.priceChangeEmailSent = true;
                }

                if(absExistingQty > 0) {

                    if((this.direction == constants.DIRECTION_BUY && currFairPrice < this.stopLossPrice) 
                        || (this.direction == constants.DIRECTION_SELL && currFairPrice > this.stopLossPrice)) {
                        ScheduleToPlaceOrderAt8PM.isNotCurrentlyBuying = false;
                        logger.info("Stop loss at: " + new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')); 

                        orderService.cancelAllOrders();
                        
                        let flatDirection = quantity > 0 ? constants.DIRECTION_SELL : constants.DIRECTION_BUY;
                        let qtyForEachOrder = absExistingQty/constants.STOP_LOSS_ORDER_NUMBER;
                        let leftOver = 0;
                        logger.info("currFairPrice: " + currFairPrice);
                        logger.info("stopLossPrice: " + this.stopLossPrice);
                        
                        // #region FLAT TO BTC 
                        let count = 0;
                        for (var i = 0 ; i < constants.STOP_LOSS_ORDER_NUMBER; i ++) {
                            setTimeout(async() => {
                                count ++;
                                if (count == constants.STOP_LOSS_ORDER_NUMBER) {
                                    leftOver = absExistingQty - Math.round(qtyForEachOrder)*constants.STOP_LOSS_ORDER_NUMBER;
                                    logger.info("leftOver: " + leftOver);
                                    logger.info("Stop loss done.");
                                    ScheduleToPlaceOrderAt8PM.isNotCurrentlyBuying = true;
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
                                logger.info("Stop loss order: " + JSON.stringify(order));
                                orderService.createNewOrder(order);
                            }, constants.STOP_LOSS_INTERVAL*i);
                        }
                        // #endregion
                    }
                }
            }
        }, constants.CHECK_STOP_LOSS_INTERVAL);        
    }
}

export default ScheduleToPlaceOrderAt8PM;