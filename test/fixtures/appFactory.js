'use strict';

// Dependencies
import Komapi from '../../src/index';
import defaultConfig from '../../src/lib/config';
import DummyLogger from './dummyLogger';

// Exports
export default function appFactory(config, disableLogging = true) {
    if (config !== false) {
        config = config || {};
        config = Object.assign({}, defaultConfig(config.env), config);
        if (disableLogging) {
            config.loggers.forEach((logger) => {
                logger.stream = new DummyLogger(() => {});
            });
        }
    }
    else config = undefined;
    let app = new Komapi(config);
    return app;
}