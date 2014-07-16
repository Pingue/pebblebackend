module.exports = (function () {

  var express = require('express');
  var router = express.Router();

  router.get('/config/', function (req, res) {
    res.render('multi-timer/config-help', {
      title: 'Multi Timer'
    });
  });

  router.get('/config/:token', function (req, res) {
    res.render('multi-timer/config', {
      title: 'Multi Timer Config',
      token: req.params.token
    });
  });

  return {
    router: router
  };

}());