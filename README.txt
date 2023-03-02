ZoneMinder is an integrated set of applications which provide a complete surveillance solution allowing capture, analysis, 
recording and monitoring of any CCTV or security cameras attached to a Linux based machine. 

This homey zoneminder app will allow you to enable oe disable an existing zoneminder monitor but also change its function. 
Eg. You are leaving your house, let's change zoneminder monitor from modect (motion detection) to mocord (motion record).

Use this application "alarm is triggered" trigger card to start a homey flow that will simulate a home presence.
As ZM API does not return active alarms, only alarms that occured between a startdatetime and enddatime, you will be asked for two parameters: 
    1- an event pulling time
    2- a event usual duration 

From those two parameters, the application will query events every X sec (1) over the last Y (2) seconds.

PSA: In zoneminder, create in zoneminder a user for homey and grant a view access to the Event category and enable API.
    Then, configure a complex string for AUTH_HASH_SECRET (use a password generator) and check that OPT_USE_API is enabled
    but than OPT_USE_LEGACY_API_AUTH is disabled. This app uses access/refresh tokens (v2.0) to connect to zm API which means
    that access token will be refreshed every hour or two and refresh token will be once a day. 

