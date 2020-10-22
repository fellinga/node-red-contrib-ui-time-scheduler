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
		if (!config.refresh || config.refresh < 1) config.refresh = 60;
		
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
			<div layout="row" layout-align="space-between center">
				<span flex=""> ` + config.name + ` </span>
				<span flex="15">
					<md-button id="addTimerBtn-` + uniqueId + `" style="width: 100%;" aria-label="Add" ng-click="toggleViews()"> </md-button>
				</span>
			</div>
			<div id="messageBoard-` + uniqueId + `" style="display:none;"> <p> </p> </div>
			<div id="timersView-` + uniqueId + `" style="margin-top: 4px;">
				<table style="width: 100%; border-spacing: 0px;">
				<tbody>
					<tr ng-repeat-start="timer in timers track by $index" ng-click="showAddView($index)" class="timerhead-` + uniqueId + `">
						<th> # </th>
						<th colspan="2"> Start </th>
						<th colspan="2"> End </th>
						<th colspan="2"> Runtime </th>
					</tr>
					<tr ng-click="showAddView($index)">
						<td> {{$index+1}} </td>
						<td colspan="2"> {{millisToTime(timer.starttime)}} </td>
						<td colspan="2"> {{millisToTime(timer.endtime)}} </td>
						<td colspan="2"> {{minutesToReadable(diff(timer.starttime,timer.endtime))}} </td>
					</tr> 
					<tr ng-click="showAddView($index)">
						<td ng-repeat="day in days" ng-init="dayIndex=$index" style="width:14%;margin: 0 2%;"> 
							<div class="weekDay-` + uniqueId + ` {{(timer.days[dayIndex]) ? 'weekDayActive-` + uniqueId + `' : ''}}"">
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
							<label style="color: #ffffff">Starttime</label>
							<input id="timerStarttime-` + uniqueId + `" ng-model="timerStarttime" type="time" required>
							<span class="validity"></span>
						</md-input-container>
						<md-input-container flex="50">
							<label style="color: #ffffff">Endtime</label>
							<input id="timerEndtime-` + uniqueId + `" ng-model="timerEndtime" type="time" required>
							<span class="validity"></span>
						</md-input-container>
					</div>
					<div layout="row" style="max-height: 60px;">
						<md-input-container>
							<label style="color: #ffffff">Select active days</label>
							<md-select multiple="true" placeholder="Select active days" ng-model="myMultipleSelect">
								<md-option ng-repeat="day in days" value={{$index}}> {{days[$index]}}  </md-option>
							</md-select>
						</md-input-container>
					</div>
					<div layout="row" layout-align="space-between end" style="height: 40px;">
						<md-button ng-click="deleteTimer()" ng-show="hiddenTimerIndex !== undefined"> Delete </md-button>
						<span ng-show="hiddenTimerIndex === undefined"> </span>
						<md-button type="submit"> Save </md-button>
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

						return {msg: msg};
					},
					beforeSend: function (msg, orig) {
						if (orig && orig.msg[0]) {
							nodeTimers = orig.msg[0].payload;
							orig.msg[0].payload = JSON.stringify({timers : orig.msg[0].payload});
							orig.msg[1] = {payload: isInTime() };
							return orig.msg;
						}
					},
					initController: function ($scope) {
						$scope.init = function (config) {
							$scope.timeschedulerid = config.id.replace(".", "");
							$scope.days = ['SU','MO','TU','WE','TH','FR','SA'];
						}

						$scope.$watch('msg', function(msg) {
							// msg after beforeEmit (noJSON) -> from input 
							if (msg && msg.payload) {
								$scope.timers = angular.copy(msg.payload);
							// msg turnes into an array after hitting F5 or switching tabs
							} else if (msg && msg[0] && msg[0].payload) {
								// page refresh (F5) sends the msg object that was created after beforeSend (JSON)
								// switching tabs sends the last known msg object (noJSON)
								const data = angular.fromJson(msg[0].payload).timers;
								if (data !== undefined) {
									$scope.msg[0].payload = data;
								}
								// since the msg is an array now -> map back to single msg object
								$scope.msg = $scope.msg[0];
							// no payload received at all and timers not defined
							} else if (!$scope.timers) {
								$scope.msg = {payload : []};
							}
							$scope.showStandardView();
						});

						$scope.toggleViews = function() {
							if ($scope.getElement("addTimerView").style.display === "block") {
								$scope.showStandardView();
							} else {
								$scope.showAddView();
							}
						}

						$scope.showStandardView = function() {
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
								msgBoard.firstElementChild.innerHTML = "Invalid or no payload provided.";								
							} else if ($scope.timers.length === 0) {
								$scope.getElement("timersView").style.display = "none";

								let msgBoard = $scope.getElement("messageBoard");
								msgBoard.style.display = "block";
								msgBoard.firstElementChild.innerHTML = "Nothing planned yet. Click the plus sign to add a new timer.";
							}
						}

						$scope.showAddView = function(timerIndex) {
							$scope.getElement("addTimerBtn").innerHTML = "X";
							$scope.getElement("timersView").style.display = "none";
							$scope.getElement("messageBoard").style.display = "none";
							$scope.getElement("addTimerView").style.display = "block";
							$scope.hiddenTimerIndex = timerIndex;
							$scope.myMultipleSelect = [];
							
							if (timerIndex === undefined) {
								const today = new Date();
								$scope.timerStarttime = new Date(1970, 0, 1, today.getHours(), today.getMinutes()+1, 0);
								$scope.timerEndtime = new Date(1970, 0, 1, today.getHours(), today.getMinutes()+6, 0);
								$scope.myMultipleSelect.push(today.getDay());
							} else {
								const timer = $scope.timers[timerIndex];						
								$scope.timerStarttime = new Date(timer.starttime);
								$scope.timerEndtime = new Date(timer.endtime);
								for (let [index, val] of timer.days.entries()) {
									val === 1 ? $scope.myMultipleSelect.push(index) : "";
								}
							}
						}

						$scope.addTimer = function() {
							const starttime = $scope.timerStarttime.getTime();
							const endtime = $scope.timerEndtime.getTime();

							if ($scope.diff(starttime, endtime) < 1) {
								alert(	"Incorrect settings detected!" + '\n' +  
										"- at least 1 minute" + '\n' + 
										"- must not exceed midnight"  
							  	);
								return;
							}

							const timer = {
								starttime: starttime,
								endtime: endtime,
								days : [0,0,0,0,0,0,0],
							};

							$scope.myMultipleSelect.forEach(day => {
								timer.days[day] = 1;
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
							$scope.msg.payload = angular.copy($scope.timers);
							$scope.send([$scope.msg,null]);
						}

						$scope.minutesToReadable = function(minutes) {
							return (Math.floor(minutes/60) > 0 ? Math.floor(minutes/60) + "h " : "") + minutes%60 + "m";
						}

						$scope.millisToTime = function(millis) {
							return $scope.padZero(new Date(millis).getHours()) + ":" + $scope.padZero(new Date(millis).getMinutes()); 
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
							return document.querySelector("#" + elementId + "-" + $scope.timeschedulerid);
						}
					}
				});

				var nodeInterval = setInterval(function() {
					node.send([null, {payload: isInTime() }]);
				}, config.refresh * 1000);

				function isInTime() {
					let status = false;

					if (nodeTimers.length > 0) {
						const today = new Date();
						const now = new Date(1970, 0, 1, today.getHours(), today.getMinutes(), 0).getTime();
						
						nodeTimers.forEach(function (timer) {
							if (timer.days[today] === 0 || status) return;

							if (now >= timer.starttime && now < timer.endtime) {
								status = true;
							}
						});
					}

					return status;
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
}