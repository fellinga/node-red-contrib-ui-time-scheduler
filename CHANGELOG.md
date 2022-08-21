# Changelog

----------
## [v1.17.2] - 2022-08-21

### Changed
- use widget color instead of titlebar color

----------
## [v1.17.1] - 2022-06-19

### Changed
- indicate disabled timer when device is disabled

----------
## [v1.17.0] - 2022-04-24

### Changed
- allow mixed start/end types

----------
## [v1.16.2] - 2021-11-16

### Changed
- fixed solar end time

----------
## [v1.16.1] - 2021-10-16

### Changed
- fixed output label

----------
## [v1.16.0] - 2021-09-24

### Changed
- allow timers to exceed midnight

### Fixed
- improve css
  
----------
## [v1.15.2] - 2021-08-13

### Fixed
- properly convert "0" event to number in event mode

----------
## [v1.15.1] - 2021-08-09

### Changed
- select all now works both ways

### Fixed
- de translation of sun events
  
----------
## [v1.15.0] - 2021-07-29

### New
- option to select context store

### Fixed
- disabled devices can now be set again

----------
## [v1.14.0] - 2021-07-24

### New
- option to send off payloads only at the defined endtime

----------
## [v1.13.2] - 2021-07-11

### Fixed
- respect group width

### Changed
- height calculation
  
----------
## [v1.13.1] - 2021-07-10

### Changed
- overview filter value is now stored in context
- visual improvements for selected overview filter
  
----------
## [v1.13.0] - 2021-07-01

### new
- added additional sun events for default mode

----------
## [v1.12.0] - 2021-07-01

### new
- added additional sun events for event mode

----------
## [v1.11.0] - 2021-05-17

### new
- added select all for day select
  
----------
## [v1.10.2] - 2021-04-23

### new
- added getStatus input

### fixed
- fixup empty ui path
  
----------
## [v1.10.1] - 2021-04-05

### fixed
- fixup empty lat/lon

----------
## [v1.10.0] - 2021-04-05

### new
- added solarevents

----------
## [v1.9.0] - 2021-03-28

### new
- option to block device output unless value changes
- devices can be disabled/enabled now
  
----------
## [v1.8.0] - 2021-03-21

### new
- added configurable options for events

----------
## [v1.7.1] - 2021-03-20

### fixed
- fixed msg.topic error

----------
## [v1.7.0] - 2021-03-20

### new
- data is now stored in node.context
  
----------
## [v1.6.1] - 2021-02-06

### fixed
- fixed no payload error
  
----------
## [v1.6.0] - 2021-01-29

### New
- timers can be disabled/enabled now

----------
## [v1.5.3] - 2021-01-22

### Changed
- allow endtime to be 00:00 (midnight)

----------
## [v1.5.2] - 2021-01-18

### Changed
- gui improvements
- overview only shows devices with timers

----------
## [v1.5.1] - 2021-01-13

### Fixed
- filter for timers

----------
## [v1.5.0] - 2021-01-12

### Fixed
- overview time zone
  
## Changed
- bump from 0.4.9 to 1.5.0
  to follow semantic versioning

----------
## [v0.4.9] - 2021-01-10

### New
- optional msg topic

----------
## [v0.4.8] - 2020-12-28

### Changed
- improved time input for firefox/safari
- improved ajax request with loading overlay

----------
## [v0.4.7] - 2020-12-18

### New
- added a overview site that is shown if multiple devices are configured

### Changed
- adjusted pointer
- removed refresh prop for event mode

----------
## [v0.4.6] - 2020-12-07

### New
- you can now change the first day of the week
  
----------
## [v0.4.5] - 2020-11-30

### Fixed
- device migration
  
----------
## [v0.4.4] - 2020-11-24

### Fixed
- CSS improvements

----------
## [v0.4.3] - 2020-11-23

### New
- event mode now has the ability to send
  custom payloads
  
----------
## [v0.4.2] - 2020-11-22

### Changed
- improved timing (output messages)

----------
## [v0.4.1] - 2020-11-21

### Fixed
- properly detect ui url (again)

----------
## [v0.4.0] - 2020-11-19

### New
- added new "event mode"! you can now
  send single events at a specific time.

----------
## [v0.3.3] - 2020-11-09

### Fixed
- properly detect ui url

----------
## [v0.3.1] - 2020-11-09
## [v0.3.2] - 2020-11-09

### Fixed
- support/fix for timezones

----------
## [v0.3.0] - 2020-11-05

### New
- added multi device support! you can now
  control multiple devices with just one
  scheduler node.
- replaced plain text with i18n values, 
  added german language support

### Changed 
- UI now actively requests data  from the
  server instead of just relying on the 
  msg.payload

### Fixed
- time zone handling

----------
## [v0.2.4] - 2020-10-22

### New
- works now without any payload provided

### Changed
- small gui improvements

----------
## [v0.2.3] - 2020-10-15

### Added
- License

----------
## [v0.2.2] - 2020-10-14

### New
- update interval can now be changed (default 60s)

----------
## [v0.2.1] - 2020-10-06

### Fixed
- node closing

----------
## [v0.2.0] - 2020-10-06

### Changed
- had to remove to ability to create "point in time" schedules  
might develop an extra node for this. The node now always  
outputs 'true' or 'false' every 60 seconds.

----------
## [v0.1.3] - 2020-09-25

### Changed
- help and readme

----------
## [v0.1.0] - 2020-09-01

### Changed
- new concept, new gui

----------
## [v0.0.1] - 2020-08-22

Initial release