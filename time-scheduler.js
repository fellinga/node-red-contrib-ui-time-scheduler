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
	const sunCalc = require('suncalc');

	function HTML(config) {
		const uniqueId = config.id.replace(".", "");
		const divPrimary = "ui-ts-" + uniqueId;

		const styles = String.raw`
		<style>
			#${divPrimary} {
				padding-left: 6px;
				padding-right: 7px;
			}
			#${divPrimary} md-input-container {
				width: 100%;
			}
			#${divPrimary} md-select md-select-value {
				color: var(--nr-dashboard-widgetTextColor);
				border-color: var(--nr-dashboard-widgetColor);
			}
			#${divPrimary} md-select[disabled] md-select-value, input[type="text"]:disabled {
				color: var(--nr-dashboard-widgetTextColor);
				opacity: 0.7;
			}
			#${divPrimary} .md-button {
				color: var(--nr-dashboard-widgetTextColor);
				background-color: var(--nr-dashboard-widgetColor);
				min-width: 40px;
			}
			#${divPrimary} .md-subheader {
				top: -3px !important;
			}
			#${divPrimary} .md-subheader .md-subheader-inner {
				color: var(--nr-dashboard-widgetTextColor);
				background-color: var(--nr-dashboard-widgetColor);
				padding: 6px 5px;
			}
			#${divPrimary} md-icon {
				color: var(--nr-dashboard-widgetTextColor);
			}
			#${divPrimary} md-progress-circular path {
				stroke: var(--nr-dashboard-widgetTextColor);
			}
			#${divPrimary} .weekDay {
				color: var(--nr-dashboard-widgetTextColor);
				background-color: var(--nr-dashboard-widgetColor);
				width: 34px;
				line-height: 34px;
				display: inline-block;
				border-radius: 50%;
				opacity: 0.4;
			}
			#${divPrimary} .weekDayActive {
				opacity: 1;
			}
		</style>
		`;

		const timerBody = String.raw`
		<div id="${divPrimary}" ng-init='init(${JSON.stringify(config)})'>
			<div layout="row" layout-align="space-between center" style="max-height: 50px;">
				<span flex="65" ng-show="devices.length <= 1" style="height:50px; line-height: 50px;"> ${config.devices[0]} </span>
				<span flex="65" ng-show="devices.length > 1">
					<md-input-container>
						<md-select class="nr-dashboard-dropdown" ng-model="myDeviceSelect" ng-change="showStandardView()" aria-label="Select device" ng-disabled="isEditMode">
							<md-option value="overview"> ${RED._("time-scheduler.ui.overview")} </md-option>
							<md-option ng-repeat="device in devices" value={{$index}}> {{devices[$index]}} </md-option>
						</md-select>
					</md-input-container>
				</span>
				<span flex="35" layout="row" layout-align="end center" style="height: 50px;">
					<md-button style="width: 40px; height: 36px; margin-right: 4px;" aria-label="device enabled" ng-if="myDeviceSelect !== 'overview' && !isEditMode" ng-click="toggleDeviceStatus(myDeviceSelect)" >
						<md-icon> {{isDeviceEnabled(myDeviceSelect) ? "alarm_on" : "alarm_off"}} </md-icon>
					</md-button>
					<md-button style="width: 40px; height: 36px; margin: 0px;" aria-label="Add" ng-if="myDeviceSelect !== 'overview'" ng-click="toggleViews()" ng-disabled="loading">
						<md-icon> {{isEditMode ? "close" : "add"}} </md-icon>
					</md-button>
					<md-fab-speed-dial md-direction="down" class="md-scale" style="max-height: 36px;" ng-if="myDeviceSelect === 'overview'">
						<md-fab-trigger style="width: 84px;">
							<md-button aria-label="filter" style="width: 100%; margin: 0px;"><md-icon> filter_alt </md-icon></md-button>
						</md-fab-trigger>
						<md-fab-actions style="width: 84px;">
							<md-button aria-label="enabled" style="width: 100%; margin: 7px 0 0 0; border: 2px solid var(--nr-dashboard-groupBorderColor);" ng-click="changeFilter('enabled')" ng-disabled="overviewFilter != 'all'">
								${RED._("time-scheduler.ui.active")} <md-icon> {{overviewFilter === "all" ? "" : "check"}} </md-icon> 
							</md-button>
							<md-button aria-label="all" style="width: 100%; margin: 7px 0 0 0; border: 2px solid var(--nr-dashboard-groupBorderColor);" ng-click="changeFilter('all')" ng-disabled="overviewFilter == 'all'">
								${RED._("time-scheduler.ui.all")} <md-icon> {{overviewFilter === "all" ? "check" : ""}} </md-icon> 
							</md-button>
						</md-fab-actions>
					</md-fab-speed-dial>
				</span>
			</div>
			<div id="messageBoard-${uniqueId}" style="display:none;"> <p> </p> </div>
			<div id="overview-${uniqueId}" style="display:none;">
				<div ng-repeat="device in devices track by $index">
					<md-list flex ng-cloak ng-if="(filteredDeviceTimers = (getTimersByOverviewFilter() | filter:{ output: $index.toString() }:true)).length">
						<md-subheader> <span class="md-subhead"> {{devices[$index]}} </span> </md-subheader>
						<md-list-item ng-repeat="timer in filteredDeviceTimers" style="min-height: 25px; height: 25px; padding: 0 2px;">
							<span style="overflow-x: hidden; {{(timer.disabled || !isDeviceEnabled(timer.output)) ? 'opacity: 0.4;' : ''}}">
								{{millisToTime(timer.starttime)}}&#8209;${config.eventMode ? `{{eventToEventLabel(timer.event)}}` : `{{millisToTime(timer.endtime)}}`}
							</span>
							<div class="md-secondary" style=" {{(timer.disabled || !isDeviceEnabled(timer.output)) ? 'opacity: 0.4' : ''}};">
								<span ng-repeat="day in days | limitTo : ${config.startDay}-7" ng-init="dayIndex=$index+${config.startDay}">{{timer.days[localDayToUtc(timer,dayIndex)]===1 ? ($index!=0 ? "&nbsp;" : "")+days[dayIndex] : ""}}</span>
								<span ng-repeat="day in days | limitTo : -${config.startDay}" ng-init="dayIndex=$index">{{timer.days[localDayToUtc(timer,dayIndex)]===1 ? ($index!=0 ? "&nbsp;" : "")+days[dayIndex] : ""}}</span>
							</div>
							<md-divider ng-if="!$last"></md-divider>
						</md-list-item>
					<md-list>
				</div>
				<div ng-if="timers.length == 0">
					<p> ${RED._("time-scheduler.ui.emptyOverview")} <p>
				</div>
				<div ng-if="timers.length != 0 && getTimersByOverviewFilter().length == 0">
					<p> ${RED._("time-scheduler.ui.noActiveOverview")} <p>
				</div>
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
					<md-list-item class="md-2-line" style="height: 74px; padding: 0 5px; border-left: 2px solid {{(timer.disabled || !isDeviceEnabled(timer.output)) ? 'red' : (timer.startSolarEvent || timer.endSolarEvent) ? '#FCD440' : 'transparent'}};" ng-repeat="timer in timers | filter:{ output: myDeviceSelect }:true track by $index">
						<div class="md-list-item-text" ng-click="showAddView(timers.indexOf(timer))" style="opacity:{{(timer.disabled || !isDeviceEnabled(timer.output)) ? 0.4 : 1}};">
							<div layout="row">
								<span flex=""> {{$index+1}} </span>
								${config.eventMode ? `
								<span flex="40"> {{millisToTime(timer.starttime)}} </span>
								<span flex="45"> {{eventToEventLabel(timer.event)}} </span>
								` : `
								<span flex="30"> {{millisToTime(timer.starttime)}} </span>
								<span flex="30"> {{millisToTime(timer.endtime)}} </span>
								<span flex="25"> {{minutesToReadable(diff(timer.starttime,timer.endtime))}} </span>
								`}
							</div>
							<div layout="row" style="padding-top: 4px; padding-bottom: 4px;">
								<span flex="" ng-repeat="day in days | limitTo : ${config.startDay}-7" ng-init="dayIndex=$index+${config.startDay}">
									<span class="weekDay {{(timer.days[localDayToUtc(timer,dayIndex)]) ? 'weekDayActive' : ''}}"> {{days[dayIndex]}} </span>
								</span>
								<span flex="" ng-repeat="day in days | limitTo : -${config.startDay}" ng-init="dayIndex=$index">
									<span class="weekDay {{(timer.days[localDayToUtc(timer,dayIndex)]) ? 'weekDayActive' : ''}}"> {{days[dayIndex]}} </span>
								</span>
							</div>
						</div>
						<md-divider ng-if="!$last"></md-divider>
					</md-list-item>
				<md-list>
			</div>
			<div id="addTimerView-${uniqueId}" style="display:none; position: relative;">
				<form ng-submit="addTimer()" style="width: 100%; position: absolute;">
					<div ng-show="!showSunSettings">
						<div layout="row" layout-align="space-between none" style="max-height: 60px;">
							<md-input-container flex="50" ng-show="formtimer.starttype === 'custom'" style="margin-left: 0">
								<label style="color: var(--nr-dashboard-widgetTextColor)">${RED._("time-scheduler.ui.starttime")}</label>
								<input id="timerStarttime-${uniqueId}" value="08:00" type="time" required pattern="^([0-1][0-9]|2[0-3]):([0-5][0-9])$">
								<span class="validity"></span>
							</md-input-container>
							<md-input-container flex="50" ng-if="formtimer.starttype !== 'custom'" style="margin-left: 0">
								<label style="color: var(--nr-dashboard-widgetTextColor)">${RED._("time-scheduler.ui.starttime")}</label>
								<input ng-model="formtimer.solarStarttimeLabel" type="text" required disabled>
								<span class="validity"></span>
							</md-input-container>
							${config.eventMode ? `
							<md-input-container flex="">
								<label style="color: var(--nr-dashboard-widgetTextColor)">${RED._("time-scheduler.ui.event")}</label>
								${config.customPayload ? `
								<input ng-model="formtimer.timerEvent" required autocomplete="off">
								` : `
								<md-select class="nr-dashboard-dropdown" ng-model="formtimer.timerEvent" required>
									<md-option ng-repeat="option in eventOptions" value={{option.event}}> {{option.label}} </md-option>
								</md-select>
								`}
							</md-input-container>
							` : `
							<md-input-container flex="50" ng-show="formtimer.endtype === 'custom'">
								<label style="color: var(--nr-dashboard-widgetTextColor)">${RED._("time-scheduler.ui.endtime")}</label>
								<input id="timerEndtime-${uniqueId}" value="10:00" type="time" required pattern="^([0-1][0-9]|2[0-3]):([0-5][0-9])$">
								<span class="validity"></span>
							</md-input-container>
							<md-input-container flex="50" ng-if="formtimer.endtype !== 'custom'">
								<label style="color: var(--nr-dashboard-widgetTextColor)">${RED._("time-scheduler.ui.endtime")}</label>
								<input ng-model="formtimer.solarEndtimeLabel" type="text" required disabled> </input>
								<span class="validity"></span>
							</md-input-container>
							`}
						</div>
						<div layout="row" style="max-height: 50px;">
							<md-input-container>
								<label style="color: var(--nr-dashboard-widgetTextColor)">${RED._("time-scheduler.ui.daysActive")}</label>
								<md-select class="nr-dashboard-dropdown" multiple="true" placeholder="${RED._("time-scheduler.ui.daysActive")}" ng-model="formtimer.dayselect" ng-change="daysChanged()" >
									<md-option value="all"><em>${RED._("time-scheduler.ui.selectAll")}</em></md-option>
									<md-option ng-repeat="day in days | limitTo : ${config.startDay}-7" ng-init="$index=$index+${config.startDay}" value={{$index}}> {{days[$index]}} </md-option>
									<md-option ng-repeat="day in days | limitTo : -${config.startDay}" value={{$index}}> {{days[$index]}} </md-option>
								</md-select>
							</md-input-container>
						</div>
						<div layout="row" layout-align="space-between end" style="height: 40px;">
							<md-button style="margin: 1px;" ng-if="formtimer.index !== undefined" ng-click="deleteTimer()"> <md-icon> delete </md-icon> </md-button>
							<md-button style="margin: 1px;" ng-if="formtimer.index !== undefined" ng-click="formtimer.disabled=!formtimer.disabled">
								<md-icon> {{formtimer.disabled ? "alarm_off" : "alarm_on"}} </md-icon>
							</md-button>
							<span ng-if="formtimer.index === undefined" style="width: 40px;"></span> <span ng-if="formtimer.index === undefined" style="width: 40px;"></span>
							${config.solarEventsEnabled ? `<md-button style="margin: 1px;" aria-label="suntimer" ng-click="showSunSettings=!showSunSettings"> <md-icon> wb_sunny </md-icon> </md-button>` : ``}
							<md-button style="margin: 1px" type="submit"> <md-icon> done </md-icon> </md-button>
						</div>
					</div>
					<div ng-show="showSunSettings">
						<div layout="row" style="height: 50px;">
							<md-input-container flex="55">
								<label style="color: var(--nr-dashboard-widgetTextColor)">Starttype</label>
								<md-select class="nr-dashboard-dropdown" ng-model="formtimer.starttype" ng-change="updateSolarLabels()">
									<md-option value="custom" selected> ${RED._("time-scheduler.ui.custom")} </md-option>
									<md-option value="sunrise"> ${RED._("time-scheduler.ui.sunrise")} </md-option>
									<md-option value="sunriseEnd"> ${RED._("time-scheduler.ui.sunriseEnd")} </md-option>
									<md-option value="goldenHourEnd"> ${RED._("time-scheduler.ui.goldenHourEnd")} </md-option>
									<md-option value="solarNoon"> ${RED._("time-scheduler.ui.solarNoon")} </md-option>
									<md-option value="goldenHour"> ${RED._("time-scheduler.ui.goldenHour")} </md-option>
									<md-option value="sunsetStart"> ${RED._("time-scheduler.ui.sunsetStart")} </md-option>
									<md-option value="sunset"> ${RED._("time-scheduler.ui.sunset")} </md-option>
									<md-option value="dusk"> ${RED._("time-scheduler.ui.dusk")} </md-option>
									<md-option value="nauticalDusk"> ${RED._("time-scheduler.ui.nauticalDusk")} </md-option>
									<md-option value="night"> ${RED._("time-scheduler.ui.night")} </md-option>
									<md-option value="nadir"> ${RED._("time-scheduler.ui.nadir")} </md-option>
									<md-option value="nightEnd"> ${RED._("time-scheduler.ui.nightEnd")} </md-option>
									<md-option value="nauticalDawn"> ${RED._("time-scheduler.ui.nauticalDawn")} </md-option>
									<md-option value="dawn"> ${RED._("time-scheduler.ui.dawn")} </md-option>
								</md-select>
							</md-input-container>
							<md-input-container flex="" ng-if="formtimer.starttype!='custom'">
								<label style="color: var(--nr-dashboard-widgetTextColor)">Offset (min)</label>
								<input type="number" ng-model="formtimer.startOffset" ng-change="offsetValidation('start')">
							</md-input-container>
						</div>
						<div layout="row" style="height: 50px;">
							<md-input-container flex="55" ng-if="!${config.eventMode}">
								<label style="color: var(--nr-dashboard-widgetTextColor)">Endtype</label>
								<md-select class="nr-dashboard-dropdown" ng-model="formtimer.endtype" ng-change="updateSolarLabels()">
									<md-option value="custom" selected> ${RED._("time-scheduler.ui.custom")} </md-option>
									<md-option value="sunrise"> ${RED._("time-scheduler.ui.sunrise")} </md-option>
									<md-option value="sunriseEnd"> ${RED._("time-scheduler.ui.sunriseEnd")} </md-option>
									<md-option value="goldenHourEnd"> ${RED._("time-scheduler.ui.goldenHourEnd")} </md-option>
									<md-option value="solarNoon"> ${RED._("time-scheduler.ui.solarNoon")} </md-option>
									<md-option value="goldenHour"> ${RED._("time-scheduler.ui.goldenHour")} </md-option>
									<md-option value="sunsetStart"> ${RED._("time-scheduler.ui.sunsetStart")} </md-option>
									<md-option value="sunset"> ${RED._("time-scheduler.ui.sunset")} </md-option>
									<md-option value="dusk"> ${RED._("time-scheduler.ui.dusk")} </md-option>
									<md-option value="nauticalDusk"> ${RED._("time-scheduler.ui.nauticalDusk")} </md-option>
									<md-option value="night"> ${RED._("time-scheduler.ui.night")} </md-option>
									<md-option value="nadir"> ${RED._("time-scheduler.ui.nadir")} </md-option>
									<md-option value="nightEnd"> ${RED._("time-scheduler.ui.nightEnd")} </md-option>
									<md-option value="nauticalDawn"> ${RED._("time-scheduler.ui.nauticalDawn")} </md-option>
									<md-option value="dawn"> ${RED._("time-scheduler.ui.dawn")} </md-option>
								</md-select>
							</md-input-container>
							<md-input-container flex="" ng-if="!${config.eventMode} && formtimer.endtype!='custom'">
								<label style="color: var(--nr-dashboard-widgetTextColor)">Offset (min)</label>
								<input type="number" ng-model="formtimer.endOffset" ng-change="offsetValidation('end')">
							</md-input-container>
						</div>
						<div layout="row" layout-align="space-between end" style="height: 50px;">
							<md-button style="margin: 1px;" aria-label="suntimer" ng-click="showSunSettings=!showSunSettings"> <md-icon> arrow_back </md-icon> </md-button>
						</div>
					</div>
				</form>
				<div ng-show="loading" layout="row" layout-align="center center" style="width:100%; position: absolute; z-index:10; opacity: 0.9; height:150px; background-color: var(--nr-dashboard-widgetColor);">
					<md-progress-circular md-mode="indeterminate"></md-progress-circular>
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
			if (ui === undefined) {
				ui = RED.require("node-red-dashboard")(RED);
			}

			RED.nodes.createNode(this, config);
			const node = this;

			// START check props
			if (!config.hasOwnProperty("refresh")) config.refresh = 60;
			if (!config.hasOwnProperty("startDay")) config.startDay = 0;
			if (!config.hasOwnProperty("height") || config.height == 0) config.height = 1;
			if (!config.hasOwnProperty("name") || config.name === "") config.name = "Time-Scheduler";
			if (!config.hasOwnProperty("devices") || config.devices.length === 0) config.devices = [config.name];
			if (!config.hasOwnProperty("eventOptions")) config.eventOptions = [{ label: RED._("time-scheduler.label.on"), event: "true" }, { label: RED._("time-scheduler.label.off"), event: "false" }];
			// END check props
			config.i18n = RED._("time-scheduler.ui", { returnObjects: true });
			config.solarEventsEnabled = ((config.lat !== "" && isFinite(config.lat) && Math.abs(config.lat) <= 90) && (config.lon !== "" && isFinite(config.lon) && Math.abs(config.lon) <= 180)) ? true : false;

			if (checkConfig(config, node)) {
				const done = ui.addWidget({
					node: node,
					format: HTML(config),
					templateScope: "local",
					group: config.group,
					width: config.width,
					height: Number(config.height) + 3,
					order: config.order,
					emitOnlyNewValues: false,
					forwardInputMessages: false,
					storeFrontEndInputAsState: true,
					persistantFrontEndValue: true,
					beforeEmit: function(msg, value) {
						if (msg.hasOwnProperty("disableDevice")) {
							if (addDisabledDevice(msg.disableDevice)) {
								node.status({ fill: "green", shape: "ring", text: msg.disableDevice + " " + RED._("time-scheduler.disabled") });
								msg.payload = serializeData();
								node.send(msg);
							}
						} else if (msg.hasOwnProperty("enableDevice")) {
							if (removeDisabledDevice(msg.enableDevice)) {
								node.status({ fill: "green", shape: "dot", text: msg.enableDevice + " " + RED._("time-scheduler.enabled") });
								msg.payload = serializeData();
								node.send(msg);
							}
						} else if (msg.hasOwnProperty("getStatus")) {
							msg.payload = serializeData();
							node.send(msg);
							return msg;
						} else {
							try {
								const parsedInput = JSON.parse(value);

								const parsedTimers = parsedInput.timers;
								if (validateTimers(parsedTimers)) {
									node.status({ fill: "green", shape: "dot", text: "time-scheduler.payloadReceived" });
									setTimers(parsedTimers.filter(timer => timer.output < config.devices.length));
								} else {
									node.status({ fill: "yellow", shape: "dot", text: "time-scheduler.invalidPayload" });
								}

								if (parsedInput.settings) setSettings(parsedInput.settings);
							} catch (e) {
								node.status({ fill: "red", shape: "dot", text: e.toString() });
							}
						}

						return { msg: [msg] };
					},
					beforeSend: function(msg, orig) {
						node.status({});
						if (orig && orig.msg[0]) {
							setTimers(orig.msg[0].payload.timers);
							setSettings(orig.msg[0].payload.settings);
							const sendMsg = JSON.parse(JSON.stringify(orig.msg));
							sendMsg[0].payload = serializeData();
							addOutputValues(sendMsg);
							return sendMsg;
						}
					},
					initController: function($scope) {
						$scope.init = function(config) {
							$scope.nodeId = config.id;
							$scope.i18n = config.i18n;
							$scope.days = config.i18n.days;
							$scope.devices = config.devices;
							$scope.myDeviceSelect = $scope.devices.length > 1 ? "overview" : "0";
							$scope.eventMode = config.eventMode;
							$scope.eventOptions = config.eventOptions;
						}

						$scope.$watch('msg', function() {
							$scope.getTimersFromServer();
						});

						$scope.toggleViews = function() {
							$scope.isEditMode ? $scope.showStandardView() : $scope.showAddView();
						}

						$scope.showStandardView = function() {
							$scope.isEditMode = false;
							$scope.getElement("timersView").style.display = "block";
							$scope.getElement("messageBoard").style.display = "none";
							$scope.getElement("overview").style.display = "none";
							$scope.getElement("addTimerView").style.display = "none";

							if (!$scope.timers) {
								$scope.getElement("timersView").style.display = "none";

								const msgBoard = $scope.getElement("messageBoard");
								msgBoard.style.display = "block";
								msgBoard.firstElementChild.innerHTML = $scope.i18n.payloadWarning;
							} else if ($scope.myDeviceSelect === "overview") {
								$scope.getElement("timersView").style.display = "none";
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
							$scope.showSunSettings = false;
							$scope.getElement("timersView").style.display = "none";
							$scope.getElement("messageBoard").style.display = "none";
							$scope.getElement("addTimerView").style.display = "block";
							$scope.formtimer = {
								index: timerIndex,
								dayselect: [],
								starttype: "custom",
								endtype: "custom",
							};

							if (timerIndex === undefined) {
								const today = new Date();
								if (today.getHours() == "23" && today.getMinutes() >= "54") today.setMinutes(53);
								const start = new Date(today.getFullYear(), today.getMonth(), today.getDay(), today.getHours(), today.getMinutes() + 1, 0);
								$scope.getElement("timerStarttime").value = $scope.formatTime(start.getHours(), start.getMinutes());
								if ($scope.eventMode) $scope.formtimer.timerEvent = $scope.eventOptions.length > 0 ? $scope.eventOptions[0].event : "true";
								else {
									const end = new Date(today.getFullYear(), today.getMonth(), today.getDay(), today.getHours(), today.getMinutes() + 6, 0);
									$scope.getElement("timerEndtime").value = $scope.formatTime(end.getHours(), end.getMinutes());
								}
								$scope.formtimer.dayselect.push(today.getDay());
								$scope.formtimer.disabled = false;
							} else {
								const timer = $scope.timers[timerIndex];
								if (timer.hasOwnProperty("startSolarEvent")) $scope.formtimer.starttype = timer.startSolarEvent;
								if (timer.hasOwnProperty("startSolarOffset")) $scope.formtimer.startOffset = timer.startSolarOffset;
								if (timer.hasOwnProperty("endSolarEvent")) $scope.formtimer.endtype = timer.endSolarEvent;
								if (timer.hasOwnProperty("startSolarOffset")) $scope.formtimer.endOffset = timer.endSolarOffset;
								$scope.updateSolarLabels();
								const start = new Date(timer.starttime);
								$scope.getElement("timerStarttime").value = $scope.formatTime(start.getHours(), start.getMinutes());
								if ($scope.eventMode) $scope.formtimer.timerEvent = timer.event;
								else {
									const end = new Date(timer.endtime);
									$scope.getElement("timerEndtime").value = $scope.formatTime(end.getHours(), end.getMinutes());
								}
								for (let i = 0; i < timer.days.length; i++) {
									if (timer.days[$scope.localDayToUtc(timer, i)]) $scope.formtimer.dayselect.push(i);
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
								days: [0, 0, 0, 0, 0, 0, 0],
								output: $scope.myDeviceSelect
							};

							if ($scope.formtimer.starttype !== "custom") {
								timer.startSolarEvent = $scope.formtimer.starttype;
								timer.startSolarOffset = $scope.formtimer.startOffset;
							}

							if ($scope.eventMode) {
								timer.event = $scope.formtimer.timerEvent;
								if (timer.event === "true" || timer.event === true) {
									timer.event = true;
								} else if (timer.event === "false" || timer.event === false) {
									timer.event = false;
								} else if (!isNaN(timer.event) && (timer.event === "0" || (timer.event + "").charAt(0) != "0")) {
									timer.event = Number(timer.event);
								}
							} else {
								const endInput = $scope.getElement("timerEndtime").value.split(":");
								let endtime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endInput[0], endInput[1], 0, 0).getTime();

								if ($scope.formtimer.endtype !== "custom") {
									timer.endSolarEvent = $scope.formtimer.endtype;
									timer.endSolarOffset = $scope.formtimer.endOffset;
								}

								if ($scope.formtimer.starttype === "custom" && $scope.formtimer.endtype === "custom" && $scope.diff(starttime, endtime) < 1) {
									if (confirm($scope.i18n.alertTimespan)) endtime += 24 * 60 * 60 * 1000;
									else return;
								} else if ($scope.formtimer.starttype !== "custom" && $scope.formtimer.endtype !== "custom") {
									if (timer.startSolarEvent === timer.endSolarEvent && (timer.startSolarOffset || 0) >= (timer.endSolarOffset || 0)) {
										alert($scope.i18n.alertTimespanDay);
										return;
									}
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
								$scope.timers.splice(timerIndex, 1, timer);
							}

							$scope.sendTimersToOutput();
						}

						$scope.deleteTimer = function() {
							$scope.timers.splice($scope.formtimer.index, 1);
							$scope.sendTimersToOutput();
						}

						$scope.sendTimersToOutput = function() {
							if (!$scope.msg) $scope.msg = [{ payload: "" }];
							$scope.msg[0].payload = {
								timers: angular.copy($scope.timers),
								settings: {
									disabledDevices: angular.copy($scope.disabledDevices),
									overviewFilter: angular.copy($scope.overviewFilter)
								}
							};
							$scope.send([$scope.msg[0]]);
						}

						$scope.daysChanged = function() {
							if ($scope.formtimer.dayselect.length === 8) {
								$scope.formtimer.dayselect = [];
							} else if ($scope.formtimer.dayselect.includes('all')) {
								$scope.formtimer.dayselect = [0, 1, 2, 3, 4, 5, 6];
							};
						}

						$scope.minutesToReadable = function(minutes) {
							return (Math.floor(minutes / 60) > 0 ? Math.floor(minutes / 60) + "h " : "") + (minutes % 60 > 0 ? minutes % 60 + "m" : "");
						}

						$scope.eventToEventLabel = function(event) {
							const option = $scope.eventOptions.find(o => { return o.event === event.toString() });
							return option ? option.label : event;
						}

						$scope.millisToTime = function(millis) {
							const date = new Date(millis);
							return $scope.formatTime(date.getHours(), date.getMinutes());
						}

						$scope.formatTime = function(hours, minutes) {
							return $scope.padZero(hours) + ":" + $scope.padZero(minutes);
						}

						$scope.updateSolarLabels = function() {
							const startOffset = $scope.formtimer.startOffset > 0 ? "+" + $scope.formtimer.startOffset : ($scope.formtimer.startOffset || 0);
							const startTypeLabel = startOffset === 0 ? $scope.i18n[$scope.formtimer.starttype] : $scope.i18n[$scope.formtimer.starttype].substr(0, 8);
							$scope.formtimer.solarStarttimeLabel = startTypeLabel + (startOffset != 0 ? " " + startOffset + "m" : "");
							const endOffset = $scope.formtimer.endOffset > 0 ? "+" + $scope.formtimer.endOffset : ($scope.formtimer.endOffset || 0);
							const endTypeLabel = endOffset === 0 ? $scope.i18n[$scope.formtimer.endtype] : $scope.i18n[$scope.formtimer.endtype].substr(0, 8);
							$scope.formtimer.solarEndtimeLabel = endTypeLabel + (endOffset != 0 ? " " + endOffset + "m" : "");
						}

						$scope.offsetValidation = function(type) {
							if (type === "start") {
								if ($scope.formtimer.startOffset > 300) $scope.formtimer.startOffset = 300;
								if ($scope.formtimer.startOffset < -300) $scope.formtimer.startOffset = -300;
							} else if (type === "end") {
								if ($scope.formtimer.endOffset > 300) $scope.formtimer.endOffset = 300;
								if ($scope.formtimer.endOffset < -300) $scope.formtimer.endOffset = -300;
							}
							$scope.updateSolarLabels();
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
							return i < 10 ? "0" + i : i;
						}

						$scope.diff = function(startDate, endDate) {
							let diff = endDate - startDate;
							const hours = Math.floor(diff / 1000 / 60 / 60);
							diff -= hours * 1000 * 60 * 60;
							const minutes = Math.floor(diff / 1000 / 60);

							return (hours * 60) + minutes;
						}

						$scope.getElement = function(elementId) {
							return document.querySelector("#" + elementId + "-" + $scope.nodeId.replace(".", ""));
						}

						$scope.changeFilter = function(filter) {
							$scope.overviewFilter = filter;
							$scope.sendTimersToOutput();
						}

						$scope.getTimersByOverviewFilter = function() {
							if ($scope.overviewFilter == 'all') return $scope.timers;
							return $scope.timers ? $scope.timers.filter(t => !t.disabled && $scope.isDeviceEnabled(t.output)) : [];
						}

						$scope.toggleDeviceStatus = function(deviceIndex) {
							if ($scope.isDeviceEnabled(deviceIndex)) {
								$scope.disabledDevices = $scope.disabledDevices || [];
								$scope.disabledDevices.push(deviceIndex);
							} else {
								$scope.disabledDevices.splice($scope.disabledDevices.indexOf(deviceIndex), 1);
							}
							$scope.sendTimersToOutput();
						}

						$scope.isDeviceEnabled = function(deviceIndex) {
							const disabledDevices = $scope.disabledDevices || [];
							return !disabledDevices.includes(deviceIndex.toString());
						}

						$scope.getTimersFromServer = function() {
							$.ajax({
								url: "time-scheduler/getNode/" + $scope.nodeId, dataType: 'json',
								beforeSend: function() {
									$scope.loading = true;
								},
								success: function(json) {
									$scope.timers = json.timers;
									$scope.disabledDevices = json.settings.disabledDevices;
									$scope.overviewFilter = json.settings.overviewFilter;
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
				let prevMsg = [];

				(() => {
					let timers = getContextValue('timers');
					if (validateTimers(timers)) {
						node.status({});
						timers = timers.filter(timer => timer.output < config.devices.length);
					} else {
						node.status({ fill: "green", shape: "dot", text: "time-scheduler.contextCreated" });
						timers = [];
					}
					setTimers(timers);
					createInitTimeout();
				})();

				function validateTimers(timers) {
					return Array.isArray(timers) && timers.every(element => {
						if ((!element.hasOwnProperty("starttime") || !element.hasOwnProperty("days")) ||
							(!config.eventMode && !element.hasOwnProperty("endtime")) ||
							(config.eventMode && !element.hasOwnProperty("event"))) return false;

						if (!element.hasOwnProperty("output")) element.output = "0";
						else if (Number.isInteger(element.output)) element.output = element.output.toString();

						return true;
					});
				}

				function getContextValue(key) {
					return config.customContextStore && RED.settings.contextStorage && RED.settings.contextStorage.hasOwnProperty(config.customContextStore) ?
						node.context().get(key, config.customContextStore) : node.context().get(key);
				}

				function setContextValue(key, value) {
					config.customContextStore && RED.settings.contextStorage && RED.settings.contextStorage.hasOwnProperty(config.customContextStore) ?
						node.context().set(key, value, config.customContextStore) : node.context().set(key, value);
				}

				function getTimers() {
					const timers = getContextValue('timers') || [];
					return updateSolarEvents(timers).sort(function(a, b) {
						const millisA = getNowWithCustomTime(a.starttime);
						const millisB = getNowWithCustomTime(b.starttime);
						return millisA - millisB;
					});
				}

				function setTimers(timers) {
					setContextValue('timers', timers);
				}

				function getSettings() {
					return getContextValue('settings') || {};
				}

				function setSettings(settings) {
					setContextValue('settings', settings);
				}

				function getDisabledDevices() {
					return getSettings().disabledDevices || [];
				}

				function setDisabledDevices(disabledDevices) {
					setSettings({ ...getSettings(), disabledDevices });
				}

				function addDisabledDevice(device) {
					const disabledDevices = getDisabledDevices();
					const deviceIndex = (isNaN(device) ? config.devices.indexOf(device) : device).toString();
					if (deviceIndex >= 0 && config.devices.length > deviceIndex && !disabledDevices.includes(deviceIndex)) {
						disabledDevices.push(deviceIndex);
						setDisabledDevices(disabledDevices);
						return true;
					}
					return false;
				}

				function removeDisabledDevice(device) {
					const disabledDevices = getDisabledDevices();
					const deviceIndex = (isNaN(device) ? config.devices.indexOf(device) : device).toString();
					if (deviceIndex >= 0 && config.devices.length > deviceIndex && disabledDevices.includes(deviceIndex)) {
						disabledDevices.splice(disabledDevices.indexOf(deviceIndex), 1);
						setDisabledDevices(disabledDevices);
						return true;
					}
					return false;
				}

				function createInitTimeout() {
					const today = new Date();
					const remaining = config.refresh - (today.getSeconds() % config.refresh);
					setTimeout(function() {
						nodeInterval = setInterval(intervalTimerFunction, config.refresh * 1000);
						intervalTimerFunction();
					}, (remaining * 1000) - today.getMilliseconds());
				}

				function intervalTimerFunction() {
					const outputValues = [null];
					addOutputValues(outputValues);
					node.send(outputValues);
				}

				function addOutputValues(outputValues) {
					for (let device = 0; device < config.devices.length; device++) {
						const msg = { payload: isInTime(device) };
						if (config.sendTopic) msg.topic = config.devices[device];
						msg.payload != null ? outputValues.push(msg) : outputValues.push(null);
					}
					if (config.onlySendChange) removeUnchangedValues(outputValues);
				}

				function removeUnchangedValues(outputValues) {
					const currMsg = JSON.parse(JSON.stringify(outputValues));
					for (let i = 1; i <= config.devices.length; i++) {
						if (prevMsg[i] && currMsg[i] && (prevMsg[i].payload === currMsg[i].payload)) {
							outputValues[i] = null;
						}
					}
					prevMsg = currMsg;
				}

				function isInTime(deviceIndex) {
					const nodeTimers = getTimers();
					let status = null;

					if (nodeTimers.length > 0 && !getDisabledDevices().includes(deviceIndex.toString())) {
						const date = new Date();

						nodeTimers.filter(timer => timer.output == deviceIndex).forEach(function(timer) {
							if (status != null) return;
							if (timer.hasOwnProperty("disabled")) return;

							const utcDay = localDayToUtc(timer, date.getDay());
							const localStarttime = new Date(timer.starttime);
							const localEndtime = config.eventMode ? localStarttime : new Date(timer.endtime);
							const daysDiff = localEndtime.getDay() - localStarttime.getDay();

							if (daysDiff != 0) {
								// WRAPS AROUND MIDNIGHT (SERVER PERSPECTIVE)
								const utcYesterday = utcDay - 1 < 0 ? 6 : utcDay - 1;
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
								} else if (compareDate.getTime() == localEndtime.getTime()) {
									status = false;
								}
							}
						});
					}

					if (!config.eventMode && !config.singleOff && status == null) status = false;
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

				function getNowWithCustomTime(timeInMillis) {
					const date = new Date();
					const origDate = new Date(timeInMillis);
					date.setHours(origDate.getHours());
					date.setMinutes(origDate.getMinutes());
					date.setSeconds(0); date.setMilliseconds(0);
					return date.getTime();
				}

				function updateSolarEvents(timers) {
					if (config.solarEventsEnabled) {
						const sunTimes = sunCalc.getTimes(new Date(), config.lat, config.lon);
						return timers.map(t => {
							if (t.hasOwnProperty("startSolarEvent")) {
								const offset = t.startSolarOffset || 0;
								const solarTime = sunTimes[t.startSolarEvent];
								t.starttime = solarTime.getTime() + (offset * 60 * 1000);
							}
							if (t.hasOwnProperty("endSolarEvent")) {
								const offset = t.endSolarOffset || 0;
								const solarTime = sunTimes[t.endSolarEvent];
								t.endtime = solarTime.getTime() + (offset * 60 * 1000);
							}
							if (t.hasOwnProperty("startSolarEvent") || t.hasOwnProperty("endSolarEvent")) {
								if (t.starttime >= t.endtime) t.endtime += 24 * 60 * 60 * 1000;
							}
							return t;
						});
					} else {
						return timers.filter(t => !t.hasOwnProperty("startSolarEvent") && !t.hasOwnProperty("endSolarEvent"));
					}
				}

				function getNodeData() {
					return { timers: getTimers(), settings: getSettings() };
				}

				function serializeData() {
					return JSON.stringify(getNodeData());
				}

				node.nodeCallback = function nodeCallback(req, res) {
					res.send(getNodeData());
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
		} catch (error) {
			console.log("TimeSchedulerNode:", error);
		}
	}
	RED.nodes.registerType("ui_time_scheduler", TimeSchedulerNode);

	let uiPath = ((RED.settings.ui || {}).path);
	if (uiPath == undefined) uiPath = 'ui';
	let nodePath = '/' + uiPath + '/time-scheduler/getNode/:nodeId';
	nodePath = nodePath.replace(/\/+/g, '/');

	RED.httpNode.get(nodePath, function(req, res) {
		const nodeId = req.params.nodeId;
		const node = RED.nodes.getNode(nodeId);
		node ? node.nodeCallback(req, res) : res.send(404).end();
	});
}