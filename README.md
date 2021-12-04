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

A time profiler will measure how much time a message spends in each node it passes through.

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

![flow with names](https://user-images.githubusercontent.com/14224149/144684665-f1fe7693-75ff-44dd-b4da-5f51648f6ccd.png)
```
[{"id":"1d8b715f721d6fed","type":"function","z":"dd961d75822d1f62","name":"Node A","func":"setTimeout(function() {\n    node.send(msg);\n}, 500)","outputs":1,"noerr":0,"initialize":"","finalize":"","libs":[],"x":540,"y":3240,"wires":[["ce0c0139dbeeea58"]]},{"id":"ce0c0139dbeeea58","type":"function","z":"dd961d75822d1f62","name":"Node B","func":"setTimeout(function() {\n    node.send(msg);\n}, 1000)","outputs":1,"noerr":0,"initialize":"","finalize":"","libs":[],"x":700,"y":3240,"wires":[["eb57c0ae575d622e"]]},{"id":"51c0e723aef7652d","type":"inject","z":"dd961d75822d1f62","name":"Inject message","props":[{"p":"payload"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","payload":"Hello timer","payloadType":"str","x":220,"y":3240,"wires":[["821a8a029655639f"]]},{"id":"821a8a029655639f","type":"msg-time-profiler","z":"dd961d75822d1f62","inputField":"topic","outputField":"_msgtracing","profileMode":"inline","autoStart":true,"outputs":1,"name":"","x":390,"y":3240,"wires":[["1d8b715f721d6fed"]]},{"id":"eb57c0ae575d622e","type":"function","z":"dd961d75822d1f62","name":"Node C","func":"setTimeout(function() {\n    node.send(msg);\n}, 1500)","outputs":1,"noerr":0,"initialize":"","finalize":"","libs":[],"x":860,"y":3240,"wires":[["b40c7ffe9b98c220"]]},{"id":"de0b0f503f12baa9","type":"comment","z":"dd961d75822d1f62","name":"500 msec","info":"","x":540,"y":3200,"wires":[]},{"id":"b3081b851780b60f","type":"comment","z":"dd961d75822d1f62","name":"1000 msec","info":"","x":700,"y":3200,"wires":[]},{"id":"c3b104e58cb8be4a","type":"comment","z":"dd961d75822d1f62","name":"1500 msec","info":"","x":860,"y":3200,"wires":[]},{"id":"b40c7ffe9b98c220","type":"debug","z":"dd961d75822d1f62","name":"Chain completed","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"true","targetType":"full","statusVal":"","statusType":"auto","x":1050,"y":3240,"wires":[]}]
```
Each function node delays the message with the indicated time interval, as displayed with the comments above each node.

At the end, the debug node will show following information:

![output msg](https://user-images.githubusercontent.com/14224149/144685009-a2be41a0-def0-487f-922f-7bd2fa325e8e.png)

Some explanation about the *_msgtracing* property content:
+ *initiatorNodeId*: id of the initiator node, i.e. the node that has started the message profiling by adding an empty *_msgtracing* property to the message.
+ *trackingNodeId*: id of the msg-profiler node, whose hook has traced the message.
+ *trace*: an array of recorded events (when the message has been received by a node, and when it has been send by a node).  
+ *profile*: an array containing the statistical summary of the recorded events.  In other words the time (in milliseconds) that the message has spend in each node it has passed through.  And also the percentage of the time the message has spend in each node.  This information is calculated based on the timestamps in the 'trace' field.
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

## Visualization of the profiling data

### Timing distribution in pie and bar charts

To analyze quickly which node in a (long) chain of nodes is causing the performance issues, the *msg._msgtracing* content can easily be transformed to chart data:

![Chart flow](https://user-images.githubusercontent.com/14224149/144685238-a6116185-b1df-44ac-81ec-64a8bcad69d9.png)
```
[{"id":"1d8b715f721d6fed","type":"function","z":"dd961d75822d1f62","name":"Node A","func":"setTimeout(function() {\n    node.send(msg);\n}, 500)","outputs":1,"noerr":0,"initialize":"","finalize":"","libs":[],"x":540,"y":3240,"wires":[["ce0c0139dbeeea58"]]},{"id":"ce0c0139dbeeea58","type":"function","z":"dd961d75822d1f62","name":"Node B","func":"setTimeout(function() {\n    node.send(msg);\n}, 1000)","outputs":1,"noerr":0,"initialize":"","finalize":"","libs":[],"x":700,"y":3240,"wires":[["eb57c0ae575d622e"]]},{"id":"51c0e723aef7652d","type":"inject","z":"dd961d75822d1f62","name":"Inject message","props":[{"p":"payload"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","payload":"Hello timer","payloadType":"str","x":220,"y":3240,"wires":[["821a8a029655639f"]]},{"id":"821a8a029655639f","type":"msg-time-profiler","z":"dd961d75822d1f62","inputField":"topic","outputField":"_msgtracing","profileMode":"inline","autoStart":true,"outputs":1,"name":"","x":390,"y":3240,"wires":[["1d8b715f721d6fed"]]},{"id":"eb57c0ae575d622e","type":"function","z":"dd961d75822d1f62","name":"Node C","func":"setTimeout(function() {\n    node.send(msg);\n}, 1500)","outputs":1,"noerr":0,"initialize":"","finalize":"","libs":[],"x":860,"y":3240,"wires":[["b40c7ffe9b98c220"]]},{"id":"de0b0f503f12baa9","type":"comment","z":"dd961d75822d1f62","name":"500 msec","info":"","x":540,"y":3200,"wires":[]},{"id":"b3081b851780b60f","type":"comment","z":"dd961d75822d1f62","name":"1000 msec","info":"","x":700,"y":3200,"wires":[]},{"id":"c3b104e58cb8be4a","type":"comment","z":"dd961d75822d1f62","name":"1500 msec","info":"","x":860,"y":3200,"wires":[]},{"id":"b40c7ffe9b98c220","type":"debug","z":"dd961d75822d1f62","name":"Chain completed","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"true","targetType":"full","statusVal":"","statusType":"auto","x":1050,"y":3240,"wires":[]}]
```
In this case the message timing distribution across the 3 function nodes, is being visualize in a ***pie chart*** and a (horizontal) ***bar chart***:

![Charts](https://user-images.githubusercontent.com/14224149/144685552-0a065ca2-2c22-4c50-8d2d-50cce89b1fba.png)

This way can see very quickly how the message processing time is distributed, across the node the message has been passing through.

### Timing variations in line charts

To analyze quickly how the processing duration of a single node varies over time, it is easy to show only that duration in a line chart:

![line chart](https://user-images.githubusercontent.com/14224149/144702571-6a354626-fea0-4307-bdf0-7f762149c0fc.png)

In this example flow, the node A delays the messages (that arrive every 500 msec) by 200 msec.  To accomplish that node A uses a ***timer***  with an execution interval of 200 msec.  However the NodeJs event loop needs to handle all other events, which means the timer will not always be executed exactly within 200 msecs.  So there will be some ***timing variations***:

![profiling_a_timer](https://user-images.githubusercontent.com/14224149/144702946-3abb2f81-1dd9-4c81-85c2-f188656d04c8.gif)
```
[{"id":"1d8b715f721d6fed","type":"function","z":"dd961d75822d1f62","name":"Node A","func":"setTimeout(function() {\n    node.send(msg);\n}, 200)","outputs":1,"noerr":0,"initialize":"","finalize":"","libs":[],"x":780,"y":1440,"wires":[["0cead2dcef8be5fc"]]},{"id":"51c0e723aef7652d","type":"inject","z":"dd961d75822d1f62","name":"Every 500 msec","props":[{"p":"payload"}],"repeat":"0.5","crontab":"","once":false,"onceDelay":0.1,"topic":"","payload":"Hello timer","payloadType":"str","x":450,"y":1440,"wires":[["821a8a029655639f"]]},{"id":"821a8a029655639f","type":"msg-time-profiler","z":"dd961d75822d1f62","inputField":"topic","outputField":"_msgtracing","profileMode":"inline","autoStart":true,"outputs":1,"name":"","x":630,"y":1440,"wires":[["1d8b715f721d6fed"]]},{"id":"115455802f90b9ac","type":"ui_chart","z":"dd961d75822d1f62","name":"Bar chart","group":"89749fb7.87f01","order":3,"width":"7","height":"6","label":"Msg timing - Line chart","chartType":"line","legend":"true","xformat":"HH:mm:ss","interpolate":"linear","nodata":"","dot":false,"ymin":"190","ymax":"230","removeOlder":1,"removeOlderPoints":"100","removeOlderUnit":"3600","cutout":"30","useOneColor":false,"useUTC":false,"colors":["#1f77b4","#aec7e8","#ff7f0e","#2ca02c","#98df8a","#d62728","#ff9896","#9467bd","#c5b0d5"],"outputs":1,"useDifferentColor":false,"className":"","x":1200,"y":1440,"wires":[[]]},{"id":"0cead2dcef8be5fc","type":"change","z":"dd961d75822d1f62","name":"Extract node A duration","rules":[{"t":"set","p":"payload","pt":"msg","to":"_msgtracing.profile[0].duration","tot":"msg"},{"t":"set","p":"topic","pt":"msg","to":"Timer interval","tot":"str"}],"action":"","property":"","from":"","to":"","reg":false,"x":990,"y":1440,"wires":[["115455802f90b9ac"]]},{"id":"c4a5256c6f27a471","type":"comment","z":"dd961d75822d1f62","name":"Delay timer 200 msec","info":"","x":780,"y":1400,"wires":[]},{"id":"89749fb7.87f01","type":"ui_group","name":"Message Profiler","tab":"d7901f40.2659d","order":2,"disp":true,"width":"16","collapse":false,"className":""},{"id":"d7901f40.2659d","type":"ui_tab","name":"Charts","icon":"dashboard","order":40,"disabled":false,"hidden":false}]
```

The more your system has to do, the bigger the timing variations will become...

## Extra use cases

### Trigger an alarm for long processing times

When dealing with critical flows, it might be useful to ***monitor the timing durations***.  And trigger an alarm when a performance issue is detected.

Two metrics in the `msg._msgtracing` of the output message might be useful for this purpose:
+ *totalDuration*: if the total processing time of an entire chain of nodes should not exceed some threshold.
+ *maximumDuration*: if the maximum processing time of any node (in the entire chain of nodes) should not exceed some threshold.
+ *maximumPercentage*: similar to maximumDuration, but now with a threshold percentage.
