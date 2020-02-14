import * as mailer from 'nodemailer';
import config from '../config/config';
import logger from '../util/logger';

export interface MailOptions {
    from: string;
    to: string;
    subject: string;
    text: string;
}

class MailService {
    transporter: mailer.Transporter;

    constructor() {
        const mailConfig = {
            service: config.emailService,
            auth: {
              user: config.emailAuthUser,
              pass: config.emailAuthPsw
            }        
        }

        this.transporter = mailer.createTransport(mailConfig);
    }

    public async sendMail(mailOptions: MailOptions) {
        this.transporter.sendMail(mailOptions, function(error, info) {
            if (error) {
                logger.error(error);
            } else {
                logger.info('Email sent: ' + info.response);
            }
        });
    }

}

export default new MailService();