'use strict';

// Dependencies
import Komapi from '../../src/index';
import defaultConfig from '../../src/lib/config';
import DummyLogger from './dummyLogger';

// Exports
export default function appFactory(config, disableLogging = true) {
    if (config === false) {
        const org = process.stdout.write;
        process.stdout.write = (function(write) {
            return (string, encoding, fd) => {};
        }(process.stdout.write));
        let app = new Komapi();
        process.stdout.write = org;
        return app;
    }

    config = config || {};
    config = Object.assign({}, defaultConfig(config.env), config);
    if (disableLogging) {
        config.loggers.forEach((logger) => {
            logger.stream = new DummyLogger(() => {});
        });
    }
    return new Komapi(config);

}