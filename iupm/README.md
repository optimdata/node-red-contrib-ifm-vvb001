# IU Predict for Motors - vibration
This flow extract data from the IFM vibration sensor (vvb001) for [IU Predict for motors](https://inuse.eu/iu-predict-predictive-maintenance/):
- Monitoring:
  - Extract regularly (every few seconds or minutes) monitoring data using the node `get data` from [@inuse/node-red-contrib-ifm-vvb001](https://flows.nodered.org/node/@inuse/node-red-contrib-ifm-vvb001) 
- Advanced diagnostic:
  -  Extract regularly (every few minutes or hours) high frequency acceleration record using the node `blob stream` from [@inuse/node-red-contrib-ifm-vvb001](https://flows.nodered.org/node/@inuse/node-red-contrib-ifm-vvb001)
  -  If the motor is idle, we do not proceed to the recording of the acceleration.
  
Data is then send to InUse MQTT Broker.

# How to use it?
First you need to set up the global variables under the node `Set globals`:
- The `iolink-master-ip` should be the IP address of the IO link master
- The `topic_prefix` is used as the MQTT topic prefix to send the monitoring `data` or the `acceleration`


The default intervals to send the data are:
 - 30 seconds for the monitoring (v-rms, a-rms, crest, etc.)
 - 4 hours for the `acceleration` (advanced diagnosis)
 
These values can be tuned, especially during the setup of a new motor (ex: reduce the interval for the `acceleration` to 30 minutes in order to generate the maximum number of recordings that should be labeled in InUse platform in order to _train_ the advanced diagnosis algorithm).

