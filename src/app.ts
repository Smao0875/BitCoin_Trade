import * as http from 'http';
import express from 'express';
import * as cors from 'cors';
import * as bodyParser from 'body-parser';
import config from './config/config';
import * as socketIO from "socket.io";

// Utils
import logger from './util/logger';
import global from './config/global';
import fs from 'fs';

// Services
import fairPriceRespository from './repository/fairPriceRepository';

// Controllers
import fairPriceController from './controllers/priceController';
import userAccountController from './controllers/userAccountController';
import positionController from './controllers/positionController';
import orderController from './controllers/orderController';

// Schedules
import scheduleToFlatPositionAt7PM from './schedules/scheduleToFlatPositionAt7PM';
import ScheduleToPlaceOrderAt8PM from './schedules/scheduleToPlaceOrderAt8PM';
import ScheduleToUpdateHistoricalData from './schedules/scheduleToUpdateHistoricalData';
import IntervalToEmitFairPrice from './schedules/intervalToEmitFairPrice';
import IntervalToEmitOHLCFairPrice from './schedules/intervalToEmitOHLCFairPrice';
import IntervalToCheckServiceStatus from './schedules/intervalToCheckServiceStatus';
import FlatPositionNow from './schedules/flatPositionNow';
import IntervalToEmitTradeHistory from './schedules/intervalToEmitTradeHistory';
import CalcParameters from './util/calcParameters';

const app: express.Application = express();
const port: number = config.serverPort;

class App {

