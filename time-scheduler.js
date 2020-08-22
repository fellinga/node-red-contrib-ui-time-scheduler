module.exports = function(RED) {
	'use strict';

	function HTML(config) {
		if (config.height == 0) config.height = 3;
		var configAsJson = JSON.stringify(config);
	
		var html = String.raw`
		<div id="timescheduler-` + config.id + `" ng-init='init(` + configAsJson + `)'  style="height: ` + config.height*50 + `px">
			<div style="margin-bottom: 10px;">
				<select id="select" ng-model="select" ng-change="changedValue(select)" ng-options="day for day in days" style="width: 70%; height: 36px;"> </select>
				<button id="editScheduleBtn" style="float: right; width: 20%;" class="md-button" ng-click="updateView()"> Edit </button>
			</div>
			<div id="seeSchedule">
			</div>
			<div id="changeSchedule" style="display:none;">
				<table class="table table-striped">
					<tbody>
						<tr ng-repeat="n in msg.payload[0] track by $index" ng-init='hour=$index'>
							<td ng-click="click(hour,4)">{{padZero(hour)}}:</td>
							<td ng-click="click(hour,quarter)" ng-repeat="q in msg.payload[0][0] track by $index" ng-init='quarter=$index' bgcolor="{{((msg.payload[selectedDay][hour][quarter] || 0) === 0) ? '` + config.bgcolor + `' : '` + config.bgactivecolor + `'}}"  align="center" width="25%">
								{{padZero(quarter*15)}}-{{(quarter+1)*15}}
							</td>
						</tr> 
					</tbody>
				</table>
				<div style="margin-top: 10px;">
					<span style="line-height: 36px;">  <input type="checkbox" ng-model="checkbox" ng-init="checkbox = checkbox || false"> Apply {{select}} to all days </span>
					<button style="float: right;" class="md-button" ng-click="saveSched()"> Save </button>
				</div>
			</div>
		</div>
		`;
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
			let mySchedule = [];
			
			if (checkConfig(config, node)) {
				var done = ui.addWidget({
					node: node,
					format: HTML(config),
					templateScope: "local",
					group: config.group,
					order: config.order,
					emitOnlyNewValues: false,
					forwardInputMessages: false,
					storeFrontEndInputAsState: false,
					beforeEmit: function (msg, value) {
						if (msg.create) {
							delete msg.create;
							msg.payload = new Array(7);
							for (var i = 0; i < 7; i++) {
								msg.payload[i] = new Array(24);
								for (var j = 0; j < 24; j++) {
									msg.payload[i][j] = new Array(4);
									for (var k = 0; k < 4; k++) {
										msg.payload[i][j][k] = 0;
									}
								}
							}
							node.status({fill:"yellow",shape:"ring",text:"New schedule created"});
							mySchedule = msg.payload;
						} else if(Array.isArray(msg.payload) && Array.isArray(msg.payload[6][23])) {
							node.status({fill:"green",shape:"ring",text:"Received schedule"});
							mySchedule = msg.payload;
						} else {
							node.status({fill:"red",shape:"ring",text:"Invalid msg.payload"});
							msg.payload = null;
						}
						
						return {msg: msg};
					},
					beforeSend: function (msg, orig) {
						if (orig) {
							mySchedule = orig.msg[0].payload;
							return orig.msg;
						}
					},
					initController: function ($scope) {
						$scope.init = function (config) {
							$scope.timeschedulerid = "timescheduler-".concat(config.id);

							if (!config.initday) {
								var today = new Date();
								config.initday = today.getDay();
							}

							$scope.days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
							$scope.selectedDay = config.initday;
							$scope.select = $scope.days[$scope.selectedDay];
						}

						$scope.$watch('msg', function(msg) {
							$scope.printScheduleTable();
						});

						// Update preview
						$scope.printScheduleTable = function() {
							var div = $scope.getElement("seeSchedule");
							div.innerHTML = '';

							if (!$scope.msg || !$scope.msg.payload) {
								$scope.getElement("editScheduleBtn").disabled = true;
								$scope.getElement("select").disabled = true;

								var noPayload = document.createElement('p');
								noPayload.innerHTML = "Invalid or no payload provided.";
								div.append(noPayload);
							} else {
								$scope.getElement("editScheduleBtn").disabled = false;
								$scope.getElement("select").disabled = false;

								var hours = [0,15,30,45];
								var value = 0;
								var oldValue = 0;
								var found = 0;
								var schedules = [];
	
								for (var i = 0; i < 24; i ++) {
									for (var j = 0; j < 4; j ++) {
										value = $scope.msg.payload[$scope.selectedDay][i][j];
										if (value != oldValue)
											schedules[found++] = $scope.padZero(i) + ":" + $scope.padZero(hours[j]);
	
										oldValue = value;
	
										// cornercase: end of the day
										if (i === 23 && j === 3 && oldValue === 1)
											schedules[found++] = "24:00";
									}
								}
	
								if (found == 0) {
									var p = document.createElement('p');
									p.innerHTML = "Nothing planned for " + $scope.days[$scope.selectedDay] + ". Click edit to modify the schedule.";
									div.append(p);
								} else {
									var table = document.createElement('table');
									table.setAttribute('class', "table table-striped");
									table.setAttribute('width', "100%");
									var tbody = document.createElement('tbody');
									table.append(tbody);
									div.append(table);
	
									var tr = document.createElement('tr');
									var th0 = document.createElement('th');
									var th1 = document.createElement('th');
									th0.appendChild(document.createTextNode("From"));
									th1.appendChild(document.createTextNode("To"));
									tr.append(th0);
									tr.append(th1);
									tbody.append(tr);
		
									for (var i = 0; i < found; i = i+2) {
										var tr = document.createElement('tr');
										var from = document.createElement('td');
										var to = document.createElement('td');
										from.appendChild(document.createTextNode(schedules[i]));
										from.setAttribute('width', "50%");
										from.style.textAlign = "center";
										to.appendChild(document.createTextNode(schedules[i+1]));
										to.setAttribute('width', "50%");
										to.style.textAlign = "center";
										tr.append(from);
										tr.append(to);
										tbody.append(tr);
									}
								}
							}
							
											
						}

						// Clicked edit
						$scope.updateView = function() {
							var x = $scope.getElement("seeSchedule");
							var y = $scope.getElement("changeSchedule");

							if (x.style.display === "none") {
							  y.style.display = "none";
							  x.style.display = "block";
							  $scope.getElement("editScheduleBtn").innerHTML = "Edit";
							} else {
							  x.style.display = "none";
							  y.style.display = "block";
							  $scope.getElement("editScheduleBtn").innerHTML = "X";
							}
						}
						
						// Clicked on a cell
						$scope.click = function(hour, quarter) {
							// clicked hour, so apply to whole row
							if (quarter == $scope.msg.payload[0][0].length) {
								var num = $scope.msg.payload[$scope.selectedDay][hour][0];
								for (var i = 0; i < $scope.msg.payload[0][0].length; i++) {
									$scope.msg.payload[$scope.selectedDay][hour][i] = 1 - num;
								}
							// apply to single cell only
							} else {
								var num = $scope.msg.payload[$scope.selectedDay][hour][quarter];
								$scope.msg.payload[$scope.selectedDay][hour][quarter] = 1 - num;
							}
						}
						
						// Changed weekday
						$scope.changedValue = function(value) {
							$scope.selectedDay = $scope.days.indexOf(value);
							$scope.printScheduleTable();
						}
						
						// Clicked save
						$scope.saveSched = function() {
							// if checkbox checked apply selectedDay to all days
							if ($scope.checkbox) {
								for (var i = 0; i < $scope.msg.payload.length; i++) {
									for (var j = 0; j < $scope.msg.payload[0].length; j++) {
										for (var k = 0; k < $scope.msg.payload[0][0].length; k++) {
											var value = $scope.msg.payload[$scope.selectedDay][j][k];
											$scope.msg.payload[i][j][k] = value;
										}
									}
								}
							}
							$scope.printScheduleTable();
							$scope.updateView();
							$scope.send([$scope.msg, null]);	
						}

						$scope.padZero = function(i) {
							if (i < 10) i = "0" + i;
							return i;
						}

						$scope.getElement = function(elementId) {
							return document.getElementById($scope.timeschedulerid).querySelector("#" + elementId);
						}
					}
				});
				node.on("close", done);

				setInterval(function() {
					if (mySchedule.length == 7) {
						node.send([null, {payload: isInTime() }]);
					}
				}, 60000);

				function isInTime() {
					var today = new Date();
					var hour = today.getHours();
					var day = today.getDay();
					var minutes = today.getMinutes();
					var quarter = 0;
					
					if (minutes <= 15) quarter = 0;
					else if (minutes <= 30) quarter = 1;
					else if (minutes <= 45) quarter = 2;
					else if (minutes <= 60) quarter = 3;
			
					if (mySchedule[day][hour][quarter] == 1) {
						return true;
					}
			
					return false;
				}
			}

		} catch(error) {
			console.log("TimeSchedulerNode:", error);
		}
    }
	RED.nodes.registerType("ui_time_scheduler",TimeSchedulerNode);
}