import { createLogger, format, transports } from 'winston';
const DailyRotateFile = require('winston-daily-rotate-file');
const { combine, timestamp, label, printf } = format;

const myFormat = printf(info => {
    return `${info.timestamp} [${info.label}] ${info.level}: ${info.message}`;
  });

const logger = createLogger({
    level: 'info',
    format: combine(
        label({ label: 'bitcoin!' }),
        timestamp(),
        //format.colorize(),
        myFormat
    ),
    transports: [
        new transports.Console(),
    ]
  });
  
  logger.configure({
    level: 'verbose',
    transports: [
      new DailyRotateFile({
        filename: 'bitcoin-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',//This can be a number of bytes, or units of kb, mb, and gb.
      })
    ]
  });

  export default logger;