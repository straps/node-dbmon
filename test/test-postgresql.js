var assert=require('assert'), Step=require('step'), colors = require('colors'), events=require('events'), _=require('underscore')._,
    utils=require('./utils').utils,
    dbmon=require('../lib/dbmon');

utils.clogok('**********************').clogok('Starting Postgresql driver test, conString='+utils.pg.conString);

var pgcli=utils.pg.getCli();

var notifications=0;
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
    var toTearDown=this;

    var eventEmitter=new events.EventEmitter();

    var ch1=dbmon.channel({
      driver:'postgresql', monitor: 'insert,update,delete,truncate', method: 'trigger',
      table:'dbmontmp',
      keyfld: { name:'i', type:'integer' },
      driverOpts:{
        postgresql:{
          cli:pgcli
        }
      },
      transports: 'console,eventEmitter',
      transportsOpts:{
        eventEmitter:{
          eventEmitter:eventEmitter
        }
      }
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

    //Stop
    setTimeout(toTearDown, 1000);
  },
  function tearDown(){
    assert.ok(notifications===3, ('notifications='+notifications+', should be 3').red);
    utils.clogok('Disconnecting, everything is ok');
    pgcli.query('drop table dbmontmp cascade', function(){
      utils.pg.end();
    });
  }
);

