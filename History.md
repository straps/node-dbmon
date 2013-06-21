1.1.0 / 2013-06-21
==================
  * dbmon cli lets you monitor tables from command line, without writing a single line of JS code
  * added postgresql polling method; uses triggers but not notify/listen

1.0.7 / 2012-01-14
==================
  * addlflds option added, see channelDefaults.js for an example usage

1.0.6 / 2011-11-08
==================
  * Added `cond` parameter that lets generate events only when the SQL condition is true. It's usage is deferred to driver methods; for postgresql, you can pass a SQL condition referring to NEW or OLD records inside trigger function. `cond` is evaluated ad an `underscore` template  at runtime passing an object with a rec property that can be NEW (for insert and update) or OLD (for delete). Example usage, valid for insert/update/delete: `cond:"<%= rec %>.name='YOUR NAME'"`
  * Added `channel.stop(callaback)` support, deferred to method.stop implementation. PostgreSQL detroy triggers, trigger functions and history tables if stop is called
  * `channel.stop()` test integration

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
