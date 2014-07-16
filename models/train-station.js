var mongoose = require('mongoose');

var TrainStationSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  location: {
    type: [ Number ],
    index: '2dsphere'
  },
  checked: {
    type: Boolean,
    default: true
  },
  deleted: {
    type: Boolean,
    default: true
  }
});

TrainStationSchema.statics.markUnchecked = function (callback) {
  this.update({}, { checked: false }, { multi: true }, callback);
};

TrainStationSchema.statics.deleteUnchecked = function (callback) {
  this.update({ checked: false }, { deleted: true }, { multi: true }, callback);
}

TrainStationSchema.statics.addOrUpdate = function (data, callback) {
  var TrainStation = this;
  var isNew = false;
  TrainStation.findOne({ code: data.code }, function (err, station) {
    if (err) {
      return callback(err);
    }
    if (station) {
      station.name = data.name;
      station.location = [ data.lon, data.lat ];
      station.deleted = false;
      station.checked = true;
    }
    else {
      station = new TrainStation({
        code: data.code,
        name: data.name,
        location: [ data.lon, data.lat ]
      });
      isNew = true;
    }
    return station.save(function (err) {
      return callback(err, isNew);
    });
  });
}

module.exports = mongoose.model('TrainStation', TrainStationSchema, 'train_stations');