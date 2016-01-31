"use strict";

const request = require('request-promise');
const discover = require('node-consul-discover/discover');
const _ = require('lodash');

module.exports = (input) => discover(_.defaults(input, {

  /**
   * When should we retry ?
   */
  retryWhen: (err) => {
    console.log(err);
    return [
        'ECONNRESET',
        'ENOTFOUND',
        'ESOCKETTIMEDOUT',
        'ETIMEDOUT',
        'ECONNREFUSED',
        'EHOSTUNREACH',
        'EPIPE',
        'EAI_AGAIN'
      ].indexOf(err.code) > -1
  },

  /**
   * Transform consul values to something
   * usable by the service
   *
   * @param {Array[Service]} nodes
   * @return {Object} parameters
   */
  transform: (nodes) => {
    let address = nodes[0].ServiceAddress;
    let port = nodes[0].ServicePort;
    let endpoint = `http://${address}:${port}`

    return {
      endpoint: endpoint
    };
  },

  /**
   * Proxy methods (metrics, logs etc..)
   *
   * @param {Object} instance returned by create
   * @return {Object} proxy
   */
  proxy: (request) => {
    var proxy = {};
    ['post', 'get', 'put', 'del'].forEach(function (method) {
      proxy[method] = function() {
        return request[method].apply(request, arguments)
      };
    });
    return proxy;
  },

  /**
   * Create instance from consul discovery
   *
   * @param {Object} params
   * @param {String} params.endpoint
   * @return {Object} aws dynamoDB instance
   */
  create: (params) => {

    return request.defaults({
      baseUrl: params.endpoint,
    })
  }
}));
