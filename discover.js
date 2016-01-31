'use strict';

const aws = require('aws-promised');
const bluebird = require('bluebird');
const retry = require('bluebird-retry');
const _ = require('lodash');

module.exports = function (params) {

  const deps = _.defaults(params, {
    proxy: x => x,
    retry: {
      max_tries: 10
    }
  })

  /**
   * Instance of service being used
   * If some error occurs, this instance
   * will be destroyed for recreation
   */
  let _inst;

  /**
   * Retrieve the endpoint from the first node
   * registered in consul.
   *
   * @param {String} Service name in consul
   * @return Promise[String] a promise containing the endpoint
   */
  const _discover = function () {
    console.log(`[consul] starting discovery of service ${deps.service}`);

    return deps.consul.catalog.service.nodes(deps.service)
      .then(result => {
        if (! result.length) {
          throw new Error(`unable to find node ${deps.service} instance`);
        }
        console.log(`[consul] discovered ${result.length} nodes for service ${deps.service}`);
        return deps.transform(result);
      });
  };

  /**
   * Create, proxify and memoize
   * our service instance
   *
   * @return {Promise[Object]} A promise which resolve to the
   *                           discovered service instance
   */
  const _get = function () {
    if (_inst) return bluebird.resolve(_inst);

    return _discover()
      .then(deps.create)
      .then(deps.proxy)
      .then(instance => {
        _inst = instance
        return _inst;
      })
  };

  /**
   * When error is retryiable, set instance to
   * null so the next attempt to get the service
   * will rediscover consul
   *
   * @param {Error} catched error
   * @throws {Error} catched error
   */
  const _catchRetryable = function (err) {
    if (deps.retryWhen(err)) {
      _inst = null;
    }
    throw new Error(`[discovery] Got error using service ${deps.service}`, err)
  };


  /**
   * Execute the given callback with instance discovered
   * and returned by create method
   *
   * @param {Function} callback
   * @return {Promise[A]} promise
   */
  return function(fn) {

    return retry(
      () => _get(deps.service).then(instance => fn(instance).catch(_catchRetryable)),
      deps.retry
    )
  }
};
