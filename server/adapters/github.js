const axios = require('axios');
const createHandler = require('github-webhook-handler');
const PromiseA = require('bluebird');

exports.hook = function (server, options) {
  options = options || {};
  options.path = options.hookPath;
  const handler = createHandler(options);

  handler.on('error', function (err) {
    console.error('Error:', err.message)
  });

  /**
   *  [release] event.payload: https://developer.github.com/v3/activity/events/types/#releaseevent
   */
  handler.on('release', function (event) {
    server.emit('release', normalize(event.payload.release, options));
  });

  return (req, res) => {
    handler(req, res, err => {
      res.statusCode = 404;
      res.end('no such location');
    });
  }
};

exports.latest = function (options) {
  return PromiseA.resolve(axios.get(`https://api.github.com/repos/${options.fullname}/releases/latest`))
    .then(res => {
      if (res.data && res.data.tag_name) {
        return normalize(res.data, options);
      }
    })
    .catch(error => {
      if (error.response) {
        if (error.response.status === 404) {
          return;
        }
      }
      throw error;
    });
};

function normalize(release, options) {
  return {
    source: 'github',
    name: release.name,
    version: release.tag_name,
    baseRawUrl: `https://raw.githubusercontent.com/${options.fullname}/${release.tag_name}`,
    prerelease: release.prerelease,
    createdAt: release.created_at,
    publishedAt: release.published_at,
  }
}
