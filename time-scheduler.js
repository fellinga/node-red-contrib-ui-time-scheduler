/*
MIT License

Copyright (c) 2020 Mario Fellinger

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

module.exports = function(RED) {
	'use strict';

	function HTML(config) {
		if (config.height == 0) config.height = 1;
		if (config.name === "") config.name = "Time-Scheduler";
		
		// START needed for compatibility reasons < 0.3.0
		if (!config.refresh) config.refresh = 60;
		if (!config.devices) config.devices = [config.name];
		// END needed for compatibility reasons < 0.3.0

		const uniqueId = config.id.replace(".", "");
		const divPrimary = "ui-ts-" + uniqueId;
		var configAsJson = JSON.stringify(config);
	
		var styles = String.raw`
		<style>
			#` + divPrimary + ` {
				padding-left: 6px;
				padding-right: 7px;
			}
			#` + divPrimary + ` tr {
				height: 36px;
				text-align: center;
			}
			#` + divPrimary + ` tr:focus {
				outline: 0;
			}
			#` + divPrimary + ` md-input-container {
				width: 100%;
			 }
			.weekDay-` + uniqueId + ` {
				width: 100%;
				line-height: 40px;
				border-radius: 50%;
				color: var(--nr-dashboard-widgetTextColor);
				background-color: var(--nr-dashboard-pageTitlebarBackgroundColor);
				opacity: 0.4;
			}
			.weekDayActive-` + uniqueId + ` {
				opacity: 1;
			}
			.timerhead-` + uniqueId + ` {
				background-color: var(--nr-dashboard-pageTitlebarBackgroundColor);
			}
		</style>`
		;

		var timerBody = String.raw`
		<div id="` + divPrimary + `" ng-init='init(` + configAsJson + `)' style="height: ` + (40 + (config.height*125)) + `px;">
			<div layout="row" layout-align="space-between center" style="max-height: 50px;">
				<span flex="" ng-show="devices.length <= 1"> ` + config.devices[0] + ` </span>
				<span flex="70" ng-show="devices.length > 1">
					<md-input-container>
						<md-select ng-model="myDeviceSelect" ng-change="showStandardView()" aria-label="Select device" ng-disabled="isEditMode">
							<md-option ng-repeat="device in devices" value={{$index}}> {{devices[$index]}} </md-option>
						</md-select>
					</md-input-container>
				</span>
				<span flex="15">
					<md-button id="addTimerBtn-` + uniqueId + `" style="width: 100%;" aria-label="Add" ng-click="toggleViews()"> </md-button>
				</span>
			</div>
			<div id="messageBoard-` + uniqueId + `" style="display:none;"> <p> </p> </div>
			<div id="timersView-` + uniqueId + `" style="margin-top: 4px;">
				<table style="width: 100%; border-spacing: 0px;">
				<tbody>
					<tr ng-repeat-start="timer in timers | filter:{ output: myDeviceSelect} track by $index" ng-click="showAddView(timers.indexOf(timer))" class="timerhead-` + uniqueId + `">
						<th> # </th>
						<th colspan="2">` + RED._("time-scheduler.ui.start") + `</th>
						<th colspan="2">` + RED._("time-scheduler.ui.end") + `</th>
						<th colspan="2">` + RED._("time-scheduler.ui.runtime") + `</th>
					</tr>
					<tr ng-click="showAddView(timers.indexOf(timer))">
						<td> {{$index+1}} </td>
						<td colspan="2"> {{millisToTime(timer.starttime)}} </td>
						<td colspan="2"> {{millisToTime(timer.endtime)}} </td>
						<td colspan="2"> {{minutesToReadable(diff(timer.starttime,timer.endtime))}} </td>
					</tr> 
					<tr ng-click="showAddView(timers.indexOf(timer))">
						<td ng-repeat="day in days" ng-init="dayIndex=$index" style="width:14%;margin: 0 2%;"> 
							<div class="weekDay-` + uniqueId + ` {{(timer.days[localDayToUtc(timer,dayIndex)]) ? 'weekDayActive-` + uniqueId + `' : ''}}">
								{{days[dayIndex]}}	
							</div>
						</td> 
					</tr>
					<tr ng-repeat-end style="height: 6px;"> </tr>
				</tbody>
				</table>
			</div>
			<div id="addTimerView-` + uniqueId + `" style="display:none;">
				<form ng-submit="addTimer()">
					<div layout="row" style="max-height: 60px;">
						<md-input-container flex="50">
							<label style="color: var(--nr-dashboard-widgetTextColor)">` + RED._("time-scheduler.ui.starttime") + `</label>
							<input id="timerStarttime-` + uniqueId + `" ng-model="timerStarttime" type="time" required>
							<span class="validity"></span>
						</md-input-container>
						<md-input-container flex="50">
							<label style="color: var(--nr-dashboard-widgetTextColor)">` + RED._("time-scheduler.ui.endtime") + `</label>
							<input id="timerEndtime-` + uniqueId + `" ng-model="timerEndtime" type="time" required>
							<span class="validity"></span>
						</md-input-container>
					</div>
					<div layout="row" style="max-height: 50px;">
						<md-input-container>
							<label style="color: var(--nr-dashboard-widgetTextColor)">` + RED._("time-scheduler.ui.daysActive") + `</label>
							<md-select multiple="true" placeholder="` + RED._("time-scheduler.ui.daysActive") + `" ng-model="myMultipleSelect">
								<md-option ng-repeat="day in days" value={{$index}}> {{days[$index]}}  </md-option>
							</md-select>
						</md-input-container>
					</div>
					<div layout="row" layout-align="space-between end" style="height: 40px;">
						<md-button ng-click="deleteTimer()" ng-show="hiddenTimerIndex !== undefined">` + RED._("time-scheduler.ui.delete") + `</md-button>
						<span ng-show="hiddenTimerIndex === undefined"> </span>
						<md-button type="submit">` + RED._("time-scheduler.ui.save") + `</md-button>
					</div>
				</form>
			</div>
		</div>
		`;

		var html = String.raw`
		${styles}		
		${timerBody}`
		return html;
	}

	function checkConfig(config, node) {
		if (!config) {
		  node.error(RED._("ui_time_scheduler.error.no-config"));
		  return false;
		}
		if (!config.hasOwnProperty("group")) {
		  node.error(RED._("ui_time_scheduler.error.no-group"));
		  return false;
		}
		return true;
	}

    function TimeSchedulerNode(config) {
		try {
			var ui = undefined;
			if(ui === undefined) {
				ui = RED.require("node-red-dashboard")(RED);
			}

			RED.nodes.createNode(this,config);
			let node = this;
			let nodeTimers = [];

			this.nodeCallback = function nodeCallback(req, res) {
				res.send(nodeTimers);
			}

			config.i18n = {	payloadWarning: RED._("time-scheduler.ui.payloadWarning"), 
							nothingPlanned: RED._("time-scheduler.ui.nothingPlanned"), 
							alertTimespan: RED._("time-scheduler.ui.alertTimespan")};
			
			if (checkConfig(config, node)) {
				var done = ui.addWidget({
					node: node,
					format: HTML(config),
					templateScope: "local",
					group: config.group,
					order: config.order,
					emitOnlyNewValues: false,
					forwardInputMessages: false,
					storeFrontEndInputAsState: true,
					persistantFrontEndValue : true,
					beforeEmit: function (msg, value) {
						let valid = true;

						try {
							msg.payload = JSON.parse(value).timers;
							msg.payload.forEach(element => {
								if (element.starttime === undefined || element.endtime === undefined || element.days === undefined) {
									valid = false;
								}
								if (!element.output) element.output = 0;
							});
						} catch(e) {
							valid = false;
						}
						
						if (valid) {
							node.status({fill:"green",shape:"dot",text:"time-scheduler.payloadReceived"});
							nodeTimers = msg.payload;
						} else {
							node.status({fill:"yellow",shape:"dot",text:"time-scheduler.invalidPayload"});
							nodeTimers = [];
							msg.payload = [];
						}

						return {msg: [msg]};
					},
					beforeSend: function (msg, orig) {
						if (orig && orig.msg[0]) {
							nodeTimers = orig.msg[0].payload;
							const sendMsg = JSON.parse(JSON.stringify(orig.msg));
							sendMsg[0].payload = JSON.stringify({timers : sendMsg[0].payload});
							addOutputValues(sendMsg);
							return sendMsg;
						}
					},
					initController: function ($scope) {
						$scope.init = function (config) {
							$scope.i18n = config.i18n;
							$scope.timeschedulerid = config.id;
							$scope.days = ['SU','MO','TU','WE','TH','FR','SA'];
							$scope.devices = config.devices;
							$scope.myDeviceSelect = "0";
						}

						$scope.$watch('msg', function() {
							$scope.getTimersFromServer();
						});

						$scope.$watch('timers', function() {
							$scope.showStandardView();
						});

						$scope.toggleViews = function() {
							$scope.isEditMode ? $scope.showStandardView() : $scope.showAddView();
						}

						$scope.showStandardView = function() {
							$scope.isEditMode = false;
							$scope.getElement("addTimerBtn").innerHTML = "&#10010";
							$scope.getElement("addTimerBtn").disabled = false;
							$scope.getElement("timersView").style.display = "block";
							$scope.getElement("messageBoard").style.display = "none";
							$scope.getElement("addTimerView").style.display = "none";

							if (!$scope.timers) {
								$scope.getElement("timersView").style.display = "none";
								$scope.getElement("addTimerBtn").disabled = true;
								
								let msgBoard = $scope.getElement("messageBoard");
								msgBoard.style.display = "block";
								msgBoard.firstElementChild.innerHTML = $scope.i18n.payloadWarning;								
							} else if ($scope.timers.filter(timer => timer.output == $scope.myDeviceSelect).length === 0) {
								$scope.getElement("timersView").style.display = "none";
								
								let msgBoard = $scope.getElement("messageBoard");
								msgBoard.style.display = "block";
								msgBoard.firstElementChild.innerHTML = $scope.i18n.nothingPlanned;
							}
						}

						$scope.showAddView = function(timerIndex) {
							$scope.isEditMode = true;
							$scope.getElement("addTimerBtn").innerHTML = "X";
							$scope.getElement("timersView").style.display = "none";
							$scope.getElement("messageBoard").style.display = "none";
							$scope.getElement("addTimerView").style.display = "block";
							$scope.hiddenTimerIndex = timerIndex;
							$scope.myMultipleSelect = [];
							
							if (timerIndex === undefined) {
								const today = new Date();
								if (today.getHours() == "23" && today.getMinutes() >= "54") today.setMinutes(53);
								$scope.timerStarttime = new Date(today.getFullYear(), today.getMonth(), today.getDay(), today.getHours(), today.getMinutes()+1, 0);
								$scope.timerEndtime = new Date(today.getFullYear(), today.getMonth(), today.getDay(), today.getHours(), today.getMinutes()+6, 0);
								$scope.myMultipleSelect.push(today.getDay());
							} else {
								const timer = $scope.timers[timerIndex];						
								$scope.timerStarttime = new Date(timer.starttime);
								$scope.timerEndtime = new Date(timer.endtime);
								for (let i = 0; i < timer.days.length; i++) {
									if (timer.days[$scope.localDayToUtc(timer,i)]) $scope.myMultipleSelect.push(i);
								}
							}
						}

						$scope.addTimer = function() {
							const start = new Date();
							start.setHours($scope.timerStarttime.getHours());
							start.setMinutes($scope.timerStarttime.getMinutes());
							start.setSeconds(0); start.setMilliseconds(0); 
							const starttime = start.getTime();

							const end = new Date();
							end.setHours($scope.timerEndtime.getHours());
							end.setMinutes($scope.timerEndtime.getMinutes());
							end.setSeconds(0); end.setMilliseconds(0); 
							const endtime = end.getTime();

							if ($scope.diff(starttime, endtime) < 1) {
								alert($scope.i18n.alertTimespan);
								return;
							}

							const timer = {
								starttime: starttime,
								endtime: endtime,
								days : [0,0,0,0,0,0,0],
								output : $scope.myDeviceSelect
							};
			
							$scope.myMultipleSelect.forEach(day => {
								const utcDay = $scope.localDayToUtc(timer, Number(day));
								timer.days[utcDay] = 1;
							});

							const timerIndex = $scope.hiddenTimerIndex;
							if (timerIndex === undefined) {
								$scope.timers.push(timer);
							} else {
								$scope.timers.splice(timerIndex,1,timer);
							}

							$scope.timers.sort(function(a, b) {
								return a.starttime - b.starttime;
							});
							$scope.sendTimersToOutput();		
						}

						$scope.deleteTimer = function() {
							$scope.timers.splice($scope.hiddenTimerIndex,1);
							$scope.sendTimersToOutput();
						}

						$scope.sendTimersToOutput = function() {
							if (!$scope.msg) $scope.msg = [{payload: ""}];
							$scope.msg[0].payload = angular.copy($scope.timers);
							$scope.send([$scope.msg[0]]);
						}

						$scope.minutesToReadable = function(minutes) {
							return (Math.floor(minutes/60) > 0 ? Math.floor(minutes/60) + "h " : "") + minutes%60 + "m";
						}

						$scope.millisToTime = function(millis) {
							return $scope.padZero(new Date(millis).getHours()) + ":" + $scope.padZero(new Date(millis).getMinutes()); 
						}

						$scope.localDayToUtc = function(timer, localDay) {
							const start = new Date(timer.starttime);
							let shift = start.getUTCDay() - start.getDay();
							if (shift < -1) shift = 1;
							if (shift > 1) shift = -1;
							let utcDay = shift + localDay;
							if (utcDay < 0) utcDay = 6;
							if (utcDay > 6) utcDay = 0;
							return utcDay;
						}

						$scope.padZero = function(i) {
							return i < 10 ? "0"+i : i;
						}

						$scope.diff = function(startDate, endDate) {						
							let diff = endDate - startDate;
							const hours = Math.floor(diff / 1000 / 60 / 60);
							diff -= hours * 1000 * 60 * 60;
							const minutes = Math.floor(diff / 1000 / 60);
							
							return (hours*60)+minutes;
						}

						$scope.getElement = function(elementId) {
							return document.querySelector("#" + elementId + "-" + $scope.timeschedulerid.replace(".", ""));
						}

						$scope.getTimersFromServer = function() {
							$.ajax({
								url: "time-scheduler/getNode/" + $scope.timeschedulerid,
								dataType: 'json',
								async: false,
								success: function(json) {
									$scope.timers = json;
								}
							});
						}
					}
				});

				var nodeInterval = setInterval(function() {
					let outputValues = [null];
					addOutputValues(outputValues);
					node.send(outputValues);
				}, config.refresh * 1000);

				function addOutputValues(myArray) {
					for (let i = 0; i<config.devices.length; i++) {
						myArray.push({payload: isInTime(i)});
					}
				}

				function isInTime(device) {
					let status = false;

					if (nodeTimers.length > 0) {
						const date = new Date();
						
						nodeTimers.filter(timer => timer.output == device).forEach(function (timer) {		
							if (status) return;

							const localStarttime = new Date(timer.starttime);
							const localEndtime = new Date(timer.endtime);

							// CHECK UTC DAY
							const utcDay = localDayToUtc(timer, date.getDay());
							if (timer.days[utcDay] === 0) return;

							const compareDate = new Date(localStarttime);
							compareDate.setHours(date.getHours());
							compareDate.setMinutes(date.getMinutes());

							if (compareDate.getTime() >= localStarttime.getTime() && compareDate.getTime() < localEndtime.getTime()) {
								status = true;
							}
						});
					}

					return status;
				}

				function localDayToUtc(timer, localDay) {
					const start = new Date(timer.starttime);
					let shift = start.getUTCDay() - start.getDay();
					if (shift < -1) shift = 1;
					if (shift > 1) shift = -1;
					let utcDay = shift + localDay;
					if (utcDay < 0) utcDay = 6;
					if (utcDay > 6) utcDay = 0;
					return utcDay;
				}

				node.on("close", function() {
					if (nodeInterval) {
						clearInterval(nodeInterval);
					}
					if (done) {
						done();
					}
				});
			}
		} catch(error) {
			console.log("TimeSchedulerNode:", error);
		}
    }
	RED.nodes.registerType("ui_time_scheduler",TimeSchedulerNode);

	const uiPath = ((RED.settings.ui || {}).path) || 'ui';
	const nodePath = '/' + uiPath + '/time-scheduler/getNode/:nodeId';
	RED.httpNode.get(nodePath, function(req, res) {
		var nodeId = req.params.nodeId;
		var node = RED.nodes.getNode(nodeId);
		if (node) {
			node.nodeCallback(req, res);
		} else {
			res.send(404).end();
		}
	});
}