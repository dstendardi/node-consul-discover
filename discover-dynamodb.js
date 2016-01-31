"use strict";

const aws = require('aws-promised');
const discover = require('./discover');
const _ = require('lodash');

module.exports = (input) => discover(_.defaults(input, {

  /**
   * When should we retry ?
   */
  retryWhen: (err) => (err.code === 'NetworkingError' && err.retryable),

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
  proxy: (dynamo) => {
    var proxy = {};
    ['listTables'].forEach(function (method) {
      proxy[method] = function() {
        return dynamo[method + 'Promised'].apply(dynamo, arguments)
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

    return aws.dynamoDb({
      endpoint: params.endpoint,
      region: 'any',
      httpOptions: {
        timeout: 500
      },
      credentials: {
        accessKeyId: 'x',
        secretAccessKey: 'x'
      }
    })
  }
}));
