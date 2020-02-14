import logger from '../util/logger';
import dbClient from '../config/dbConfig';
const CURR_FAIR_TRADE_SQL = 'CALL `coin_exchange`.`getCurrPriceAndFairPice`()';
const EIGHT_DAYS_FAIR_OHLC_SQL = 'CALL `coin_exchange`.`getOHLCandEfficiency`()';
const FIFTEEN_DAYS_FAIR_OHLC_SQL = 'CALL `coin_exchange`.`getOHLCPriceFor15Days`()';
const TODAY_FAIR_OHLC_SQL = 'CALL `coin_exchange`.`getOHLCPriceForToday`()';
const CURR_VOLATILITY = 'CALL `coin_exchange`.`getOHLCandVolatility`()';
const CURR_VOLATILITY_750 = 'CALL `coin_exchange`.`getOHLCandVolatility_750`()';

export interface Price {
    id?: number;
}

class FairPriceRepository {

    public async find(): Promise<any>{
        return new Promise<any>((resolve, reject)=> {
            dbClient.pool.query(CURR_FAIR_TRADE_SQL, function(error, results, fields) {
                if(error) {
                    logger.error("Find FairPrice Error: ");
                    logger.error(error);
                    return reject(error);
                }
                resolve(results);
            });        
        }).catch(function(error){
            logger.error("Find FairPrice Error:" + error);
        });
    }

    public async findOHLCFairPriceForLast8Days(): Promise<any>{
        return new Promise<any>((resolve, reject)=> {
            dbClient.pool.query(EIGHT_DAYS_FAIR_OHLC_SQL, function(error, results, fields) {
                if(error) {
                    logger.error("findOHLCFairPriceForLast8Days Error: ");
                    logger.error(error);
                    return reject(error);
                }
                resolve(results);
            });
        }).catch(function(error){
            logger.error("findOHLCFairPriceForLast8Days Error: ");
            logger.error(error);
        });
    }

    public async findOHLCFairPriceForLast15Days(): Promise<any>{
        return new Promise<any>((resolve, reject)=> {
            dbClient.pool.query(FIFTEEN_DAYS_FAIR_OHLC_SQL, function(error, results, fields) {
                if(error) {
                    logger.error("findOHLCFairPriceForLast15Days Error: ");
                    logger.error(error);
                    return reject(error);
                }
                resolve(results);
            });
        }).catch(function(error){
            logger.error("findOHLCFairPriceForLast15Days Error: ");
            logger.error(error);
        });
    }

    public async findOHLCFairPriceForToday(): Promise<any>{
        return new Promise<any>((resolve, reject)=> {
            dbClient.pool.query(TODAY_FAIR_OHLC_SQL, function(error, results, fields) {
                if(error) {
                    logger.error("findOHLCFairPriceForToday Error: ");
                    logger.error(error);
                    return reject(error);
                }
                resolve(results);
            });
        }).catch(function(error){
            logger.error("findOHLCFairPriceForToday Error: ");
            logger.error(error);
        });
    }

    public async getCurrVolatility(): Promise<any>{
        return new Promise<any>((resolve, reject)=> {
            dbClient.pool.query(CURR_VOLATILITY, function(error, results, fields) {
                if(error) {
                    logger.error("getCurrVolatility Error: " + error);
                    return reject(error);
                }
                resolve(results);
            });
        }).catch(function(error){
            logger.error("getCurrVolatility Error: ");
            logger.error(error);
        });
    }

    public async getCurrVolatility750(): Promise<any>{
        return new Promise<any>((resolve, reject)=> {
            dbClient.pool.query(CURR_VOLATILITY_750, function(error, results, fields) {
                if(error) {
                    logger.error("getCurrVolatility Error: " + error);
                    return reject(error);
                }
                resolve(results);
            });
        }).catch(function(error){
            logger.error("getCurrVolatility Error: ");
            logger.error(error);
        });
    }
}

export default new FairPriceRepository();