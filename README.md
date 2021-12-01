# node-red-contrib-msg-profiler
A Node-RED node to execute time profiling (and tracing) of a message through a flow.

A part of this node (to manually select nodes in the flow) is copied from the Node-RED ***Catch*** node, so all credits for that feature go to [Nick O'Leary](https://github.com/knolleary)!

## Install
Run the following npm command in your Node-RED user directory (typically ~/.node-red):
```
npm install bartbutenaers/node-red-contrib-msg-profiler
```

## Support my Node-RED developments

Please buy my wife a coffee to keep her happy, while I am busy developing Node-RED stuff for you ...

<a href="https://www.buymeacoffee.com/bartbutenaers" target="_blank"><img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy my wife a coffee" style="height: 41px !important;width: 174px !important;box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;-webkit-box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;" ></a>

## Limitations

1. Some nodes don't pass the original input message to their output (enriched with some extra data), but instead they create a new output message from scratch.  In that case there is no link between the input message and output message, so the profiling/tracing information will be incomplete.

2. Some nodes resend the same input message multiple times to their output, without cloning the input message every time it is being resended.  In that case all the nodes will store their profiling/tracing information in the same message over and over again.  At the end the message will contain N duplicates of similar profiling/tracing information.

## Node usage

CAUTION: message hooks will result in lots of extra code to be executed, so it is advised to *disable message profiling when you are not using it*!!!

### Step by step
1. Add a msg-profiler node to a flow.

2. Select via the *Mode* which node(s) will initiate the profiling, which will be called the ***initiator node(s)***.

3. When the msg-profiler node is activated (via an input message or via the checkbox in the config screen), a Node-RED [hook](https://nodered.org/docs/api/hooks/) will be registered to trace the message travelling through the flow.

4. When the message passes one of the initiator nodes, the hook will add an empty ***"_msgtracing"*** property to that message.  From here on, profiling is *initiated* for that message.

5. For every node where such a message (containing the *_msgtracing* property) passes, the hook will append extra information (about the time spend in that node) to the *_msgtracing* property.

6.  When the message has finished travelling through the flow, the *_msgtracing* property will contain profiling information about all the nodes that it has been passed through.

### The *_msgtracing* content
In the following example flow, the msg-profiler node is configured as 'inline' mode.  Which means that the msg-profiler node is inside the flow chain, and will act as an initiator node as soon as the messages pass through it:

![flow with ids](https://user-images.githubusercontent.com/14224149/144306421-c3f678ff-6506-4c57-960b-0fc14b015f90.png)
```
[{"id":"6a2692ecfe35a764","type":"function","z":"dd961d75822d1f62","name":"500 msec","func":"setTimeout(function() {\n    node.send(msg);\n}, 500)","outputs":1,"noerr":0,"initialize":"","finalize":"","libs":[],"x":540,"y":2180,"wires":[["cf03a5b2ae5e30fc"]]},{"id":"d4d22ff1881bece6","type":"debug","z":"dd961d75822d1f62","name":"Chain completed","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"true","targetType":"full","statusVal":"","statusType":"auto","x":1170,"y":2180,"wires":[]},{"id":"cf03a5b2ae5e30fc","type":"function","z":"dd961d75822d1f62","name":"1000 msec","func":"setTimeout(function() {\n    node.send(msg);\n}, 1000)","outputs":1,"noerr":0,"initialize":"","finalize":"","libs":[],"x":750,"y":2180,"wires":[["b585a6cc51b641a2"]]},{"id":"b585a6cc51b641a2","type":"function","z":"dd961d75822d1f62","name":"1500 msec","func":"setTimeout(function() {\n    node.send(msg);\n}, 1500)","outputs":1,"noerr":0,"initialize":"","finalize":"","libs":[],"x":950,"y":2180,"wires":[["d4d22ff1881bece6"]]},{"id":"4762ee94b7fffca4","type":"inject","z":"dd961d75822d1f62","name":"Inject message","props":[{"p":"payload"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","payload":"Hello timer","payloadType":"str","x":160,"y":2180,"wires":[["311b7d4594437ff2"]]},{"id":"7ecd8a2fe812e517","type":"comment","z":"dd961d75822d1f62","name":"b585a6cc51b641a2","info":"","x":970,"y":2140,"wires":[]},{"id":"afabbefc4f426cb7","type":"comment","z":"dd961d75822d1f62","name":"cf03a5b2ae5e30fc","info":"","x":770,"y":2140,"wires":[]},{"id":"9a91c5c62d914412","type":"comment","z":"dd961d75822d1f62","name":"6a2692ecfe35a764","info":"","x":570,"y":2140,"wires":[]},{"id":"311b7d4594437ff2","type":"msg-time-profiler","z":"dd961d75822d1f62","inputField":"topic","outputField":"_msgtracing","profileMode":"inline","autoStart":true,"outputs":1,"name":"","x":330,"y":2180,"wires":[["6a2692ecfe35a764"]]},{"id":"1a956d1879d68a1d","type":"comment","z":"dd961d75822d1f62","name":"d4d22ff1881bece6","info":"","x":1170,"y":2140,"wires":[]},{"id":"165c0bda8a6f3411","type":"comment","z":"dd961d75822d1f62","name":"6a2692ecfe35a764","info":"","x":370,"y":2140,"wires":[]}]
```
Each function node delays the message with the indicated time interval.  And the comments display the node id's of the corresponding function node.

At the end, the debug node will show following information:

![output msg](https://user-images.githubusercontent.com/14224149/144307596-85db5788-c4bc-4964-8409-f6ed3a20908b.png)

Some explanation about the *_msgtracing* property content:
+ *initiatorNodeId*: id of the initiator node, i.e. the node that has started the message profiling by adding an empty *_msgtracing* property to the message.
+ *trackingNodeId*: id of the msg-profiler node, whose hook has traced the message.
+ *trace*: an array of events (when the message has been received by a node, and when it has been send by a node).  
+ *profile*: an array of the time (in milliseconds) that the message has spend in each node it has passed through.  And also the percentage of the time the message has spend in each node.  This information is calculated based on the timestamps in the 'trace' field.
+ *totalDuration*: the total time (in milliseconds) that the message has spend in all nodes together.
+ *maximumDuration*: the maximum time (in milliseconds) that the message has been spend in one of the nodes.
+ *maximumPercentage*: the maximum percentage of the time that the message has been spend in one of the nodes.

This gives a quick overview of how many time this message has spend in each node it has been passing though!

## Node properties

### Cmd field

Specify in which input message field the commands will be injected.  Currently this node supports two commands:
+ ***start_profiling***: start profiling messages in the specified initiator node(s), by registering a hook in Node-RED.
+ ***stop_profiling***: stop profiling messages in the specified initiator node(s), by unregistering that hook in Node-RED.

The following example flow shows how to use those commands:

![start/stop profiling](https://user-images.githubusercontent.com/14224149/144312471-613d0384-b542-47e4-a20a-393e6940147a.png)
```
[{"id":"c019e450fc34af0b","type":"inject","z":"dd961d75822d1f62","name":"","props":[{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"stop_profiling","x":690,"y":1940,"wires":[["789a194de30045c8"]]},{"id":"789a194de30045c8","type":"msg-time-profiler","z":"dd961d75822d1f62","inputField":"topic","outputField":"_msgtracing","profileMode":"flow","autoStart":false,"scope":[],"outputs":0,"name":"","x":890,"y":1940,"wires":[]},{"id":"c737b460462886dd","type":"inject","z":"dd961d75822d1f62","name":"","props":[{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"start_profiling","x":690,"y":1980,"wires":[["789a194de30045c8"]]}]
```

### Output field

Specify in which output message field the profiling/tracing results will be send.  Currently this will be always the *_msgtracing* field and cannot be changed, so the value is only showed as informational.

### Autostart

When this option is activated, the profiling will be enabled automatically after the flow has been started.  Otherwise when this option is deactivated, an explicit *start_profiling* command needs to be injected to activate the profiling.

Note that the hook will do calculations for every event of ***all*** the messages, which will result in cpu usage!  Therefore it is advised **not** to activate hooks automatically.  However during a troubleshooting period, it might be handy to have an autostart...

### Mode

This msg-profiler node supports different types of profiling modes, which allow to specify in different ways which node(s) will become initiator nodes.  In other word to specify which node(s) will start message profiling, by adding an empty *_msgtracing* property to the messages that pass through.

1. ***Inline*** mode: the msg-profiler node will get an output, so it can be placed inside the node chain.  Which means the messages will pass through this msg-profiler node, which will act as initiator node by itself.

2. ***All nodes*** mode: all the nodes (in all the flows) will become initiator nodes.  Which means that ***every*** message will be profiled.  Of course this will result in quite some overhead, so this is to be **avoided**!  But it might be useful in exceptional cases, when you are looking a needle in a haystack...

3. ***Current flow*** mode: all the nodes in the current flow (where the msg-profile node is located) will become initiator nodes.

4. ***Selected nodes*** mode: select manually which nodes should become initiator nodes.  This is the part that has been copied from the Catch node.  As soon as this mode is selected, a list of all available nodes will be displayed.
