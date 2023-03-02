import Homey from 'homey';
import https from 'https';
import axios from 'axios';
import moment from 'moment';
import momentTZ from 'moment-timezone';
import { apiKey } from './apiKey';
import { apiClient } from './apiClient';

class ZoneminderHandler extends Homey.App {
  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.log('ZoneminderHandler has been initialized');

    const zmServerUrl = this.homey.settings.get('zmServerUrl');
    const zmUser = this.homey.settings.get('zmUser');
    const zmPassword = this.homey.settings.get('zmPassword');
    const zmAlarmsRefreshTime = this.homey.settings.get('zmAlarmsRefreshTime');
    const zmAlarmsMaximumDuration = this.homey.settings.get('zmAlarmsMaximumDuration');
    let zmLastAlarmCheck = this.homey.settings.get('zmLastAlarmCheck');
    let zmLastAlarmId = this.homey.settings.get('zmLastAlarmId');
    let zmServerIsAlive : boolean = false;

    const TZ = this.homey.clock.getTimezone();
    let zmApiClient = new apiClient(zmServerUrl, false);
    let currentApiKey = apiKey.empty();
    var access_token_interval;
    var refresh_token_interval;

    if(!zmAlarmsRefreshTime)
    {
      this.log("zmAlarmsRefreshTime was null. Configuring...");
      this.homey.settings.set('zmAlarmsRefreshTime', 0);
    }
    if(!zmLastAlarmCheck)
    {
      this.log("zmLastAlarmCheck was null. Configuring...");
      this.homey.settings.set('zmLastAlarmCheck', moment(momentTZ.tz(new Date(), TZ)).format("yyyy-MM-DD HH:mm:ss"));
    }
    if(!zmLastAlarmId)
    {
      this.log("zmLastAlarmId was null. Configuring...");
      this.homey.settings.set('zmLastAlarmId', 1);
    }

    if(!zmServerUrl || !zmUser || !zmPassword)
    {
      this.log("Either server url or username or password was null / empty");
    }
    else 
    {
      this.log("Parameters found on startup");
      this.log('Server URL',zmServerUrl);
      this.log('User',zmUser);
      this.log('Password',zmPassword);
      this.log('Refresh Alarms every ',zmAlarmsRefreshTime, ' sec');

      // Check server connectivity - Interval
      const zmServerIsAlive_interval = setInterval(async() => {
        
        zmServerIsAlive = await zmApiClient.serverIsAlive(); 
        this.log("ZM Server is alive: " + zmServerIsAlive);

        if(!zmServerIsAlive){
          currentApiKey.resetTokenExpiration();
        }

        // Server is online
        if(zmServerIsAlive && currentApiKey.access_token_expires == 0){
          // Get an API key with stateful connection 
          currentApiKey = new apiKey(await zmApiClient.getApiKey(zmUser, zmPassword), function(){
            clearInterval(access_token_interval);
            clearInterval(refresh_token_interval);
            
            // Refresh access token using refresh token
            access_token_interval = setInterval(async () => {
              if(zmServerIsAlive){
                currentApiKey.refreshToken(await zmApiClient.getNewAccessToken(currentApiKey.refresh_token));
              }
            }, currentApiKey.access_token_expires * 1000);

            // Refresh API completly when refresh token expires
            refresh_token_interval = setInterval(async () => {
              if(zmServerIsAlive){
                currentApiKey = new apiKey(await zmApiClient.getApiKey(zmUser, zmPassword), function(){
                  console.log("Token refreshed");
                });
              }
            }, currentApiKey.refresh_token_expires * 1000);

            // Disable this connectivity check
            clearInterval(zmServerIsAlive_interval);
          });
        }
      }, 10 * 1000);

      // Trigger card
      const cardTriggerAlarm = this.homey.flow.getTriggerCard("alarm-is-triggered");
      setInterval(() => {
        if(zmServerIsAlive){
          // Get the different Datetime
          const searchStartDatetime = moment(momentTZ.tz(new Date(), TZ).add(-zmAlarmsMaximumDuration, 's')).format("yyyy-MM-DD HH:mm:ss");
          const currentDate = moment(momentTZ.tz(new Date(), TZ)).format("yyyy-MM-DD HH:mm:ss");
          zmLastAlarmCheck = this.homey.settings.get('zmLastAlarmCheck');
        
          // Update with current time
          this.homey.settings.set('zmLastAlarmCheck', currentDate);

          console.log("Searching alarms between " + searchStartDatetime + " and " + currentDate + " & id > " + zmLastAlarmId);

          const path = "/zm/api/events/index/StartDatetime%20>=:" + (zmLastAlarmCheck < searchStartDatetime ? zmLastAlarmCheck : searchStartDatetime) +"/EndDatetime%20<=:" + currentDate + ".json?sort=StartTime&direction=desc&token=" + currentApiKey.access_token;
          const url = zmServerUrl + path;
          zmApiClient.instance.get(url)
            .then(function (response: any){
              console.log("Found " + response.data.events.length + " event(s), looking for matching id > " + zmLastAlarmId);
              response.data.events.forEach(element => {
                if(element.Event.Id > zmLastAlarmId){
                  zmLastAlarmId = element.Event.Id;
                  
                  const tokens = {
                    name: element.Event.Name,
                    monitorId: parseInt(element.Event.MonitorId),
                    cause: element.Event.Cause
                  };
        
                  cardTriggerAlarm.trigger(tokens)
                  .catch(function (error: any) {console.error(error);});
                }
                else {

                }
            });   
          })
          .catch( ( error ) => {console.log( error );} );

          if(zmLastAlarmId > this.homey.settings.get('zmLastAlarmId') ){
            this.homey.settings.set('zmLastAlarmId', zmLastAlarmId)
            console.log("Update last id " + this.homey.settings.get('zmLastAlarmId'));
          }
        }
      }, zmAlarmsRefreshTime * 1000);
    }

    const cardActionEnableMonitor = this.homey.flow.getActionCard('enable-monitor');
    cardActionEnableMonitor.registerRunListener(async(args) => {
      const { enabled } = args;
      const { monitorId } = args;
      const path = "/zm/api/monitors/" + monitorId + ".json";

      const url = zmServerUrl + path;
      const data = "Monitor[Enabled]=" + Number(enabled);

      zmApiClient.instance({
        method: "post",
        url: url,
        data: data,
      })
      //.then(function (response: any) { console.log(response.data);})
      .catch(function (error: any) {console.error(error);});
    });

    const cardActionChangeMonitorFunction = this.homey.flow.getActionCard('change-monitor-function');
    cardActionChangeMonitorFunction.registerRunListener(async(args) => {
      const { monitorId } = args;
      const { newFunction } = args;
      const path = "/zm/api/monitors/" + monitorId + ".json";

      const url = zmServerUrl + path;
      const data = "Monitor[Function]=" + newFunction;

      zmApiClient.instance({
        method: "post",
        url: url,
        data: data,
      })
      .catch(function (error: any) {console.error(error);});
    });
  }
}
module.exports = ZoneminderHandler;
