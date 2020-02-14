import * as express from "express";
import orderService from '../service/orderService';
import logger from "../util/logger";

class OrderController {

    // Create New Order
    public async createNewOrder(req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> {
        let order = {
            symbol: req.body.symbol,
            side: req.body.side,
            orderQty: req.body.orderQty,
            price: req.body.price  
        };
        try {
            await orderService.createNewOrder(order);
           res.send("success order");
        } catch (error) {;
            let err: {status?: number, message?:string} = new Error(error.message);
            err.status = error.status;
            return next(err);
        }
    }   
}

export default new OrderController();