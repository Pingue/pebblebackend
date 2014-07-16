module.exports = (function () {

  var express = require('express');
  var xml2js = require('xml2js');
  var request = require('request');
  var _ = require('underscore');

  var TrainStation = require('../models/train-station');
  var Hit = require('../models/hit');

  var router = express.Router();

  var Cache = {
    tube: {},
    train: {
      stations: []
    }
  };

  var config = {
    transportApi: {
      apiKey: '19490bb45f53178a0b508d37569b9910',
      appId: '633e7987'
    }
  };

  router.get('/', index);
  router.get('/tube/status.:fmt?', tubeStatus);
  router.get('/tube/details.:fmt?', tubeDetails);
  router.get('/:version?/train/stations.:fmt?', trainStations);
  router.get('/train/departures.:fmt?', trainDepartures);
  router.get('/bus/stops.:fmt?', busStops);
  router.get('/bus/departures.:fmt?', busDepartures);

  return router;

  function index(req, res) {
    res.redirect(301, 'http://matthewtole.com/pebble/uk-transport');
  }

  function tubeStatus(req, res, next) {

    var useCache = ! (req.query.cache === '0');
    var cachedData = tubeCache();
    if (useCache && cachedData !== null) {
      return sendData(cachedData, true);
    }

    return tubeUpdate(function (err) {
      sendData(tubeCache(), false);
    });

    function sendData(data, cached) {
      Hit.recordHit(req, 'tube.status', { cached: cached });

      res.json({
        response: {
          lines: data.lines.map(function (line) {
            return _.pick(line, 'name', 'status');
          }),
        },
        cached: cached,
        lastUpdated: data.lastUpdated
      });
    }

  }

  function tubeDetails(req, res) {

    var lineName = req.query.line;

    var useCache = ! (req.query.cache === '0');
    var cachedData = tubeCache();
    if (useCache && cachedData !== null) {
      return sendData(cachedData, true);
    }

    return tubeUpdate(function (err) {
      sendData(tubeCache(), false);
    });

    function sendData(data, cached) {
      Hit.recordHit(req, 'tube.details', { line: lineName, cached: cached });

      var line = _.findWhere(data.lines, { name: lineName });
      res.json({
        response: line.details.length ? line.details : 'Good Service',
        cached: cached
      });
    }

  }

  function tubeCache() {
    if (! Cache.tube) {
      return null;
    }
    if (! Cache.tube.lastUpdated) {
      return null;
    }
    if (new Date() - Cache.tube.lastUpdated > 60 * 1000) {
      return null;
    }
    return Cache.tube;
  }

  function tubeUpdate(callback) {
    request('http://cloud.tfl.gov.uk/TrackerNet/LineStatus', function (err, res, body) {
      xml2js.parseString(body, function (err, data) {
        Cache.tube.lines = data.ArrayOfLineStatus.LineStatus.map(function (line) {
          return {
            name: line.Line[0].$.Name,
            status: line.Status[0].$.Description.toLowerCase(),
            details: ''
          };
        });
        Cache.tube.lastUpdated = new Date();
        return callback(null);
      });
    });
  }

  function trainStations(req, res) {

    var version = parseInt(req.params.version || 1, 10);

    switch (version) {
      case 2:
        return trainStationsV2();
      case 1:
      default:
        return trainStationsV1();
    }

    function trainStationsV2() {
      var locationQuery = {
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [ req.query.lon, req.query.lat ]
            }
          }
        }
      };
      TrainStation.find(locationQuery).where('deleted').equals(false).limit(10).exec(function (err, stations) {
        if (err) {
          return res.send(err);
        }
        Hit.recordHit(req, 'train.stations', { version: 2, lat: req.query.lat, lon: req.query.lon });
        res.json(stations.map(function (station) {
          return {
            code: station.code,
            name: station.name.replace(/ Rail Station$/i, '')
          };
        }));
      });
    }

    function trainStationsV1() {

      var stationCache = _.findWhere(Cache.train.stations, { lon: req.query.lon, lat: req.query.lat });
      if (! stationCache || cacheAge(stationCache) > 60 * 60 * 24) {
        return fetchStations(function (err, stations) {
          Hit.recordHit(req, 'train.stations', { version: 1, lat: req.query.lat, lon: req.query.lon, cached: false });
          res.json(stations);
        });
      }
      Hit.recordHit(req, 'train.stations', { version: 1, lat: req.query.lat, lon: req.query.lon, cached: true });
      return res.json(stationCache.data);

      function fetchStations(callback) {
        var params = {
          lon: req.query.lon,
          lat: req.query.lat,
          page: 1,
          rpp: 10,
          api_key: config.transportApi.apiKey,
          app_id: config.transportApi.appId
        }
        request({ url: 'http://transportapi.com/v3/uk/train/stations/near.json', qs: params }, function (err, response, body) {
          if (err) {
            return callback(err);
          }
          var data = JSON.parse(body);
          if (! stationCache) {
            stationCache = {
              lat: req.query.lat,
              lon: req.query.lon
            };
            Cache.train.stations.push(stationCache);
          }
          stationCache.data = data;
          stationCache.lastUpdated = new Date();
          return callback(null, data);
        });
      }

      function cacheAge(cache) {
        return ((new Date() - cache.lastUpdated) / 1000);
      }

    }

  }

  function trainDepartures(req, res) {
    // TODO: Add some caching!
    var station = req.query.station;
    var params = {
      api_key: config.transportApi.apiKey,
      app_id: config.transportApi.appId
    }
    request({ url: 'http://transportapi.com/v3/uk/train/station/' + station + '/live.json', qs: params }, function (err, response, body) {
      Hit.recordHit(req, 'train.departures', { version: 1, station: station, cached: false });
      var departures = JSON.parse(body);
      departures.departures.all = departures.departures.all.slice(0, 10);
      res.json(departures);
    });
  }

  function busStops(req, res) {
    // TODO: Add some caching!
    // TODO: Replace with my own lookup method.
    var params = {
      lon: req.query.lon,
      lat: req.query.lat,
      page: 1,
      rpp: 10,
      api_key: config.transportApi.apiKey,
      app_id: config.transportApi.appId
    }
    request({ url: 'http://transportapi.com/v3/uk/bus/stops/near.json', qs: params }, function (err, response, body) {
      Hit.recordHit(req, 'bus.stops', { version: 1, lat: params.lat, lon: params.lon, cached: false });
      res.json(JSON.parse(body));
    });
  }

  function busDepartures(req, res) {
    // TODO: Add some caching!
    var stop = req.query.stop;
    var params = {
      api_key: config.transportApi.apiKey,
      app_id: config.transportApi.appId,
      group: 'no'
    }
    request({ url: 'http://transportapi.com/v3/uk/bus/stop/' + stop + '/live.json', qs: params }, function (err, response, body) {
      Hit.recordHit(req, 'bus.departures', { version: 1, stop: stop, cached: false });
      res.json(JSON.parse(body));
    });
  }

}());