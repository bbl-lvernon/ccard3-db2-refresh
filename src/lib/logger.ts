import dayjs from 'dayjs';
import winston, { Logger } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

// Define custom format for logs
const customFormat = winston.format.combine(
  winston.format.splat(),
  winston.format.simple(),
  winston.format.timestamp(),
  winston.format.align(),
  winston.format.printf(info => `${dayjs().format('YYYY-MM-DD HH:mm:ss:SSS')} - ${info.level} - ${info.message}`)
);

export class ApplicationLogger {

    constructor(){}
    
    instantiateLogger(fileName: string) {
        // Instantiate loggers, rotate daily
        const logger = winston.loggers.add('appLogger', {
            exitOnError: false,
            format: winston.format.combine(
                customFormat
            ),
            transports: [
                new DailyRotateFile({
                    filename: './logs/' + fileName,
                    datePattern: 'YYYY-MM-DD',
                    zippedArchive: true,
                    level: 'info'
                }),
                new winston.transports.Console({
                    level: 'info'
                }),
                new winston.transports.File({ filename: 'error.log', level: 'error' }),
                new winston.transports.File({ filename: 'combined.log' })
                ]
        });
        return logger;
    }

}