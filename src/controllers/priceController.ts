import * as express from "express";
import fairPriceRespository from '../repository/fairPriceRepository';
import logger from "../util/logger";

class FairPriceController {

    public async getFariPrice(req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> {
        try {
           let price =  await fairPriceRespository.find();
           res.send(price);
        } catch (error) {
            logger.error(error);
            return next(error);
        }
    }
}

export default new FairPriceController();