var assert=require('assert'), Step=require('step'), colors = require('colors'), events=require('events'), _=require('underscore')._,
    utils=require('./utils').utils,
    dbmon=require('../lib/dbmon');

utils.clogok('**********************').clogok('Starting Postgresql driver test, conString='+utils.pg.conString);

var pgcli=utils.pg.getCli();

var notifications=0, dbmonChannel;
Step(
  function createTempTable(){
    utils.clogok('Creating Temp Table');
    pgcli.query('drop table if exists dbmontmp; create table dbmontmp (i integer primary key, v varchar(10));', this);
  },
  function fillTempTable(err){
    utils.chkerr(err).clogok('Fill Temp Table');
    pgcli.query('insert into dbmontmp values(0, \'zero\')', this);
  },
  function theFunPart(err){
    utils.chkerr(err).clogok('The Fun Part');
    var i, toTearDown=this;

    var eventEmitter=new events.EventEmitter();

    dbmonChannel=dbmon.channel({
      driver:'postgresql', monitor: 'insert,update,delete,truncate', method: 'trigger',
      table:'dbmontmp',
      keyfld: { name:'i', type:'integer' },
      driverOpts:{
        postgresql:{
          cli:pgcli
        }
      },
      transports: 'eventEmitter',
      transportsOpts:{
        eventEmitter:{
          eventEmitter:eventEmitter
        }
      },
      debouncedNotifications:0
    });

    _.each(['insert', 'update', 'delete', 'truncate'], function(op){
      eventEmitter.on(op, function(row){
        utils.clogok('EventEmitter on '+op+' called OK, row='+JSON.stringify(row));
        notifications++;
      });
    });

    //Triggering notifications
    setTimeout(function(){
      pgcli.query('insert into dbmontmp values (1, \'one\')', function(){
        //TEST ERROR
        pgcli.query('insert into dbmontmp values (1, \'one\')', function(err){
          assert.ok(err!==null, 'Duplicate values should not be permitted'.red);
        });
      });
      pgcli.query('update dbmontmp set v=\'ZERO\' where i=0');
      pgcli.query('delete from dbmontmp where i=0');
    }, 500);


    for (i=100; i<200; i++){
      setTimeout(function(x){
          // console.log('insert '+x);
          pgcli.query('insert into dbmontmp values ('+x+', \''+x+'\')', function(){});
      }, 500+(i*2/10), i);
    }

    //Huge query test
    setTimeout(function(){
      var q=[];
      for (i=200; i<300; i++){
        q.push('insert into dbmontmp values ('+i+', \''+i+'\')');
      }
      pgcli.query(q.join(';'), function(){});
    }, 800);

    for (i=0; i<50; i++){
      setTimeout(function(x){
        pgcli.query('insert into dbmontmp values ('+(x+1000)+', \''+(x+1000)+'\')', function(){});
      }, 500+i*100, i);
    }

    for (i=0; i<50; i++){
      setTimeout(function(x){
        pgcli.query('insert into dbmontmp values ('+(x+2000)+', \''+(x+2000)+'\')', function(){});
      }, 550+i*100, i);
    }

    for (i=0; i<50; i++){
      setTimeout(function(x){
        pgcli.query('insert into dbmontmp values ('+(x+3000)+', \''+(x+3000)+'\')', function(){});
      }, 300+i*110, i);
    }

    for (i=0; i<50; i++){
      setTimeout(function(x){
        pgcli.query('insert into dbmontmp values ('+(x+4000)+', \''+(x+4000)+'\')', function(){});
      }, 300+i*120, i);
    }

    //Stop
    setTimeout(toTearDown, 7000);
  },
  function tearDown(){
    utils.clogok('Everything is ok');
    dbmonChannel.stop(function(){
      assert.ok(notifications===403, ('notifications='+notifications+', should be 403').red);
      pgcli.query('drop table dbmontmp cascade', function(){
        utils.pg.end();
      });
    });
  }
);

