import { configure, getLogger } from 'log4js';

export const LOGTYPE = {
  FATAL: 1,
  ERROR: 2,
  WARN: 3,
  INFO: 4,
  DEBUG: 5,
};

configure('logConfig.json');

export const logging = (
  type: number,
  message: string,
  displayName?: string,
  functionName?: string,
  loginName?: string
): void => {
  let section = '[共通]';
  if (displayName) {
    if (functionName) {
      if (loginName) {
        section = `[${displayName}-${functionName}][${loginName}]`;
      } else {
        section = `[${displayName}-${functionName}]`;
      }
    } else {
      section = `[${displayName}]`;
    }
  }
  const logger = getLogger(section);
  switch (type) {
    case LOGTYPE.FATAL:
      logger.fatal(message);
      break;

    case LOGTYPE.ERROR:
      logger.error(message);
      break;

    case LOGTYPE.WARN:
      logger.warn(message);
      break;

    case LOGTYPE.INFO:
      logger.info(message);
      break;

    case LOGTYPE.DEBUG:
      logger.debug(message);
      break;

    default:
  }
};
