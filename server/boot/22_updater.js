const PromiseA = require('bluebird');
const Builder = require('cupsdm-builder');
const _ = require('lodash');
const tmp = require('tmp');

module.exports = server => {
  const logger = server.logger.child({category: 'updater'});
  const options = server.get('repo');
  const {provider} = options;
  const adapter = require('../adapters/' + provider);

  // Subscribe release event
  server.on('release', data => {
    logger.info('Handle release event:', data);
    return update(server, data, options, logger);
  });

  // Force update when startup
  adapter.latest(options)
    .then(data => data && update(server, data, options, logger))
    .then(() => logger.info('Updater started'));
};

function update(server, data, options, logger) {
  options = options || {};
  const {Release} = server.models;
  const pkg = options.fullname + '#' + data.version;
  const query = {where: {source: data.source, version: data.version}};

  return PromiseA.fromCallback(cb => Release.findOrCreate(query, data, cb)).then(inst => {
    if (!inst.builtAt) {
      return _update(server, {
        pkg,
        version: data.version,
        baseRawUrl: inst.baseRawUrl
      }).then(() => {
        return PromiseA.fromCallback(cb => inst.updateAttribute('builtAt', new Date(), cb));
      }).then(() => {
        logger.info(`Published release ${pkg}`);
      });
    } else {
      logger.info(`Ignore published release ${pkg}`);
    }
  });
}

function _update(server, options) {
  const {pkg, baseRawUrl} = options;
  const {Driver} = server.models;
  const temp = tmp.dirSync({unsafeCleanup: true});
  return Builder.build(pkg, {
    cwd: temp.name,
    scriptUriTemplate: `${baseRawUrl}/{{{maker}}}/{{{driver}}}/{{{script}}}`
  }).then(result => {
    const {drivers} = result;
    _.forEach(drivers, driver => driver.version = options.version);
    return Driver.destroyAll({version: options.version}).then(() => Driver.create(drivers));
  }).finally(result => {
    temp.removeCallback();
    return result;
  })
}
