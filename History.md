1.0.5 / 2011-11-05
==================
  * Added Nowjs transport for notifying real-time changes directly to browser clients very very easily
  * For the nowjs transport, the `fn` option can be an underscore template string that will be compiled at runtime with the row returned to the client; example opts: `{transports:'nowjs',transportsOpts:{nowjs:{fn:'onChangeKey<%= k %>'}}}`; k will be the row key when the event occur

1.0.4 / 2011-10-27
==================
  * Added Faye transport for notifying real-time changes via websocket
  * Tests improvements via Makefile (make test)
  * Readme updated
  * General bugfix and improvements

1.0.3 / 2011-10-26
==================
  * Added the filesystem driver and the inotifywait method; filesystem database emulation to have real-time file change notification using inotifywait child_process
  * Test bugfix and refactoring

1.0.2 / 2011-10-25
==================

  * Added the possibility to notify not only if something changes, but also what have changed, see channelDefaults.keyfld
  * Added the truncate monitoring via TRIGGER for postgresql driver

1.0.1 / 2011-10-24
==================

  * Initial release
  * Added PostgreSQL driver with TRIGGER and LISTEN/NOTIFY support added
  * Added Console and EventEmitter transports

1.0.0 / 2011-10-22
==================

  * Idea
