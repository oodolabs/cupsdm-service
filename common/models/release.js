'use strict';

const lu = require('loopback-utils');

module.exports = function(Release) {

  lu.hideAll(Release);

  Release.latest = function () {
    return Release.findOne({order: 'published_at DESC', limit: 1});
  };

  Release.remoteMethod('latest', {
    description: 'Find the latest release.',
    accessType: 'READ',
    returns: {arg: 'data', type: Release, root: true},
    http: {verb: 'get', path: '/latest'},
  });
};
