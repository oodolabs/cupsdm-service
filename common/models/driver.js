'use strict';

const lu = require('loopback-utils');
const _ = require('lodash');

module.exports = function(Driver) {

  lu.readOnly(Driver);

  Driver.latest = function (filter) {
    const {Release} = Driver.app.models;
    return Release.latest().then(release => {
      if (release) {
        const where = {version: release.version};
        filter = filter || {};
        filter.where = filter.where ? {and: [filter.where, where]} : where;
      }
    }).then(() => Driver.find(filter));
  };

  Driver.remoteMethod('latest', {
    description: 'Find all latest drivers matched by filter from the data source.',
    accessType: 'READ',
    accepts: [
      {arg: 'filter', type: 'object', description:
      'Filter defining fields, where, include, order, offset, and limit - must be a ' +
      'JSON-encoded string ({"something":"value"})'},
      {arg: 'options', type: 'object', http: 'optionsFromRequest'},
    ],
    returns: {arg: 'data', type: [Driver], root: true},
    http: {verb: 'get', path: '/latest'},
  })

};
