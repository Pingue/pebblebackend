var mongoose = require('mongoose');

var HitSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  type: {
    type: String,
    required: true
  },
  location: {
    type: [ Number ],
    index: '2dsphere'
  },
  data: { },
  pebbleToken: {
    type: String
  },
  ipAddress: {
    type: String,
  },
  userAgent: {
    type: String
  }
});

HitSchema.statics.recordHit = function (req, type, data, callback) {
  var hit = new this({
    type: type,
    data: data,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });
  if (data.lat && data.lon) {
    hit.location = [ data.lon, data.lat ]
  }
  if (req.get('X-Pebble-ID')) {
    hit.pebbleToken = req.get('X-Pebble-ID');
  }
  hit.save(callback);
}

module.exports = mongoose.model('Hit', HitSchema, 'hits');