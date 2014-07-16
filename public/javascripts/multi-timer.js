var app = angular.module("MultiTimer", [ 'firebase', 'angularSpinner' ]);

app.filter('ifEmpty', function () {
  return function (item, replacement) {
    return item.length === 0 ? replacement : item;
  };
});

app.filter('duration', function () {
  return function (item) {
    var hours = Math.floor(item / 3600);
    var minutes = Math.floor((item - (hours * 3600)) / 60);
    var seconds = item - (hours * 3600) - (minutes * 60);
    if (hours < 10) {
      hours = "0" + hours;
    }
    if (minutes < 10) {
      minutes = "0" + minutes;
    }
    if (seconds < 10) {
      seconds = "0" + seconds;
    }
    if (hours === '00') {
      return [ minutes, seconds ].join(':');
    }
    return [ hours, minutes, seconds ].join(':');
  };
});

function TimersController($scope, $firebase, $location) {

  $scope.timerEdit = null;
  $scope.pebbleToken = token;
  $scope.editLabel = '';
  var rootRef = new Firebase('https://smallstoneapps.firebaseio.com/multi-timer/' + $scope.pebbleToken);
  $scope.timers = $firebase(rootRef.child('timers'));
  $scope.everything = $firebase(rootRef);

  $scope.noTimers = function () {
    return $scope.timers.$getIndex().length === 0;
  }

  $scope.editTimer = function (timer) {
    $scope.editLabel = timer.label;
    $scope.timerEdit = timer;
  }

  $scope.saveTimers = function () {
    $scope.timers.$save();
    window.location.href = 'pebblejs://close#success';
  }

  $scope.saveEdit = function () {
    $scope.timerEdit.label = $scope.editLabel;
    $scope.timers.$save();
    $scope.timerEdit = null;
  }

  $scope.close = function () {
    window.location.href = 'pebblejs://close';
  }

}
