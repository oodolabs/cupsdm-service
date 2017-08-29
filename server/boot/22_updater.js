const PromiseA = require('bluebird');
const Builder = require('cupsdm-builder');
const _ = require('lodash');
const tmp = require('tmp');
const log = require('pino')();

module.exports = server => {
  const options = server.get('repo');
  const {provider} = options;
  const adapter = require('../adapters/' + provider);

  // Subscribe release event
  server.on('release', data => update(server, data, options));

  // Force update when startup
  adapter.latest(options)
    .then(data => data && update(server, data, options))
    .then(() => log.info('Updater started'));
};

function update(server, data, options) {
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
        log.info(`Published release ${pkg}`);
      });
    } else {
      log.info(`Ignore published release ${pkg}`);
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
