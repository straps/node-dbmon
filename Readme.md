# Database and Filesystem monitor utilities for nodejs

If you are trying to update a GUI when a database table changes (_insert_, _update_, _delete_) or when a file is being created/modified/deleted/moved, this library is for you.

This is a node.js module supporting a growing number of database drivers and notification transports
you can extend and improve.

It is designed to be easily extended with simple sintax by anyone and, where possibile,
to notify of changes without classic polling, but with real-time notification mechanism


## Usage sample

This is a short example of the PostgreSQL driver; you can find more on `test/test-postgresql.js`

Install a local postgresql database server; grant temporary trust access to the postgresql
user editing the pg_hba.conf file and create a test table like this `create table testtable(id integer primary key, val varchar(10));`
then run the following

    var pg=require('pg'), cli=new pg.Client('tcp://postgres@localhost/template1'), dbmon=require('dbmon');

    cli.connect();
    //uncomment if you want node to create the temporary table for you
    //cli.query('drop table if exists testtable; create table testtable(id integer primary key, val varchar(10));');

    var channel=dbmon.channel({
      driver:'postgresql',
      driverOpts:{
        postgresql:{
          cli:cli
        }
      },
      table:'testtable',
      monitor:'all',
      keyfld:{
        name:'id',type:'integer'
      }
    });

Now monitor the console and execute some insert/update/delete and see what happens...

You should see come console messages saying you are modifiyng `testtable` like this

    Console Transport Notification: insert, row={"op":"i","k":2,"oldk":2,"id":1}

In this case I've executed a simple insert like `insert into testtable values(2,'TWO');`.
Console says that the type of notification is an insert and the row modified
from last notification is `{"op":"i","k":2,"oldk":2,"id":1}` where fields means:

  - *op* is the operation type; can be *i* for insert, *u* for update, *d* for delete and *t* for truncate
  - *k* is the key inserted/updated/deleted based on what specified in `keyfld.name`
  - *oldk* is the old key value, see what happens executing `update testtable set id=20, val='twenty' where id=2`
  - *id* is an internal change sequence id, an ordered number useful to keep track of modifications

It is very interesting to know that if you update 2 or more rows in the same transaction, there will
arrive 2 ore more notifications based on the number or rows being modified

Another good thing is that for PostgreSQL, *dbmon* is powered by the NOTIFY/LISTEN constructs. It means
that, when something changes, the server that contacts node and node notify listeners via the transports specified, making
it really real-time, not like other polling-based alternatives.

