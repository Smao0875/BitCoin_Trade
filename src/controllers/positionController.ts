import * as express from "express";
import positionService from '../service/positionService';
import logger from "../util/logger";

class PositionController {

    // Get Position
    public async getPosition(req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> {
        let position_payload = {
            filter: req.body.filter,
            columns: req.body.columns,
            count: req.body.count
        };
        try {
            let positions = await positionService.getPosition(position_payload);
           res.send(positions);
        } catch (error) {;
            let err: {status?: number, message?:string} = new Error(error.message);
            err.status = error.status;
            return next(err);
        }
    }
    
    // Set Position Leverage
    public async setPositionLeverage(req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> {
        let positionLeveragePayload = {
            symbol: req.body.symbol,
            leverage: req.body.leverage
        };
        try {
            await positionService.setPositionLeverage(positionLeveragePayload);
           res.send("success order");
        } catch (error) {;
            let err: {status?: number, message?:string} = new Error(error.message);
            err.status = error.status;
            return next(err);
        }
    }    
}

export default new PositionController();