
module.exports = (server) => {
  const options = server.get('repo');
  const {provider} = options;
  const adapter = require('../adapters/' + provider);
  const mountPath = options.hookPath || provider;
  server.use(mountPath, adapter.hook(server, options));
};
