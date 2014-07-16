module.exports = (function () {

  var express = require('express');
  var fs = require('fs');
  var request = require('request');
  var AdmZip = require('adm-zip');
  var csv = require('csv');
  var async = require('async');
  var UkGeoTool = require('UkGeoTool');
  var TrainStation = require('../models/train-station');

  var router = express.Router();

  router.get('/update', function (req, res) {
    var stations = null;
    var stats = {
      stations: {
        total: 0,
        updated: 0
      }
    };
    async.series([
      function (callback) {
        downloadNaptan(callback);
      },
      function (callback) {
        getTrainStations('tmp/naptan.zip', function (err, stns) {
          stations = stns;
          callback(err);
        });
      },
      function (callback) {
        getBusStops('tmp/naptan.zip', function (err, stps) {
          stops = stps;
          callback(err)
        });
      },
      function (callback) {
        TrainStation.markUnchecked(callback);
      },
      function (callback) {
        async.eachSeries(stations, function (station, callback) {
          TrainStation.addOrUpdate(station, function (err, isNew) {
            stats.stations.updated += isNew ? 0 : 1;
            stats.stations.total += 1;
            return callback(err);
          });
        },
        callback);
      },
      function (callback) {
        TrainStation.deleteUnchecked(callback);
      }
    ],
    function (err) {
      if (err) {
        return res.send(err)
      }
      res.json(stats);
    });
  });

  function downloadNaptan(callback) {
    // TMP: Skipping the download because it takes forever!
    return callback();
    var outStream = fs.createWriteStream('tmp/naptan.zip');
    request('http://www.dft.gov.uk/NaPTAN/snapshot/NaPTANcsv.zip').pipe(outStream)
    outStream.on('finish', function () {
      callback();
    });
  }

  function getTrainStations(filename, callback) {
    var zip = new AdmZip(filename);
    csv.parse(zip.readAsText('RailReferences.csv'), function(err, data) {
      if (err) {
        return callback(err);
      }
      var stations = data.slice(1).map(function (row) {
        return {
          code: row[2],
          name: row[3],
          lat: UkGeoTool.eastNorthToLatLong(row[6], row[7]).lat,
          lon: UkGeoTool.eastNorthToLatLong(row[6], row[7]).long
        }
      });
      return callback(null, stations);
    });
  }

  function getBusStops(filename, callback) {
    return callback();
    var zip = new AdmZip(filename);
    csv.parse(zip.readAsText('Stops.csv'), function(err, data) {
      if (err) {
        return callback(err);
      }
      var stops = data.slice(1).map(function (row) {
        return {}
      });
      return callback(null, stops);
    });
  }

  return {
    router: router
  };

}())