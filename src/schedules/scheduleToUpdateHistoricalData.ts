import * as schedule from "node-schedule";
import fairPriceRespository from '../repository/fairPriceRepository';
import * as SocketIO from "socket.io";
import CalcParameters from "../util/calcParameters";

class ScheduleToUpdateHistoricalData {
    io: SocketIO.Server;

    constructor(io) {
        this.io = io;
    }

    public async run() {
        // Call once per day at 00:00:01 to update our historical data
        schedule.scheduleJob('01 00 00 * * *', async ()=>{
            console.log("findOHLCFairPriceForLast8Days started at " 
                        + new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')); 
            let databaseData =  await fairPriceRespository.findOHLCFairPriceForLast15Days();
            let data = databaseData[0];
            let fairPrice8Days = CalcParameters.calculateNewEfficiency(data);

            this.io.emit("fair_price",{type:'OHLC_8DAYS', data: { fairPrice8Days : fairPrice8Days}});
        });
    }
}

export default ScheduleToUpdateHistoricalData;