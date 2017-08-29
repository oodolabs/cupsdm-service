
module.exports = (server) => {
  const options = server.get('repo');
  const {provider} = options;
  const adapter = require('../adapters/' + provider);
  // const mountPath = options.mountPath || provider;
  server.use('/callback', adapter.hook(server, options));
};
