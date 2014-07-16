module.exports = (function () {

  var express = require('express');
  var router = express.Router();
  var config = require('config');

  var Hit = require('../models/hit');

  router.get('/map', function (req, res) {
    res.render('stats/map', {
      title: 'API Stats',
      key: config.googleMaps,
    });
  });

  router.get('/locations.:fmt?', function (req, res) {
    Hit.aggregate([
      {
        $group: {
          _id: { location: '$location' },
          number : { $sum : 1 }
        }
      }
    ]).exec(function (err, data) {
      if (err) {
        return res.send(err);
      }
      var locations = [];
      data.forEach(function (item) {
        if (! item._id.location) {
          return;
        }
        locations.push({
          lat: item._id.location[1],
          lon: item._id.location[0],
          weight: item.number
        });
      });
      res.json(locations);
    });
  });

  return {
    router: router
  };

}());