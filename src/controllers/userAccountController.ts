import * as express from "express";
import userAccountService from '../service/userAccountService'

class UserAccountController {


    // Get User Margin
    public async getUserMargin(req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> {

        try {
           let positions = await userAccountService.getUserMargin();
           res.send(positions);
        } catch (error) {;
            let err: {status?: number, message?:string} = new Error(error.message);
            err.status = error.status;
            return next(err);
        }
    }    
}

export default new UserAccountController();