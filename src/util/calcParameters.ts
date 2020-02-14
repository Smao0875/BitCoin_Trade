import logger from '../util/logger';

class CalcParameters {

    public static calculateEfficiency(data:any[]){
        let sumClose = 0;
        let sumOpen = 0;
        let sumHigh = 0;
        let sumLow = 0;

        if(data.length >= 8){
            for(var i = data.length - 8; i < data.length; i ++){
                let item = data[i];
                let factor = data.length == 8 ? i + 1 : i;
                sumClose += (item.closePrice)*factor;
                sumOpen += (item.openPrice)*factor;
                sumHigh += (item.highPrice)*factor;
                sumLow += (item.lowPrice)*factor;
            }
        } else {
            logger.error("Error calculateEfficiency: " + JSON.stringify(data));
            return 0;
        }

        let efficiency = (sumClose - sumOpen) / (sumHigh - sumLow);
        return efficiency;
    }

    public static calculateNewEfficiency(data:any[]){
        if(data.length > 15) {
            data = data.slice(data.length - 15);  
        }
        
        logger.info(data[0]);
        logger.info(data[14]);

        if(data.length == 15){
            for(var i = 8; i <= data.length; i ++) {
                let temp = data.slice(i-8, i);
                data[i-1].efficiency = this.calculateEfficiency(temp);
            }
        } else {
            logger.error("Error calculateNewEfficiency: " + JSON.stringify(data));
            return 0;
        }

        return data.slice(7,data.length);
    }
}

export default CalcParameters;