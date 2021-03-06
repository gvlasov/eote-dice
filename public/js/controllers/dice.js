/**
 * @param route Part of the URI after the host name and port, including "/"
 * @returns {WebSocket}
 */
var createWebSocket = function (route) {
    return new WebSocket(window.location.origin.replace('http', 'ws') + route)
};

/**
 * Pings the application host periodically so the Heroky dyno it is running on
 * doesn't die.
 */
var httpPing = function () {
    var request = new XMLHttpRequest();
    var address = window.location.protocol + "//" + window.location.host;
    request.open("GET", address);
    request.send(null);
};

setInterval(httpPing, 60000);

angular.module("diceApp", [])
    .service('nameService', function () {
        return {}
    })
    .service('historyService', function () {
        return {
            throwResults: []
        }
    })
    .controller("NameController", function ($scope, nameService) {
        var savedName = localStorage.getItem("playerName");
        if (!savedName) {
            $scope.playerName = "John Doe";
        } else {
            $scope.playerName = savedName;
        }
        $scope.$watch(
            function () {
                return $scope.playerName
            },
            function (newValue) {
                nameService.playerName = newValue;
                localStorage.setItem("playerName", newValue);
            }
        )
    })
    .controller("DiceSelectionController", function ($scope, nameService, historyService) {
        var diceSelection = this;
        diceSelection.types = [
            "force",
            "proficiency",
            "ability",
            "boost",
            "challenge",
            "difficulty",
            "setback"
        ];
        diceSelection.selected = {
            force: 0,
            proficiency: 0,
            ability: 0,
            boost: 0,
            challenge: 0,
            difficulty: 0,
            setback: 0
        };
        diceSelection.selectDice = function (dieType, index) {
            diceSelection.selected[dieType] = index + 1;
        };
        diceSelection.selectDiceOrReset = function (dieType, index) {
            if (diceSelection.selected[dieType] == index + 1) {
                diceSelection.resetRow(dieType);
            } else {
                diceSelection.selectDice(dieType, index);
            }
        };
        diceSelection.selectedDice = function (dieType) {
            return _.range(0, diceSelection.selected[dieType])
        };
        diceSelection.unselectedDice = function (dieType) {
            return _.range(diceSelection.selected[dieType], 5)
        };
        diceSelection.resetAll = function () {
            diceSelection.selected.force = 0;
            diceSelection.selected.proficiency = 0;
            diceSelection.selected.ability = 0;
            diceSelection.selected.boost = 0;
            diceSelection.selected.challenge = 0;
            diceSelection.selected.difficulty = 0;
            diceSelection.selected.setback = 0;
            console.log("before "+diceSelection.selected.d100)
            diceSelection.selected.d100 = false;
            console.log("after "+diceSelection.selected.d100)
        };
        diceSelection.nameIsUnavailable = function () {
            return nameService.playerName == "";
        };
        diceSelection.rollIsDisabled = function () {
            return diceSelection.nameIsUnavailable()
                || !diceSelection.anyDiceAreSelected()
        };
        diceSelection.anyDiceAreSelected = function () {
            return _.values(diceSelection.selected)
                    .reduce(
                        function (a, b) {
                            return a + b
                        },
                        0
                    ) > 0
        };
        diceSelection.openRoll = function () {
            diceSelection.roll(false, false);
        };
        diceSelection.secretRoll = function () {
            diceSelection.roll(true, false);
        };
        diceSelection.d100Roll = function() {
            diceSelection.roll(false, true);
        };
        diceSelection.roll = function (secret, d100) {
            var webSocket = createWebSocket("/roll");
            webSocket.onopen = function () {
                webSocket.send(
                    JSON.stringify(
                        {
                            playerName: nameService.playerName,
                            diceThrow: diceSelection.selected,
                            secret: secret,
                            d100: d100
                        }
                    )
                );
                webSocket.close()
            };
        };
        diceSelection.rowIsEmpty = function (dieType) {
            return diceSelection.selected[dieType] == 0;
        };
        diceSelection.resetRow = function (dieType) {
            diceSelection.selected[dieType] = 0;
        };
        diceSelection.hasAnyHistoryEntries = function () {
            return historyService.throwResults.length > 0
        };
        diceSelection.clearHistory = function () {
            var confirmationCode = "these aren't the rolls you're looking for";
            var actualCode = prompt(
                "Danger zone!\n" +
                "History is going to be cleared for everyone.\n" +
                "To confirm this, type the following:\n\n" +
                "" + confirmationCode + ""
            );
            if (actualCode == confirmationCode) {
                var webSocket = createWebSocket("/clearHistory");
                webSocket.onopen = function () {
                    webSocket
                        .send(JSON.stringify({clearHistory: 1}));
                    webSocket.close();
                    location.reload();
                }
            }
        }
    })
    .controller("HistoryController", function ($scope, historyService, nameService) {
        var history = this;

        var dataStream = createWebSocket("/newThrows");

        dataStream.onmessage = function (message) {
            var data = JSON.parse(message.data);
            if (data.hasOwnProperty("archive")) {
                data.archive.forEach(function (entry) {
                    historyService.throwResults.push(entry);
                })
            } else {
                historyService.throwResults.push(data);
            }
            $scope.$apply();
        };
        setInterval(function () {
            dataStream.send("{\"ping\": 1}")
        }, 15000);

        history.totalEffects = function (throwResult) {
            return _.flatten(
                _.keys(throwResult.effects)
                    .map(function (basename) {
                        return _.range(0, throwResult.effects[basename])
                            .map(function (i) {
                                return basename;
                            })
                    })
            );
        };
        history.visibleThrowResults = function () {
            return historyService.throwResults
                .slice(0)
                .reverse()
                .filter(history.isVisible);
        };
        history.isVisible = function (result) {
            return result.secret == false || result.playerName == nameService.playerName
        };
        history.lastThrow = function () {
            return historyService.throwResults
                .filter(history.isVisible)
                .pop()
        };
    });