To see the complete list of options see [lib/channelDefaults.js](https://github.com/straps/node-dbmon/blob/master/lib/channelDefaults.js)

### Dbmon cli

Dbmon has also an executable called `dbmon`.

With it you can start a socket.io server or a console db monitoring program without writing a single line of code.

Sample usage:

    dbmon --driver=postgresql --driverOpts-postgresql-connStr=tcp://user:pwd@127.0.0.1:5432/db --driverOpts-postgresql-baseObjectsName=test_dbmon_cli --table=mytable --keyfld-name=id --keyfld-type=integer --transports=console,socketio --transportsOpts-socketio-port=8888

Parameters are tranformed to a JSON object as expected by dbmon and like discussed before.

In this case, the resulting json will be:

    {
      "driver": "postgresql",
      "driverOpts": {
        "postgresql": {
          "connStr": "tcp://user:pwd@127.0.0.1:5432/db",
          "baseObjectsName": "test_dbmon_cli"
        }
      },
      "table": "mytable",
      "keyfld": {
        "name": "id",
        "type": "integer"
      },
      "transports": "console,socketio",
      "transportsOpts": {
        "socketio": {
          "port": 8888
        }
      }
    }

dbmon will start a channel passing that object as input, will monitor for *mytable* changes and will run a socket.io websocket on port 8888 for real-time web updates. Simple as effective...


### Sample for the new filesystem driver

On linux, you can experiment the new `filesystem` driver. It is based on `inotifywait`, a linux command line utility
that helps you monitor for file changes; on ubuntu you can install it by typing

    sudo apt-get install inotify-tools

Now Execute this code

    require('dbmon').channel({
      driver:'filesystem',
      driverOpts:{filesystem:{root:'/home'}},
      method:'inotifywait',
      transports:'console'
    });

and monitor the console when you create/modify/delete files on your home directory or subdirectories (Desktop too). FUN

## Structure and Naming Conventions

Dbmon is designed to be dynamic and easily extensible; there are 3 main actors to extend it

  - **transports**, in [lib/transports](https://github.com/straps/node-dbmon/tree/master/lib/transports) are the way dbmon notify events. You can use how many tranports you want separating them by comma. The name specified in the options object have to match the name of the file followed by `-tranport.js` in the `transports` foler, like the `console` transport in the example above.
  - **providers**, in [lib/providers](https://github.com/straps/node-dbmon/tree/master/lib/providers), have to initialize their method to fetch data and notify transports whene something happen; in most cases (surely for postgresql case) they should only require the `generic-driver` that dynamiccaly instantiate the method and notify transports
  - **methods**, in [lib/methods](https://github.com/straps/node-dbmon/tree/master/lib/methods), are the core of the system; their implementation depends upon the driver and the method specified in the configuration object and their name should respect `DRIVER-METHOD-method.js` convention (ie: postgresql-trigger-method.js). Methods init function return an `EventEmitter` inherited object that notify listeners where data changes firing the event notification chain


### How To Create a new Transport

Creating a new transport is very simple; the node module have to export a single function `init` that `dbmon` will call passing the global options object.

The `init` function have to return an object with a `notify` method, magically called from drivers, when something server side changes.

Say we want a generic TCP Socket transport to communicate with another application, transmitting db update notification.

Create the file `lib/transports/tcpsocket.js` and insert the following lines:

    //TCP Socket Tranport
    var init=function init(opts){
      console.log('TCP Socket Transport init');
      var me={
        notify:function(type, row){
          opts.transportsOpts.tcpsocket.client.write(JSON.stringify(row));
          return me;
        }
      };
      return me;
    };
    module.exports={init:init};

Now use it from your node.js server socket app:

    var net = require('net');
    var server = net.createServer(function (c) {
      c.on('data', function(data){
        console.log('DATA FROM SOCKET HURRAAA --> '+data);
      });
    });
    server.listen(8124, 'localhost', function(){
      var client=new net.Socket();
      client.connect(8124, 'localhost', function(){
        console.log('connected');

        var pg=require('pg'), cli=new pg.Client('tcp://postgres@localhost/template1'), dbmon=require('dbmon');
        cli.connect();

        dbmon.channel({
          driver:'postgresql',
          driverOpts:{
            postgresql:{
              cli:cli
            }
          },
          table:'testtable',
          method:'trigger',
          transports:'tcpsocket',
          transportsOpts:{
            tcpsocket:{
              client:client
            }
          },
          keyfld:{ name:'id', type:'integer'}
        });
      });
    });

In 20 lines of (uncompressed) code you can create and use a new tranport, contribute to the library and make others happy (me too :)

Creating a new driver and a new driver method, could be some more complicated, but I thing, in next releases will be a generic
mixed trigger/polling based driver I'm thinking on.


## Testing

Test cases are home-made and could not be complete or well done, so feel free to fork and improve tests too.

In any case, you can test the library doing a `make test` from main directory


## Installation

Using npm: `npm install dbmon`

Or `npm install dbmon -g` and `npm link dbmon` if you prefer linking a global installation

Or you can download/fork and copy on a local folder inside your project


### External Dependencies, automatically installed if you use npm

  - [Underscore.js](http://documentcloud.github.com/underscore/) (`npm install underscore`)
  - [Step](https://github.com/creationix/step) (`npm install step`)

Database drivers, depends on the driver you use, including

  - [Pg](https://github.com/brianc/node-postgres) (`npm install pg`)
  - [inotifywait](https://github.com/rvoicilas/inotify-tools/wiki/) (`sudo apt-get install inotify-tools`); required for `{driver:'filesystem',method:'inotifywait',...}`

Transports drivers, depends on the transports you use, including

  - [Faye](http://faye.jcoglan.com/) (`npm install faye`)
  - [Nowjs](http://nowjs.com/) (`npm install now`)

Only for test

  - [Colors](https://github.com/Marak/colors.js) (`npm install colors`)



## ToDo
  - Develop other drivers (MySQL, Oracle, MsSQL, etc...)
  - Develop other transports (Hook.io, etc..)
  - Write better unit tests


## License

(The MIT License)

Copyright (c) 2011 Francesco Strappini <f@strx.it>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
