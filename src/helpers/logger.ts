import { createLogger, transports, format } from 'winston';
import fs from 'fs';
import path from 'path';
import DailyRotateFile from 'winston-daily-rotate-file';
import WinstonCloudWatch from 'winston-cloudwatch';

let dir = process.env.LOG_DIR;
if (!dir) dir = path.resolve('logs');

// create directory if it is not present
if (!fs.existsSync(dir)) {
	// Create the directory if it does not exist
	fs.mkdirSync(dir);
}

const logLevel = process.env.NODE_ENV === 'development' ? 'debug' : 'warn';

const options = {
	file: {
		level: logLevel,
		filename: dir + '/%DATE%.log',
		datePattern: 'YYYY-MM-DD',
		zippedArchive: true,
		timestamp: true,
		handleExceptions: true,
		humanReadableUnhandledException: true,
		prettyPrint: true,
		json: true,
		maxSize: '20m',
		colorize: true,
		maxFiles: '14d'
	}
};

const consoleTransports = new transports.Console({
	level: logLevel,
	format: format.combine(
		format.errors({ stack: true }),
		format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
		format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`),
	)
})

const winstonLogger = createLogger({
	transports: consoleTransports,
	exceptionHandlers: [new DailyRotateFile(options.file)],
	exitOnError: false
});


if (process.env.NODE_ENV === 'production') {
	if (!process.env.AWS_LOG_GROUP_NAME) throw new Error('AWS_LOG_GROUP_NAME must be defined');
	if (!process.env.AWS_LOG_STREAM_NAME) throw new Error('AWS_LOG_STREAM_NAME must be defined');
	if (!process.env.AWS_ACCESS_KEY_ID) throw new Error('AWS_ACCESS_KEY_ID must be defined');
	if (!process.env.AWS_SECRET_ACCESS_KEY) throw new Error('AWS_SECRET_ACCESS_KEY must be defined');
	if (!process.env.AWS_REGION) throw new Error('AWS_REGION must be defined');

	winstonLogger.add(
		new WinstonCloudWatch({
			awsOptions: {
				credentials: {
					accessKeyId: process.env.AWS_ACCESS_KEY_ID,
					secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
				},
				region: process.env.AWS_REGION
			},
			logGroupName: process.env.AWS_LOG_GROUP_NAME,
			logStreamName: process.env.AWS_LOG_STREAM_NAME,
			jsonMessage: true
		})
	)
}

export const logger = winstonLogger;