/**
 * Copyright 2021 Bart Butenaers
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/
 module.exports = function(RED) {
    var settings = RED.settings;
    
    function MsgTimeProfilerNode(config) {
        RED.nodes.createNode(this,config);
        this.inputField       = config.inputField;
        this.outputField      = config.outputField;
        this.autoStart        = config.autoStart;
        this.profileMode      = config.profileMode;
        this.initiatorNodes   = new Map();

        var node = this;
        
        node.initiatorNodeIds = null;
        switch(node.profileMode) {
            case "inline":
                // In inline mode, only this node itself will initiate tracing of messages
                node.initiatorNodeIds = [ node.id ];
                break;
            case "flow":
                // Get all the active nodes in the current flow
                node.initiatorNodeIds = Object.keys(node._flow.activeNodes);
                break;
            case "all":
                // Keep the variable undefined
                break;
            case "select":
                // Copy all the node id's that have been selected via the config screen.
                // In the frontend side, the array is called 'scope' to make sure the code from the Catch node can be copied without any modifications...
                node.initiatorNodeIds = config.scope || [];
                break;
        }
        
        // Create a cache containing information about all relevant nodes (for performance).
        // Note that we need to loop all the available nodes, since RED.node.getNode(...) does not return the node name.
        RED.nodes.eachNode(function(someNode) {
            if(someNode.type != "tab" && someNode.type != "subflow" && someNode.type != "comment") {
                node.initiatorNodes.set(someNode.id, {
                    name: someNode.name,
                    type: someNode.type
                });
            }
        });

        if(node.autoStart) {
            activate();
        }
        else {
            this.status({});
        }       

        function handleMsgEvent(eventName, msg, nodeId) {
            // Make sure this code has no impact on the msg sender node
            try {
                // Only analyze messages that have the specified OutputField property, i.e. which have passed through one of the time profiler nodes
                if(msg[node.outputField]) {
                    // Only handle messages that are being tracked by this tracking node.  Indeed the tracking node that has initiated the tracking
                    // of this message, is the only node that can append to the msg history.  Because otherwise the multiple hooks would result in duplicate traces.
                    if(msg[node.outputField].trackingNode.id === node.id) {
                        var previousTimestampEntry = null;
                        var trace = msg[node.outputField].trace;
                        
                        var now = Date.now();
                        var nodeInfo = node.initiatorNodes.get(nodeId);
                        
                        // Keep the history of the trace up-to-date, by registering the new event.
                        // Note that sometimes (e.g. same msg instance sended on multiple outputs) we need to avoid to have duplicate event traces in a sequence.
                        // A normal sequence is: onSend -> onReceive -> onSend -> onReceive -> ...
                        if(trace.length == 0 || trace[trace.length - 1].eventName != eventName) {
                            trace.push({
                                eventName: eventName,
                                node: {
                                    id: nodeId,
                                    name: nodeInfo.name,
                                    type: nodeInfo.type
                                },
                                timestamp: now
                            });
                        
                            // When an onSend event has been added to the trace, try to calculate the processing duration
                            if (trace.length > 1) {
                                var lastTraceEntry = trace[trace.length - 1];
                                var previousTraceEntry = trace[trace.length - 2];

                                if(lastTraceEntry.eventName == "onSend" && previousTraceEntry.eventName == "onReceive") {
                                    // When a node sends an output message, determine the duration the message has spend inside that node.
                                    // Which is only possible when we know when the message has been received in that node.
                                    if(previousTraceEntry.node.id === nodeId) {
                                        //console.log("==========> adding history for node.id=" + nodeId);
                                                                        
                                        // Calculate the duration in the node that is sending the message now
                                        msg[node.outputField].profile.push({
                                            node: {
                                                id: nodeId,
                                                name: nodeInfo.name,
                                                type: nodeInfo.type
                                            },
                                            duration: now - previousTraceEntry.timestamp
                                        });
                                        
                                        msg[node.outputField].totalDuration = 0;
                                        msg[node.outputField].maximumDuration = 0;
                                        
                                        msg[node.outputField].profile.forEach(function(currentElement) {
                                            // Calculate the total time being spend by this message in all the profiled nodes so far.
                                            msg[node.outputField].totalDuration += currentElement.duration;
                                            
                                            // Calculate the maximum time this message has been spend in all of the nodes it has passed
                                            msg[node.outputField].maximumDuration = Math.max(msg[node.outputField].maximumDuration, currentElement.duration);
                                        });
                                        
                                        msg[node.outputField].maximumPercentage = 0;

                                        msg[node.outputField].profile.forEach(function(currentElement) {
                                            // Calculate the percentage of the time being spend in all the profiled nodes so far
                                            currentElement.percentage = Math.round(currentElement.duration / msg[node.outputField].totalDuration * 100);
                                            
                                            // Calculate the maximum percentage of time this message has been spend in all of the nodes it has passed
                                            msg[node.outputField].maximumPercentage = Math.max(msg[node.outputField].maximumPercentage, currentElement.percentage);
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
                else {
                    // Seems that the message does NOT contain the specified output msg field.
                    // So let's see whether that field should be added to the message now...
                    // For inline tracing nodes, only continue when the tracing is active
                    
                    // We only initiate tracing a message, when it is being send by an initiator node.
                    // That way we avoid that the initiator node would also be measured.
                    if (eventName === "onSend") {
                        // Only initiator nodes can start adding the specifiet output msg field, to initiate the tracing.
                        // Unless the config mode is 'all', then all nodes can initiate tracing.
                        if(node.profileMode === "all" || node.initiatorNodeIds.includes(nodeId)) {
                            //console.log("==========> Adding new msg field for node.id=" + nodeId + " event=" + eventName);

                            var nodeInfo = node.initiatorNodes.get(nodeId);
                            var trackingNodeInfo = node.initiatorNodes.get(node.id);
  
                            // Start with a clean history, if not a previous one available yet
                            if(!msg[node.outputField]) {
                                msg[node.outputField] = {
                                    initiatorNode: {
                                        id: nodeId,
                                        name: nodeInfo.name,
                                        type: nodeInfo.type
                                    },
                                    trackingNode: {
                                        id: node.id,
                                        name: trackingNodeInfo.name
                                    },
                                    trace: [],
                                    profile: []
                                }
                            }
                        }
                    }
                }
            }
            catch(err) {
                node.error("Unexpected error while time profiling messages: " + err);
            }
        }
        
        function activate() {
            node.isActive = true;
            
            // When the time profiler becomes active, both hooks need to registered

            RED.hooks.add("onSend.msg-time-profiler-" + node.id, function(sendEvents) {
                // The sendEvents is an array for all the messages that are being passed to node.send([...]).
                sendEvents.forEach(function(sendEvent) {
                    // The (source) node - which sends the message, is important for trailing
                    handleMsgEvent("onSend", sendEvent.msg, sendEvent.source.node.id);
                });
            });

            RED.hooks.add("onReceive.msg-time-profiler-" + node.id, function(receiveEvent) {
                // The (destination) node - which receives the message, is important for trailing 
                handleMsgEvent("onReceive", receiveEvent.msg, receiveEvent.destination.node.id);
            });

            node.status({fill:"blue", shape:"dot", text:"profiling"});
        }
        
        function deactivate() {
            node.isActive = false;
            
            // When the time profiler becomes inactive, both hooks need to unregistered
            RED.hooks.remove("*.msg-time-profiler-" + node.id);
            
            node.status({});
        }

        node.on("input", function(msg) {
            var command;
            
            try {
                // Get the command from the specified input location.
                command = RED.util.evaluateNodeProperty(node.inputField, "msg", this, msg);
            } 
            catch(err) {
                node.error("Error getting command from msg." + node.inputField + " : " + err.message);
                return;
            }
 
            switch(command) {
                case "start_profiling":
                    if(node.isActive) {
                        node.warn("The time profiling is already active");
                    }
                    else {
                        activate();
                    }
                    break;
                case "stop_profiling":
                    if(!node.isActive) {
                        node.warn("The time profiling was not active yet");
                    }
                    else {
                        deactivate();
                    }
                    break;
                default:
                    // All other messages will be forwarded to the output
                    node.send(msg);
            }
        });
        
        node.on("close", function() {
            deactivate();
        });
    }

    RED.nodes.registerType("msg-time-profiler", MsgTimeProfilerNode);
}
