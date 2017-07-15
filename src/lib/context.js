// Exports
export default function mutateContext(context) {
  Object.assign(context, {
    /**
     * Send a response
     * @param {Object|string|Stream|void=} body
     * @param {Object} opts - Options object
     * @param {integer=} opts.status Response status code
     * @param {Object|string=} opts.headers Optional headers
     * @returns {*}
     */
    send: function send(body, opts) {
      this.body = body;
      if (opts) {
        if (opts.status) this.status = opts.status;
        if (opts.headers) this.set(opts.headers);
      }
      return this.body;
    },

    /**
     * This function is called when determining whether to send a response or trigger 404
     * @callback SendIfOverrideFn
     * @param {Object|string|void=} body Response body
     * @param {Object} opts - Options object
     * @param {integer=} opts.status Response status code
     * @param {Object|string=} opts.headers Optional headers
     * @param {Object} opts.ctx Koa context
     */

    /**
     * Send a response conditionally
     * @param {Object|string|Stream|void=} body
     * @param {Object=} opts - Options object
     * @param {integer=} opts.status Response status code
     * @param {Object|string=} opts.headers Optional headers
     * @param {bool|SendIfOverrideFn=} opts.override - Optional bool or function to override evaluation
     * @returns {*}
     */
    sendIf: function sendIf(body, opts) {
      if (opts) {
        const { status, headers, override } = opts;
        if (typeof override === 'function') {
          if (override(body, { status, headers, ctx: this })) return this.send(body, { status, headers });
        } else if ((typeof override !== 'function' && override !== undefined && override) || (override === undefined && body)) {
          return this.send(body, { status, headers });
        }
        return null;
      }
      return body ? this.send(body) : null;
    },

    /**
     * Send a response that will conform to API standards
     * @param {Object|string|void=} data Main data for the response
     * @param {Object=} metadata Additional data (metadata) to send - e.g. pagination information
     * @param {Object=} opts - Options object
     * @param {integer=} opts.status Response status code
     * @param {Object|string=} opts.headers Optional headers
     * @returns {*}
     */
    apiResponse: function apiResponse(data, metadata, opts) {
      if (metadata === null || metadata === undefined) return this.send({ data }, opts);
      return this.send({ metadata, data }, opts);
    },

    /**
     * This function is called when determining whether to send an api response or trigger 404
     * @callback apiResponseIfOverrideFn
     * @param {Object|string|void=} data Main data for the response
     * @param {Object=} metadata Additional data (metadata) to send - e.g. pagination information
     * @param {Object} opts - Options object
     * @param {integer=} opts.status Response status code
     * @param {Object|string=} opts.headers Optional headers
     * @param {Object} opts.ctx Koa context
     */

    /**
     * Send a response that will be conforming to your API standards - to override the transformation, provide a transformer function directly, or
     * pass it in as a configuration parameter (`apiResponseTransformer`) when instantiating Komapi
     * @param {Object|string|void=} data Main data for the response
     * @param {Object=} metadata Additional data (metadata) to send - e.g. pagination information
     * @param {Object=} opts - Options object
     * @param {integer=} opts.status Response status code
     * @param {Object|string=} opts.headers Optional headers
     * @param {bool|apiResponseIfOverrideFn=} opts.override - Optional bool or function to override evaluation
     * @returns {*}
     */
    apiResponseIf: function sendAPIIf(data, metadata, opts) {
      if (opts) {
        const { status, headers, override } = opts;
        if (typeof override === 'function') {
          if (override(data, metadata, { status, headers, ctx: this })) return this.apiResponse(data, metadata, { status, headers });
        } else if ((typeof override !== 'function' && override !== undefined && override) || (override === undefined && data)) {
          return this.apiResponse(data, metadata, { status, headers });
        }
        return null;
      }
      return data ? this.apiResponse(data, metadata) : null;
    },
  });
  return context;
}