    public static run() {
        let router = express.Router();

        app.use(bodyParser.urlencoded({extended:true}));
        app.use(bodyParser.json());
        app.use(cors.default());//'Access-control-Allow-Origin'

        // Routing
        router.get('/price', fairPriceController.getFariPrice);
        router.post('/order', orderController.createNewOrder);
        router.post('/position', positionController.getPosition);
        router.post('/position/leverage', positionController.setPositionLeverage);
        router.get('/user/margin', userAccountController.getUserMargin);
        app.use('/',router);

        //Error Handler
        app.use(function (err: any, req: express.Request, res: express.Response, next: express.NextFunction) {
            logger.error(err.stack)
            res.status(err.status || 500);
            let message = {
                "status": err.status,
                "message": err.message
            }
            logger.error(JSON.stringify(message));
            res.send(message);
        })

        let serve = http.createServer(app);

        let io: SocketIO.Server = socketIO.listen(serve);

        serve.listen(port,(error: Error) =>{
            console.log('Listening in http://localhost:3000');
        });

        io.on('connection', (socket)=>{
            logger.info('a user connected');

            socket.on('message', (message) => {
                logger.info("Message Received: " + message);
                let messageData = JSON.parse(message);

                if(messageData.password === config.parameterPassword) {
                    if(messageData.flatOrderNumbers) {
                        let flat = new FlatPositionNow(messageData.flatOrderNumbers);
                        flat.run();
                    } else {
                        if(messageData.efficiencyThreshold){
                            global.EFFICIENCY_THRESHOLD = messageData.efficiencyThreshold;
                            logger.info("Change EFFICIENCY_THRESHOLD to : " + global.EFFICIENCY_THRESHOLD);
                        }
                        if(messageData.exposureFactor){
                            global.EXPOSURE_FACTOR = messageData.exposureFactor;
                            logger.info("Change EXPOSURE_FACTOR to : " + global.EXPOSURE_FACTOR);
                        }
                        if(messageData.stopLossParameter){
                            global.STOP_LOSS_PARAMETER = messageData.stopLossParameter;
                            logger.info("Change STOP_LOSS_PARAMETER to : " + global.STOP_LOSS_PARAMETER);
                        }
                        if(messageData.systemLeverageBuy){
                            global.SYSTEM_LEVERAGE_BUY = messageData.systemLeverageBuy;
                            logger.info("Change SYSTEM_LEVERAGE_BUY to : " + global.SYSTEM_LEVERAGE_BUY);
                        }
                        if(messageData.systemLeverageSell){
                            global.SYSTEM_LEVERAGE_SELL = messageData.systemLeverageSell;
                            logger.info("Change SYSTEM_LEVERAGE_SELL to : " + global.SYSTEM_LEVERAGE_SELL);
                        }
                        if(messageData.limitOrderDistance){
                            global.LIMIT_ORDER_DISTANCE = messageData.limitOrderDistance;
                            logger.info("Change LIMIT_ORDER_DISTANCE to : " + global.LIMIT_ORDER_DISTANCE);
                        }
                        if(messageData.limitOrderSizeWeight){
                            global.LIMIT_ORDER_SIZE_WEIGHT = messageData.limitOrderSizeWeight;
                            logger.info("Change LIMIT_ORDER_SIZE_WEIGHT to : " + global.LIMIT_ORDER_SIZE_WEIGHT);
                        }
                        if(messageData.bitmexSpread){
                            global.BITMEX_SPREAD = messageData.bitmexSpread;
                            logger.info("Change BITMEX_SPREAD to : " + global.BITMEX_SPREAD);
                        }
                        if(messageData.stopLossPrice && scheduleToPlaceOrderAt8PM){
                            if(messageData.stopLossPrice > 0) {
                                scheduleToPlaceOrderAt8PM.stopLossPrice = messageData.stopLossPrice;
                            }
                        }

                        fs.writeFile(config.programState, message, 'utf-8', function(err){
                            if (err) {
                                logger.error('Some error occured - file either not saved or corrupted file saved.');
                            } else{
                                logger.info('Program state is saved!');
                            }
                        });                    
                    }
                } else {
                    io.emit('password', {type:'WRONG_PASSWORD', data: 401});
                }
            });

            setTimeout(async function(){
                let databaseData =  await fairPriceRespository.findOHLCFairPriceForLast15Days();
                let data = databaseData[0];
                let fairPrice8Days = CalcParameters.calculateNewEfficiency(data);

                io.emit("fair_price",
                        {type:'OHLC_8DAYS', 
                            data: { fairPrice8Days : fairPrice8Days}
                        });
            },1000);

            setTimeout(() => {
                if(global){
                    io.emit("global_variables",
                        {type:'GLOBAL_VARIABLES', 
                            data: { global : global}
                        });
                }
            }, 1000);

            setTimeout(()=>{
                if(scheduleToPlaceOrderAt8PM){
                    io.emit("stop_loss",{type:'STOP_LOSS', data: {
                        initialAvailableBalance : scheduleToPlaceOrderAt8PM.initialAvailableBalance,
                        stopLossPrice : scheduleToPlaceOrderAt8PM.stopLossPrice,
                        volatility : scheduleToPlaceOrderAt8PM.volatility}
                    });
                }
            }, 2000);
        });

        fs.readFile(config.programState, 'utf8', function (err, data) {
            if (err) {
                logger.error(err);
                return;
            }
            var programState = JSON.parse(data);
            console.log(programState);
            if(programState.efficiencyThreshold){
                global.EFFICIENCY_THRESHOLD = programState.efficiencyThreshold;
            }
            if(programState.exposureFactor){
                global.EXPOSURE_FACTOR = programState.exposureFactor;
            }
            if(programState.stopLossParameter){
                global.STOP_LOSS_PARAMETER = programState.stopLossParameter;
            }
            if(programState.systemLeverageBuy){
                global.SYSTEM_LEVERAGE_BUY = programState.systemLeverageBuy;
            }
            if(programState.systemLeverageSell){
                global.SYSTEM_LEVERAGE_SELL = programState.systemLeverageSell;
            }
            if(programState.limitOrderDistance){
                global.LIMIT_ORDER_DISTANCE = programState.limitOrderDistance;
            }
            if(programState.limitOrderSizeWeight){
                global.LIMIT_ORDER_SIZE_WEIGHT = programState.limitOrderSizeWeight;
            }
            if(programState.bitmexSpread){
                global.BITMEX_SPREAD = programState.bitmexSpread;
            }
        });

        let intervalToEmitFairPrice = new IntervalToEmitFairPrice(io);
        intervalToEmitFairPrice.run();

        let intervalToEmitTradeHistory = new IntervalToEmitTradeHistory(io);
        intervalToEmitTradeHistory.run();

        let intervalToEmitOHLCFairPrice = new IntervalToEmitOHLCFairPrice(io);
        intervalToEmitOHLCFairPrice.run();

        // Check if our data server is broken.
        let intervalToCheckServiceStatus = new IntervalToCheckServiceStatus(io);
        intervalToCheckServiceStatus.run();

        var scheduleToPlaceOrderAt8PM = new ScheduleToPlaceOrderAt8PM(io);
        scheduleToPlaceOrderAt8PM.run();

        scheduleToFlatPositionAt7PM.run();

        // Call once per day at 00:00:01 to update our historical data
        let scheduleToUpdateHistoricalData = new ScheduleToUpdateHistoricalData(io);
        scheduleToUpdateHistoricalData.run();
    }
}

App.run();