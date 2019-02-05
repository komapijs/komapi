// Dependencies
import Pino from 'pino';
import cls from 'cls-hooked';
import Komapi from './Komapi';

// Helpers
function wrapLogger(baseLogger: Pino.Logger, transactionContext?: cls.Namespace): Pino.Logger {
  const levels = baseLogger.levels.values;
  const levelProxies = (Object.keys(levels) as Pino.Level[]).reduce(
    (acc, level: Pino.Level) => {
      acc[level] = new Proxy(baseLogger[level], {
        apply(target, thisArg, argumentsList) {
          const loggerContext = argumentsList[0];
          const { _ns_name, id, ...currentTransactionContext } = thisArg.transactionContext.active || {
            _ns_name: null,
            id: null,
          };
          const logContext = { context: currentTransactionContext };
          let args;
          if (typeof loggerContext !== 'object') args = argumentsList;
          else {
            Object.assign(logContext, loggerContext);
            args = argumentsList.slice(1);
          }
          return target.apply(thisArg, [logContext, args]);
        },
      });
      return acc;
    },
    {} as { [key in Pino.Level]: Pino.LogFn },
  );
  Object.assign(baseLogger, {
    transactionContext,
    proxies: {
      ...levelProxies,
      child: new Proxy(baseLogger.child, {
        apply(target, thisArg, argumentsList) {
          const child = target.apply(thisArg, argumentsList);
          return wrapLogger(child, thisArg.transactionContext);
        },
      }),
    },
  });
  return new Proxy(baseLogger, {
    get(obj, prop) {
      return (obj.proxies as any)[prop] ? Reflect.get(obj.proxies, prop) : Reflect.get(obj, prop);
    },
  });
}

// Exports
export default function createLogger(
  transactionContext: cls.Namespace,
  options: Komapi.Options['logOptions'],
  stream: Komapi.Options['logStream'],
): ReturnType<typeof Pino> {
  const baseLogger = Pino(options, stream);
  return wrapLogger(baseLogger, transactionContext);
}
