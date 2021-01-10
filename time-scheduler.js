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
		const uniqueId = config.id.replace(".", "");
		const divPrimary = "ui-ts-" + uniqueId;
	
		const styles = String.raw`
		<style>
			#` + divPrimary + ` {
				padding-left: 6px;
				padding-right: 7px;
			}
			#` + divPrimary + ` tr {
				height: 36px;
				text-align: center;
				cursor: pointer;
			}
			#` + divPrimary + ` tr:focus {
				outline: 0;
			}
			#` + divPrimary + ` md-input-container {
				width: 100%;
			}
			#` + divPrimary + ` md-select md-select-value {
				color: var(--nr-dashboard-widgetTextColor);
				border-color: var(--nr-dashboard-pageTitlebarBackgroundColor);
			}
			#` + divPrimary + ` md-select[disabled] md-select-value {
				color: var(--nr-dashboard-widgetTextColor);
				opacity: 0.7;
			}
			.weekDay-` + uniqueId + ` {
				width: 100%;
				max-width: 40px;
				display:inline-block;
				line-height: 40px;
				border-radius: 50%;
				color: var(--nr-dashboard-widgetTextColor);
				background-color: var(--nr-dashboard-pageTitlebarBackgroundColor);
				opacity: 0.4;
			}
			.weekDayActive-` + uniqueId + ` {
				opacity: 1;
			}
			.timerhead-` + uniqueId + `, #` + divPrimary + ` .md-button {
				background-color: var(--nr-dashboard-pageTitlebarBackgroundColor);
			}
		</style>`
		;

		const timerBody = String.raw`
		<div id="` + divPrimary + `" ng-init='init(` + JSON.stringify(config) + `)' style="height: ` + (40 + (config.height*125)) + `px;">
			<div layout="row" layout-align="space-between center" style="max-height: 50px;">
				<span flex="70" ng-show="devices.length <= 1" style="height:50px; line-height: 50px;"> ` + config.devices[0] + ` </span>
				<span flex="70" ng-show="devices.length > 1">
					<md-input-container>
						<md-select class="nr-dashboard-dropdown" ng-model="myDeviceSelect" ng-change="showStandardView()" aria-label="Select device" ng-disabled="isEditMode">
							<md-option value="overview">` + RED._("time-scheduler.ui.overview") + `</md-option>
							<md-option ng-repeat="device in devices" value={{$index}}> {{devices[$index]}} </md-option>
						</md-select>
					</md-input-container>
				</span>
				<span flex="30" layout="row" layout-align="end center">
					<md-button id="addTimerBtn-` + uniqueId + `" style="width: 50px; height: 36px; margin: 0;" aria-label="Add" ng-click="toggleViews()"> </md-button>
				</span>
			</div>
			<div id="messageBoard-` + uniqueId + `" style="display:none;"> <p> </p> </div>
			<div id="overview-` + uniqueId + `" style="display:none; overflow:hidden">
				<div ng-repeat="device in devices track by $index">
					<h4> {{devices[$index]}} </h4>
					<span ng-repeat="timer in filteredValues = (timers | filter:{ output: $index})" style="white-space: nowrap">
						<span style="float:left; max-width: 100px;">
							{{millisToTime(timer.starttime)}}-${config.eventMode ? `{{booleanToReadable(timer.event)}}` : `{{millisToTime(timer.endtime)}}`}
						</span>
						<br ng-if="(timer.hasOwnProperty('event') && timer.event.length > 7)">
						<span style="float:right;">
							<span ng-repeat="day in days | limitTo : ${config.startDay}-7" ng-init="dayIndex=$index+${config.startDay}">{{timer.days[dayIndex]===1 ? days[dayIndex]+"&nbsp;" : ""}}</span>
							<span ng-repeat="day in days | limitTo : -${config.startDay}" ng-init="dayIndex=$index">{{timer.days[dayIndex]===1 ? days[dayIndex]+"&nbsp;" : ""}}</span>
						</span>
						<br>
					</span>
					<span ng-if="!filteredValues.length">------</span>
					<hr>
				</div>
			</div>
			<div id="timersView-` + uniqueId + `" style="margin-top: 4px;">
				<table style="width: 100%; border-spacing: 0px;">
				<tbody>
					<tr ng-repeat-start="timer in timers | filter:{ output: myDeviceSelect} track by $index" ng-click="showAddView(timers.indexOf(timer))" class="timerhead-` + uniqueId + `">
						<th> # </th>
						${config.eventMode ? `
						<th colspan="3">` + RED._("time-scheduler.ui.start") + `</th>
						<th colspan="3">` + RED._("time-scheduler.ui.event") + `</th>
						` : `
						<th colspan="2">` + RED._("time-scheduler.ui.start") + `</th>
						<th colspan="2">` + RED._("time-scheduler.ui.end") + `</th>
						<th colspan="2">` + RED._("time-scheduler.ui.duration") + `</th>
						`}
					</tr>
					<tr ng-click="showAddView(timers.indexOf(timer))">
						<td> {{$index+1}} </td>
						${config.eventMode ? `
						<td colspan="3"> {{millisToTime(timer.starttime)}} </td>
						<td colspan="3"> {{booleanToReadable(timer.event)}} </td>
						` : `
						<td colspan="2"> {{millisToTime(timer.starttime)}} </td>
						<td colspan="2"> {{millisToTime(timer.endtime)}} </td>
						<td colspan="2"> {{minutesToReadable(diff(timer.starttime,timer.endtime))}} </td>
						`}
					</tr>
					<tr ng-click="showAddView(timers.indexOf(timer))">
						<td ng-repeat="day in days | limitTo : ${config.startDay}-7" ng-init="dayIndex=$index+${config.startDay}" style="width:14%;margin: 0 2%;"> 
							<div class="weekDay-` + uniqueId + ` {{(timer.days[localDayToUtc(timer,dayIndex)]) ? 'weekDayActive-` + uniqueId + `' : ''}}">
								{{days[dayIndex]}}	
							</div>
						</td>
						<td ng-repeat="day in days | limitTo : -${config.startDay}" ng-init="dayIndex=$index" style="width:14%;margin: 0 2%;"> 
							<div class="weekDay-` + uniqueId + ` {{(timer.days[localDayToUtc(timer,dayIndex)]) ? 'weekDayActive-` + uniqueId + `' : ''}}">
								{{days[dayIndex]}}	
							</div>
						</td> 
					</tr>
					<tr ng-repeat-end style="height: 6px;"> </tr>
				</tbody>
				</table>
			</div>
			<div id="addTimerView-` + uniqueId + `" style="display:none; position: relative;">
				<form ng-submit="addTimer()" style="width: 100%; position: absolute;">
					<div layout="row" style="max-height: 60px;">
						<md-input-container flex="50">
							<label style="color: var(--nr-dashboard-widgetTextColor)">` + RED._("time-scheduler.ui.starttime") + `</label>
							<input id="timerStarttime-` + uniqueId + `" value="00:00" type="time" required pattern="^([0-1][0-9]|2[0-3]):([0-5][0-9])$">
							<span class="validity"></span>
						</md-input-container>
						${config.eventMode ? `
						${config.customPayload ? `
						<md-input-container flex="50">
							<label style="color: var(--nr-dashboard-widgetTextColor)">` + RED._("time-scheduler.ui.event") + `</label>
							<input ng-model="timerEvent" required autocomplete="off">
						</md-input-container>
						` : `
						<md-input-container flex="50">
							<label style="color: var(--nr-dashboard-widgetTextColor)">` + RED._("time-scheduler.ui.event") + `</label>
							<md-select class="nr-dashboard-dropdown" ng-model="timerEvent">
								<md-option ng-value=true selected>` + RED._("time-scheduler.ui.on") + `</md-option>
								<md-option ng-value=false >` + RED._("time-scheduler.ui.off") + `</md-option>
							</md-select>
						</md-input-container>
						`}
						` : `
						<md-input-container flex="45">
							<label style="color: var(--nr-dashboard-widgetTextColor)">` + RED._("time-scheduler.ui.endtime") + `</label>
							<input id="timerEndtime-` + uniqueId + `" value="00:00" type="time" required pattern="^([0-1][0-9]|2[0-3]):([0-5][0-9])$">
							<span class="validity"></span>
						</md-input-container>
						`}
					</div>
					<div layout="row" style="max-height: 50px;">
						<md-input-container>
							<label style="color: var(--nr-dashboard-widgetTextColor)">` + RED._("time-scheduler.ui.daysActive") + `</label>
							<md-select class="nr-dashboard-dropdown" multiple="true" placeholder="` + RED._("time-scheduler.ui.daysActive") + `" ng-model="myMultipleSelect">
								<md-option ng-repeat="day in days | limitTo : ${config.startDay}-7" ng-init="$index=$index+${config.startDay}" value={{$index}}> {{days[$index]}}  </md-option>
								<md-option ng-repeat="day in days | limitTo : -${config.startDay}" value={{$index}}> {{days[$index]}}  </md-option>
							</md-select>
						</md-input-container>
					</div>
					<div layout="row" layout-align="space-between end" style="height: 40px;">
						<md-button style="margin: 1px" ng-click="deleteTimer()" ng-show="hiddenTimerIndex !== undefined">` + RED._("time-scheduler.ui.delete") + `</md-button>
						<span ng-show="hiddenTimerIndex === undefined"> </span>
						<md-button style="margin: 1px" type="submit">` + RED._("time-scheduler.ui.save") + `</md-button>
					</div>
				</form>
				<div ng-show="loading" style="width:100%; position: absolute; z-index:10; opacity: 0.9; height:150px; line-height: 150px; background-color: var(--nr-dashboard-pageTitlebarBackgroundColor);">
					<center>` + RED._("time-scheduler.ui.loading") + `<center>
				</div>
			</div>
		</div>
		`;

		const html = String.raw`
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
			let ui = undefined;
			if(ui === undefined) {
				ui = RED.require("node-red-dashboard")(RED);
			}

			RED.nodes.createNode(this,config);
			const node = this;
			let nodeTimers = [];

			this.nodeCallback = function nodeCallback(req, res) {
				res.send(nodeTimers);
			}

			// START check props
			if (!config.hasOwnProperty("refresh")) config.refresh = 60;
			if (!config.hasOwnProperty("startDay")) config.startDay = 0;
			if (!config.hasOwnProperty("height") || config.height == 0) config.height = 1;
			if (!config.hasOwnProperty("name") || config.name === "") config.name = "Time-Scheduler";
			if (!config.hasOwnProperty("devices") || config.devices.length === 0) config.devices = [config.name];
			// END check props
			config.i18n = {	payloadWarning: RED._("time-scheduler.ui.payloadWarning"), 
							nothingPlanned: RED._("time-scheduler.ui.nothingPlanned"), 
							alertTimespan: RED._("time-scheduler.ui.alertTimespan"),
							days: RED._("time-scheduler.ui.days", { returnObjects: true }),
							on: RED._("time-scheduler.ui.on"),
							off: RED._("time-scheduler.ui.off")};
			
			if (checkConfig(config, node)) {
				const done = ui.addWidget({
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
								if (element.starttime === undefined || element.days === undefined) {
									valid = false;
								}

								if (config.eventMode) {
									if (element.event === undefined) valid = false;
								} else {
									if (element.endtime === undefined) valid = false;
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
						node.status({});
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
							$scope.days = config.i18n.days;
							$scope.timeschedulerid = config.id;
							$scope.devices = config.devices;
							$scope.myDeviceSelect = $scope.devices.length > 1 ? "overview" : "0";
							$scope.eventMode = config.eventMode;
						}

						$scope.$watch('msg', function() {
							$scope.getTimersFromServer();
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
							$scope.getElement("overview").style.display = "none";
							$scope.getElement("addTimerView").style.display = "none";

							if (!$scope.timers) {
								$scope.getElement("timersView").style.display = "none";
								$scope.getElement("addTimerBtn").disabled = true;
								
								const msgBoard = $scope.getElement("messageBoard");
								msgBoard.style.display = "block";
								msgBoard.firstElementChild.innerHTML = $scope.i18n.payloadWarning;
							} else if ($scope.myDeviceSelect === "overview") {
								$scope.getElement("timersView").style.display = "none";
								$scope.getElement("addTimerBtn").disabled = true;
								$scope.getElement("overview").style.display = "block";
							} else if ($scope.timers.filter(timer => timer.output == $scope.myDeviceSelect).length === 0) {
								$scope.getElement("timersView").style.display = "none";
								
								const msgBoard = $scope.getElement("messageBoard");
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
								const start = new Date(today.getFullYear(), today.getMonth(), today.getDay(), today.getHours(), today.getMinutes()+1, 0);
								$scope.getElement("timerStarttime").value = $scope.formatTime(start.getHours(), start.getMinutes());
								if ($scope.eventMode) $scope.timerEvent = true
								else {
									const end = new Date(today.getFullYear(), today.getMonth(), today.getDay(), today.getHours(), today.getMinutes()+6, 0);
									$scope.getElement("timerEndtime").value = $scope.formatTime(end.getHours(), end.getMinutes());
								}
								$scope.myMultipleSelect.push(today.getDay());
							} else {
								const timer = $scope.timers[timerIndex];
								const start = new Date(timer.starttime);
								$scope.getElement("timerStarttime").value = $scope.formatTime(start.getHours(), start.getMinutes());
								if ($scope.eventMode) $scope.timerEvent = timer.event;
								else {
									const end = new Date(timer.endtime);
									$scope.getElement("timerEndtime").value = $scope.formatTime(end.getHours(), end.getMinutes());
								}
								for (let i = 0; i < timer.days.length; i++) {
									if (timer.days[$scope.localDayToUtc(timer,i)]) $scope.myMultipleSelect.push(i);
								}
							}
						}

						$scope.addTimer = function() {
							const now = new Date();
							const startInput = $scope.getElement("timerStarttime").value.split(":");
							const starttime = new Date(now.getFullYear(), now.getMonth(), now.getDay(), startInput[0], startInput[1], 0, 0).getTime();

							const timer = {
								starttime: starttime,
								days : [0,0,0,0,0,0,0],
								output : $scope.myDeviceSelect
							};

							if ($scope.eventMode) {
								timer.event = $scope.timerEvent;
								if (timer.event === "true" || timer.event === true) {
									timer.event = true;
								} else if (timer.event === "false" || timer.event === false) {
									timer.event = false;;
								} else if (!isNaN(timer.event) && (timer.event+"").charAt(0) != "0") {
									timer.event = Number(timer.event);
								}
							} else {
								const endInput = $scope.getElement("timerEndtime").value.split(":");
								const endtime = new Date(now.getFullYear(), now.getMonth(), now.getDay(), endInput[0], endInput[1], 0, 0).getTime();

								if ($scope.diff(starttime, endtime) < 1) {
									alert($scope.i18n.alertTimespan);
									return;
								}

								timer.endtime = endtime;
							}
			
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
								const millisA = $scope.getNowWithCustomTime(a.starttime);
								const millisB = $scope.getNowWithCustomTime(b.starttime);
								return millisA - millisB;
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

						$scope.booleanToReadable = function(e) {
							if (e === 'true' || e === true) return $scope.i18n.on;
							if (e === 'false' || e === false) return $scope.i18n.off;
							return e;
						}

						$scope.millisToTime = function(millis) {
							const date = new Date(millis);
							return $scope.formatTime(date.getHours(), date.getMinutes());
						}

						$scope.formatTime = function (hours, minutes) {
							return $scope.padZero(hours) + ":" + $scope.padZero(minutes);
						}

						$scope.getNowWithCustomTime = function(timeInMillis) {
							const date = new Date();
							const origDate = new Date(timeInMillis);
							date.setHours(origDate.getHours());
							date.setMinutes(origDate.getMinutes());
							date.setSeconds(0); date.setMilliseconds(0); 
							return date.getTime();
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
								async: true,
								beforeSend: function() {
									$scope.loading = true;
								},
								success: function(json) {
									$scope.timers = json;
									$scope.$digest();
								},
								complete: function() {
									$scope.loading = false;
									$scope.showStandardView();
									$scope.$digest();
								}
							});
						}
					}
				});

				let nodeInterval;
				function createInitTimeout() {
					const today = new Date();
					const remaining = config.refresh - (today.getSeconds()%config.refresh);
					setTimeout(function() {
						nodeInterval = setInterval(intervalTimerFunction, config.refresh * 1000);
						intervalTimerFunction();
					}, (remaining*1000) - today.getMilliseconds());
				}
				createInitTimeout();

				function intervalTimerFunction() {
					const outputValues = [null];
					addOutputValues(outputValues);
					node.send(outputValues);
				}

				function addOutputValues(myArray) {
					for (let i = 0; i<config.devices.length; i++) {
						const msg = {payload: isInTime(i)};
						if (config.sendTopic) msg.topic = config.devices[i];
						msg.payload != null ? myArray.push(msg) : myArray.push(null);
					}
				}

				function isInTime(device) {
					let status = null;

					if (nodeTimers.length > 0) {
						const date = new Date();
						
						nodeTimers.filter(timer => timer.output == device).forEach(function (timer) {		
							if (status != null) return;

							const localStarttime = new Date(timer.starttime);
							// CHECK UTC DAY
							const utcDay = localDayToUtc(timer, date.getDay());
							if (timer.days[utcDay] === 0) return;

							const compareDate = new Date(localStarttime);
							compareDate.setHours(date.getHours());
							compareDate.setMinutes(date.getMinutes());

							if (config.eventMode) {
								if (compareDate.getTime() == localStarttime.getTime()) {
									status = timer.event;
								}
							} else {
								const localEndtime = new Date(timer.endtime);
								if (compareDate.getTime() >= localStarttime.getTime() && compareDate.getTime() < localEndtime.getTime()) {
									status = true;
								}
							}
						});
					}

					if (!config.eventMode && status == null) status = false;
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
	let nodePath = '/' + uiPath + '/time-scheduler/getNode/:nodeId';
	nodePath = nodePath.replace(/\/+/g, '/');

	RED.httpNode.get(nodePath, function(req, res) {
		const nodeId = req.params.nodeId;
		const node = RED.nodes.getNode(nodeId);
		node ? node.nodeCallback(req, res) : res.send(404).end();
	});
}