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
			#${divPrimary} {
				height: ${86 + (config.height*80)}px;
				padding-left: 6px;
				padding-right: 7px;
			}
			#${divPrimary} md-input-container {
				width: 100%;
			}
			#${divPrimary} md-select md-select-value {
				color: var(--nr-dashboard-widgetTextColor);
				border-color: var(--nr-dashboard-pageTitlebarBackgroundColor);
			}
			#${divPrimary} md-select[disabled] md-select-value {
				color: var(--nr-dashboard-widgetTextColor);
				opacity: 0.7;
			}
			#${divPrimary} .md-button {
				background-color: var(--nr-dashboard-pageTitlebarBackgroundColor);
			}
			#${divPrimary} .md-subheader {
				top: -3px !important;
			}
			#${divPrimary} .md-subheader .md-subheader-inner {
				color: var(--nr-dashboard-widgetTextColor);
				background-color: var(--nr-dashboard-pageTitlebarBackgroundColor);
				padding: 6px 5px;
			}
			.weekDay-${uniqueId} {
				color: var(--nr-dashboard-widgetTextColor);
				background-color: var(--nr-dashboard-pageTitlebarBackgroundColor);
				width: 36px;
				line-height: 36px;
				display: inline-block;
				border-radius: 50%;
				opacity: 0.4;
			}
			.weekDayActive-${uniqueId} {
				opacity: 1;
			}
		</style>
		`;

		const timerBody = String.raw`
		<div id="${divPrimary}" ng-init='init(${JSON.stringify(config)})'>
			<div layout="row" layout-align="space-between center" style="max-height: 50px;">
				<span flex="70" ng-show="devices.length <= 1" style="height:50px; line-height: 50px;"> ${config.devices[0]} </span>
				<span flex="70" ng-show="devices.length > 1">
					<md-input-container>
						<md-select class="nr-dashboard-dropdown" ng-model="myDeviceSelect" ng-change="showStandardView()" aria-label="Select device" ng-disabled="isEditMode">
							<md-option value="overview"> ${RED._("time-scheduler.ui.overview")} </md-option>
							<md-option ng-repeat="device in devices" value={{$index}}> {{devices[$index]}} </md-option>
						</md-select>
					</md-input-container>
				</span>
				<span flex="30" layout="row" layout-align="end center">
					<md-button id="addTimerBtn-${uniqueId}" style="width: 50px; height: 36px; margin: 0;" aria-label="Add" ng-click="toggleViews()"> </md-button>
				</span>
			</div>
			<div id="messageBoard-${uniqueId}" style="display:none;"> <p> </p> </div>
			<div id="overview-${uniqueId}" style="display:none;">
				<div ng-repeat="device in devices track by $index">
					<md-list flex ng-cloak ng-if="(filteredValues = (timers | filter:{ output: $index.toString() }:true)).length">
						<md-subheader> <span class="md-subhead"> {{devices[$index]}} </span> </md-subheader>
						<md-list-item ng-repeat="timer in filteredValues" style="min-height: 25px; height: 25px; padding: 0 2px;">
							<span style="overflow-x: hidden; {{timer.disabled ? 'opacity: 0.4;' : ''}}">
								{{millisToTime(timer.starttime)}}&#8209;${config.eventMode ? `{{booleanToReadable(timer.event)}}` : `{{millisToTime(timer.endtime)}}`}
							</span>
							<div class="md-secondary" style="{{timer.disabled ? 'opacity: 0.4' : ''}};">
								<span ng-repeat="day in days | limitTo : ${config.startDay}-7" ng-init="dayIndex=$index+${config.startDay}">{{timer.days[localDayToUtc(timer,dayIndex)]===1 ? ($index!=0 ? "&nbsp;" : "")+days[dayIndex] : ""}}</span>
								<span ng-repeat="day in days | limitTo : -${config.startDay}" ng-init="dayIndex=$index">{{timer.days[localDayToUtc(timer,dayIndex)]===1 ? ($index!=0 ? "&nbsp;" : "")+days[dayIndex] : ""}}</span>
							</div>
							<md-divider ng-if="!$last"></md-divider>
						</md-list-item>
					<md-list>
				</div>
				<div ng-if="timers.length == 0"> <p> ${RED._("time-scheduler.ui.emptyOverview")} <p> </div>
			</div>
			<div id="timersView-${uniqueId}">
				<md-list flex ng-cloak style="text-align: center">
					<md-subheader>
						<div layout="row" class="md-subhead">
							<span flex=""> # </span>
							${config.eventMode ? `
							<span flex="40"> ${RED._("time-scheduler.ui.start")} </span>
							<span flex="45"> ${RED._("time-scheduler.ui.event")} </span>
							` : `
							<span flex="30"> ${RED._("time-scheduler.ui.start")} </span>
							<span flex="30"> ${RED._("time-scheduler.ui.end")} </span>
							<span flex="25"> ${RED._("time-scheduler.ui.duration")} </span>
							`}
						</div>
					</md-subheader>
					<md-list-item class="md-2-line" style="height: 80px; padding: 0 5px; border-left: 2px solid {{timer.disabled ? 'red' : 'transparent'}};" ng-repeat="timer in timers | filter:{ output: myDeviceSelect }:true track by $index">
						<div class="md-list-item-text" ng-click="showAddView(timers.indexOf(timer))" style="opacity:{{timer.disabled ? 0.4 : 1}};">
							<div layout="row">
								<span flex=""> {{$index+1}} </span>
								${config.eventMode ? `
								<span flex="40"> {{millisToTime(timer.starttime)}} </span>
								<span flex="45"> {{booleanToReadable(timer.event)}} </span>
								` : `
								<span flex="30"> {{millisToTime(timer.starttime)}} </span>
								<span flex="30"> {{millisToTime(timer.endtime)}} </span>
								<span flex="25"> {{minutesToReadable(diff(timer.starttime,timer.endtime))}} </span>
								`}
							</div>
							<div layout="row" style="padding-top: 6px; padding-bottom: 6px;">
								<span flex="" ng-repeat="day in days | limitTo : ${config.startDay}-7" ng-init="dayIndex=$index+${config.startDay}">
									<span class="weekDay-${uniqueId} {{(timer.days[localDayToUtc(timer,dayIndex)]) ? 'weekDayActive-${uniqueId}' : ''}}"> {{days[dayIndex]}} </span>
								</span>
								<span flex="" ng-repeat="day in days | limitTo : -${config.startDay}" ng-init="dayIndex=$index">
									<span class="weekDay-${uniqueId} {{(timer.days[localDayToUtc(timer,dayIndex)]) ? 'weekDayActive-${uniqueId}' : ''}}"> {{days[dayIndex]}} </span>
								</span>
							</div>
						</div>
						<md-divider ng-if="!$last"></md-divider>
					</md-list-item>
				<md-list>
			</div>
			<div id="addTimerView-${uniqueId}" style="display:none; position: relative;">
				<form ng-submit="addTimer()" style="width: 100%; position: absolute;">
					<div layout="row" style="max-height: 60px;">
						<md-input-container flex="50">
							<label style="color: var(--nr-dashboard-widgetTextColor)">${RED._("time-scheduler.ui.starttime")}</label>
							<input id="timerStarttime-${uniqueId}" value="00:00" type="time" required pattern="^([0-1][0-9]|2[0-3]):([0-5][0-9])$">
							<span class="validity"></span>
						</md-input-container>
						${config.eventMode ? `
						${config.customPayload ? `
						<md-input-container flex="50">
							<label style="color: var(--nr-dashboard-widgetTextColor)">${RED._("time-scheduler.ui.event")}</label>
							<input ng-model="formtimer.timerEvent" required autocomplete="off">
						</md-input-container>
						` : `
						<md-input-container flex="50">
							<label style="color: var(--nr-dashboard-widgetTextColor)">${RED._("time-scheduler.ui.event")}</label>
							<md-select class="nr-dashboard-dropdown" ng-model="formtimer.timerEvent">
								<md-option ng-value=true selected>${RED._("time-scheduler.ui.on")}</md-option>
								<md-option ng-value=false >${RED._("time-scheduler.ui.off")}</md-option>
							</md-select>
						</md-input-container>
						`}
						` : `
						<md-input-container flex="45">
							<label style="color: var(--nr-dashboard-widgetTextColor)">${RED._("time-scheduler.ui.endtime")}</label>
							<input id="timerEndtime-${uniqueId}" value="00:00" type="time" required pattern="^([0-1][0-9]|2[0-3]):([0-5][0-9])$">
							<span class="validity"></span>
						</md-input-container>
						`}
					</div>
					<div layout="row" style="max-height: 50px;">
						<md-input-container>
							<label style="color: var(--nr-dashboard-widgetTextColor)">${RED._("time-scheduler.ui.daysActive")}</label>
							<md-select class="nr-dashboard-dropdown" multiple="true" placeholder="${RED._("time-scheduler.ui.daysActive")}" ng-model="formtimer.dayselect">
								<md-option ng-repeat="day in days | limitTo : ${config.startDay}-7" ng-init="$index=$index+${config.startDay}" value={{$index}}> {{days[$index]}} </md-option>
								<md-option ng-repeat="day in days | limitTo : -${config.startDay}" value={{$index}}> {{days[$index]}} </md-option>
							</md-select>
						</md-input-container>
					</div>
					<div layout="row" layout-align="space-between end" style="height: 40px;">
						<md-button style="margin: 1px;" ng-show="formtimer.index !== undefined" ng-click="deleteTimer()">${RED._("time-scheduler.ui.delete")}</md-button>
						<md-button style="margin: 1px;" ng-show="formtimer.index !== undefined" ng-click="formtimer.disabled=!formtimer.disabled">
							{{formtimer.disabled ? i18n.disabled : i18n.enabled}}
						</md-button>
						<span ng-show="formtimer.index === undefined"> </span>
						<md-button style="margin: 1px" type="submit">${RED._("time-scheduler.ui.save")}</md-button>
					</div>
				</form>
				<div ng-show="loading" style="width:100%; position: absolute; z-index:10; opacity: 0.9; height:150px; line-height: 150px; background-color: var(--nr-dashboard-pageTitlebarBackgroundColor);">
					<center>${RED._("time-scheduler.ui.loading")}<center>
				</div>
			</div>
		</div>
		`;

		return String.raw`${styles}${timerBody}`;
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
			config.i18n = RED._("time-scheduler.ui", { returnObjects: true });

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

								if (!element.hasOwnProperty("output")) element.output = "0";
								else if (Number.isInteger(element.output)) element.output = element.output.toString();
							});
							msg.payload = msg.payload.filter(t => t.output < config.devices.length);
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
							$scope.nodeId = config.id;
							$scope.i18n = config.i18n;
							$scope.days = config.i18n.days;
							$scope.devices = config.devices;
							$scope.myDeviceSelect = $scope.devices.length > 1 ? "overview" : "0";
							$scope.eventMode = config.eventMode;
						}

						$scope.$watch('msg', function(msg) {
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
							$scope.formtimer = {index: timerIndex};
							$scope.formtimer.dayselect = [];

							if (timerIndex === undefined) {
								const today = new Date();
								if (today.getHours() == "23" && today.getMinutes() >= "54") today.setMinutes(53);
								const start = new Date(today.getFullYear(), today.getMonth(), today.getDay(), today.getHours(), today.getMinutes()+1, 0);
								$scope.getElement("timerStarttime").value = $scope.formatTime(start.getHours(), start.getMinutes());
								if ($scope.eventMode) $scope.formtimer.timerEvent = true;
								else {
									const end = new Date(today.getFullYear(), today.getMonth(), today.getDay(), today.getHours(), today.getMinutes()+6, 0);
									$scope.getElement("timerEndtime").value = $scope.formatTime(end.getHours(), end.getMinutes());
								}
								$scope.formtimer.dayselect.push(today.getDay());
								$scope.formtimer.disabled = false;
							} else {
								const timer = $scope.timers[timerIndex];
								const start = new Date(timer.starttime);
								$scope.getElement("timerStarttime").value = $scope.formatTime(start.getHours(), start.getMinutes());
								if ($scope.eventMode) $scope.formtimer.timerEvent = timer.event;
								else {
									const end = new Date(timer.endtime);
									$scope.getElement("timerEndtime").value = $scope.formatTime(end.getHours(), end.getMinutes());
								}
								for (let i = 0; i < timer.days.length; i++) {
									if (timer.days[$scope.localDayToUtc(timer,i)]) $scope.formtimer.dayselect.push(i);
								}
								$scope.formtimer.disabled = timer.hasOwnProperty("disabled");
							}
						}

						$scope.addTimer = function() {
							const now = new Date();
							const startInput = $scope.getElement("timerStarttime").value.split(":");
							const starttime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startInput[0], startInput[1], 0, 0).getTime();

							const timer = {
								starttime: starttime,
								days : [0,0,0,0,0,0,0],
								output : $scope.myDeviceSelect
							};

							if ($scope.eventMode) {
								timer.event = $scope.formtimer.timerEvent;
								if (timer.event === "true" || timer.event === true) {
									timer.event = true;
								} else if (timer.event === "false" || timer.event === false) {
									timer.event = false;;
								} else if (!isNaN(timer.event) && (timer.event+"").charAt(0) != "0") {
									timer.event = Number(timer.event);
								}
							} else {
								const endInput = $scope.getElement("timerEndtime").value.split(":");
								let endtime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endInput[0], endInput[1], 0, 0).getTime();
								if (endInput[0] === "00" && endInput[1] === "00") endtime += 24*60*60*1000;

								if ($scope.diff(starttime, endtime) < 1) {
									alert($scope.i18n.alertTimespan);
									return;
								}

								timer.endtime = endtime;
							}

							$scope.formtimer.dayselect.forEach(day => {
								const utcDay = $scope.localDayToUtc(timer, Number(day));
								timer.days[utcDay] = 1;
							});

							if ($scope.formtimer.disabled) timer.disabled = "disabled";

							const timerIndex = $scope.formtimer.index;
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
							$scope.timers.splice($scope.formtimer.index,1);
							$scope.sendTimersToOutput();
						}

						$scope.sendTimersToOutput = function() {
							if (!$scope.msg) $scope.msg = [{payload: ""}];
							$scope.msg[0].payload = angular.copy($scope.timers);
							$scope.send([$scope.msg[0]]);
						}

						$scope.minutesToReadable = function(minutes) {
							return (Math.floor(minutes/60) > 0 ? Math.floor(minutes/60) + "h " : "") + (minutes%60 > 0 ? minutes%60+"m" : "");
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
							return document.querySelector("#" + elementId + "-" + $scope.nodeId.replace(".", ""));
						}

						$scope.getTimersFromServer = function() {
							$.ajax({
								url: "time-scheduler/getNode/" + $scope.nodeId,
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
							if (timer.hasOwnProperty("disabled")) return;

							const utcDay = localDayToUtc(timer, date.getDay());
							const localStarttime = new Date(timer.starttime);
							const localEndtime = config.eventMode ? localStarttime : new Date(timer.endtime);
							const daysDiff = localEndtime.getDay()-localStarttime.getDay();

							if (daysDiff != 0) {
								// WRAPS AROUND MIDNIGHT (SERVER PERSPECTIVE)
								const utcYesterday = utcDay-1 < 0 ? 6 : utcDay-1;
								if (timer.days[utcYesterday] === 1) {
									// AND STARTED YESTERDAY (SERVER PERSPECTIVE)
									const compareDate = new Date(localEndtime);
									compareDate.setHours(date.getHours());
									compareDate.setMinutes(date.getMinutes());
									if (compareDate.getTime() < localEndtime.getTime()) {
										status = true;
										return;
									}
								}
							}

							if (timer.days[utcDay] === 0) return;

							const compareDate = new Date(localStarttime);
							compareDate.setHours(date.getHours());
							compareDate.setMinutes(date.getMinutes());

							if (config.eventMode) {
								if (compareDate.getTime() == localStarttime.getTime()) {
									status = timer.event;
								}
							} else {
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