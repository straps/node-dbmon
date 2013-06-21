var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  , pg = require('pg')
  , dbmon = require('dbmon')
  , io = require('socket.io');

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 8888);
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', function(req,res){
  res.redirect('/index.html');
});

var httpServer = http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

io = io.listen(httpServer);

var pgconn=require('./pgconn');
var pgcli = new pg.Client(pgconn);
pgcli.connect();
pgcli.on('error', function(error){ console.log('PG Error on LOCAL DB: '+error); cdir(error); });

pgcli.query('create temporary table pg_io_dbmon_test (k integer, x integer, y integer);');
dbmon.channel({
  driver:'postgresql',
  driverOpts:{
    postgresql:{
      cli:pgcli,
      baseObjectsName:'pg_io_dbmon_test'
    }
  },
  table:'pg_io_dbmon_test',
  monitor:'insert,update,delete',
  keyfld:{
    name:'k',type:'integer'
  },
  addflds:[
    {name:'x', type:'integer'},
    {name:'y', type:'integer'}
  ],
  transports:'console,socketio',
  transportsOpts:{
    socketio:{
      io:io
    }
  },
  debouncedNotifications:0
});

var k=0;
setInterval(function(){
  var q='insert into pg_io_dbmon_test values('+k+', '+(~~(Math.random()*800))+', '+(~~(Math.random()*600))+');';
  console.log(q);
  pgcli.query(q);
  k++;
}, 100);

setInterval(function(){
  var q='delete from pg_io_dbmon_test where k=' + (~~(Math.random()*k)) ;
  console.log(q);
  pgcli.query(q);
}, 99);

process.on('SIGINT', function (){
  console.log('SIGINT CAPTURED');
  pgcli.query('drop table dbmon_pg_io_dbmon_test_history_table cascade');
  setTimeout(function(){process.exit(1);}, 100);
});