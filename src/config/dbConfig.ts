import * as mysql from 'mysql';
import config from './config';
import logger from '../util/logger';

class DBClient {
    pool: mysql.Pool;
    pool_luo: mysql.Pool;
    pool_mao: mysql.Pool;

    constructor() {
        this.pool_luo = mysql.createPool({
            connectionLimit: 5,
            timeout: 60 * 60 * 1000,
            host:  config.databaseHost_luo,
            user: config.databaseUser,
            password: config.databasePassword,
            database: config.databaseName
        });

        this.pool_mao = mysql.createPool({
            connectionLimit: 5,
            timeout: 60 * 60 * 1000,
            host: config.databaseHost_mao ,
            user: config.databaseUser,
            password: config.databasePassword,
            database: config.databaseName
        });

        this.pool = this.pool_luo;
        this.pool_luo.getConnection((err, connection) => {
            if (err) {
                if (err.code === 'PROTOCOL_CONNECTION_LOST') {
                    console.log('Database connection was closed.')
                }
                if (err.code === 'ER_CON_COUNT_ERROR') {
                    console.log('Database has too many connections.')
                }
                if (err.code === 'ECONNREFUSED') {
                    console.log('Database connection was refused.')
                }
            }
            if (connection) {
                logger.info("Databse Connected!!")
                connection.release();
            }
            return
        });         
    }

    public switchDbPool() {
        if(this.pool == this.pool_luo) {
            this.pool = this.pool_mao;
            logger.info("connect to database_mao");
        } else {
            this.pool = this.pool_luo;
            logger.info("connect to database_luo");
        }
    }
}

export default new DBClient();