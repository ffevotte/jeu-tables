var game = angular.module('game', []);

game.controller('GameController', function GameController($scope, $interval) {
    $scope.animals = [
        "dolphin.svg",
        "octopus.svg",
        "shark.svg",
        "tuna.svg",
        "turtle.svg",
        "hippocampus.svg",
    ];

    $scope.settings = {
        opIndex: 0,

        xmin: 1,
        xmax: 10,
        ymin: 1,
        ymax: 10,
        modal: false,

        levels: [[80, 'Blanche'],
                 [70, 'Jaune'],
                 [60, 'Orange'],
                 [50, 'Verte'],
                 [40, 'Bleue'],
                 [30, 'Marron'],
                 [20, 'Noire']],

        img1: $scope.animals[0],
        img2: $scope.animals[1],

        selectAnimal: function(evt, animal) {
            switch(evt.which) {
            case 1:
                $scope.settings.img1 = animal;
                break;
            case 3:
                $scope.settings.img2 = animal;
                break;
            }
        },

        showStats: true,
        advanced: true,
    };

    $scope.settings.delay = $scope.settings.levels[0][0];
    $scope.settings.opNames = [];
    $scope.settings.opFuns  = [];

    $scope.settings.addOp = function(name, fun) {
        $scope.settings.opNames.push(name);
        $scope.settings.opFuns.push(fun);
    };

    $scope.settings.addOp('+', function(x, y) {return x + y;});
    $scope.settings.addOp('×', function(x, y) {return x * y;});

    $scope.settings.opName = function() {
        return $scope.settings.opNames[$scope.settings.opIndex];
    };

    $scope.settings.op = function(x, y) {
        return $scope.settings.opFuns[$scope.settings.opIndex](x, y);
    };

    $scope.resetStorage = function() {
        var stats = {};
        $scope.settings.opNames.forEach(function (op) {
            stats[op] = Array(10);
            for (var i=0 ; i<10 ; i++) {
                stats[op][i] = Array(10);
                for (var j = 0 ; j<10 ; ++j) {
                    stats[op][i][j] = 1.;
                }
            }
        });
        localStorage.stats = JSON.stringify(stats);
        $scope.stats = JSON.parse(localStorage.stats);
    }

    if (localStorage.stats == undefined) {
        $scope.resetStorage();
    }
    $scope.stats = JSON.parse(localStorage.stats);

    //$scope.settings.showStats = true;
    $scope.statsColor = function(i,j) {
        if ($scope.stats[$scope.settings.opName()][i][j] < 1) {
            return "bg-success";
        }
        if ($scope.stats[$scope.settings.opName()][i][j] == 1) {
            return "";
        }
        if ($scope.stats[$scope.settings.opName()][i][j] < 2) {
            return "bg-warning";
        }
        return "bg-danger";
    }

    $scope.game = {
        animation: null,
        status: "not started",

        start: function() {
            $scope.game.status = "running";
            $scope.player.score = 0;
            $scope.player.update();

            var x = 0;
            var i = 0;
            var dt = 100;
            var nIter = $scope.settings.delay * 1000 / dt;
            var dx = ($("#player-div").width()-$("#player").width()) / nIter;
            var p = null;
            var move = function() {
                //$("#answer").focus();

                x += dx;
                i += 1;
                $("#animal").css({
                    left: x+"px",
                    transition: "all linear "+dt+"ms",
                });

                if (i >= nIter) {
                    $scope.game.stop("defeat");
                }
            }

            $("#animal").css({transition: "unset"});
            $("#animal").css({left: "0px"});
            move();
            $scope.game.animation = $interval(move, dt);

            $scope.question.ask();
            $interval(function(){
                console.log("focus");
                $("#answer").focus();
            }, 100, 1);
        },

        stop: function(status) {
            $scope.game.status = status;
            $scope.question.validate(true);

            $interval.cancel($scope.game.animation);
            $interval(function(){
                console.log("focus");
                $("#start").focus();
            }, 100, 1);
        },
    };

    $scope.question = {
        x: -1,
        y: -1,
        result: -1,
        answer: "",

        random: function() {
            var forEachPair = function(f) {
                for (var i=$scope.settings.xmin-1 ; i<$scope.settings.xmax ; ++i) {
                    for (var j=$scope.settings.ymin-1 ; j<$scope.settings.ymax ; ++j) {
                        var res = f(i,j);
                        if (res !== null) {
                            return res;
                        }
                    }
                }
            };

            var total = 0.;
            forEachPair (function(i,j){
                total += $scope.stats[$scope.settings.opName()][i][j];
                return null;
            });
            console.log("total = ", total);

            var threshold = Math.random() * total;
            total = 0.;
            return forEachPair (function(i,j){
                total += $scope.stats[$scope.settings.opName()][i][j];
                if (total >= threshold) {
                    return [i+1, j+1];
                }
                return null;
            });
        },

        ask: function() {
            var x = $scope.question.x;
            var y = $scope.question.y;

            while (x == $scope.question.x &&
                   y == $scope.question.y) {
                [x,y] = $scope.question.random();

                if (false && x<y) {
                    tmp = x
                    x = y;
                    y = tmp;
                }
            }

            $scope.question.x = x;
            $scope.question.y = y;
            $scope.question.result = $scope.settings.op(x, y);
            $scope.question.answer = "";

            $scope.question.start = new Date().getTime();

            return false;
        },

        validate: function(gameEnd = false) {
            if ($scope.question.answer == $scope.question.result || gameEnd) {
                var elapsed = new Date().getTime() - $scope.question.start;
                var multiplier = elapsed / ($scope.settings.delay*100);
                if (gameEnd && multiplier < 1) {
                    multiplier = 1;
                }
                $scope.stats[$scope.settings.opName()][$scope.question.x-1][$scope.question.y-1] *= multiplier;
                localStorage.stats = JSON.stringify($scope.stats);

                if (gameEnd) {
                    return false;
                }

                $scope.question.ask();
                $scope.player.score += 10;
                $scope.player.update();

                if ($scope.player.score >= 100) {
                    $scope.game.stop("victory");
                }
            }

            return false;
        },
    };

    $scope.player = {
        score: 0,

        update: function() {
            var pos = ($("#player-div").width()-$("#player").width())
                * $scope.player.score / 100;
            $("#player").css("left", pos+"px");
        },
    };

});
