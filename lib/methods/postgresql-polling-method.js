//Trigger method for postgresql driver
var events=require('events'), _=require('underscore')._, Step=require('step');

var clog=function(text){
  console.log(Date.now()+' '+text);
};

/** Return a base name for functions and trigger based on table name and options */
var name=function name(opts, type){
  var rv;

  if (opts.driverOpts.postgresql.baseObjectsName){
    rv='dbmon_'+opts.driverOpts.postgresql.baseObjectsName+'_'+type;
  }else{
    rv='dbmon_'+opts.table+'_'+type+'_trigger';
    if (opts.addflds && opts.addflds.length){
      rv+='_'+_.map(opts.addflds,function(f){return f.name;}).join('_');
    }
    if (opts.cond){
      //Dynamic names lets create more than one trigger and trigger fn
      rv+='_'+opts.cond.replace(/\W/g, '_').replace(/_+/g, '_');
    }
  }

  //63=Max postgresql function length
  return rv.substr(0, 55);
};

/** Compose and returns CREATE FUNCTION query */
var triggerFnStr=function triggerFnStr(type, opts){
  if (opts.table){
    var n=name(opts, type),
        historyTable=name(opts, 'history')+'_table',
        shortType=type.charAt(0),
        rec=type==='delete'?'OLD':'NEW',
        cond=opts.cond && type!=='truncate'?_.template(opts.cond, {rec:rec}):'',
        //Additional fields support
        addflds=opts.addflds&&opts.addflds.length?','+_.map(opts.addflds,function(f){return f.name;}).join(','):'',
        addfldsNulls=opts.addflds&&opts.addflds.length?','+_.map(opts.addflds,function(f){return 'NULL';}).join(','):'',
        addfldsValues=opts.addflds&&opts.addflds.length?','+_.map(opts.addflds,function(f){return rec+'.'+f.name;}).join(','):'';
    var rv='CREATE OR REPLACE FUNCTION '+n+'_fn() RETURNS trigger AS $$\n'+
              'DECLARE\n'+
              'BEGIN\n'+
                  (cond?'IF '+cond+'\nTHEN\n':'')+
                  (opts.keyfld.name && opts.keyfld.type?
                    'INSERT INTO '+historyTable+' (op, k, oldk'+addflds+')'+
                      (type==='truncate'?
                        'VALUES (\''+shortType+'\', NULL, NULL'+addfldsNulls+');\n':
                        //If UPDATE, save also the old key field value
                        'VALUES (\''+shortType+'\', '+rec+'.'+opts.keyfld.name+', '+(type==='update'?'OLD.'+opts.keyfld.name:rec+'.'+opts.keyfld.name)+addfldsValues+');\n'
                      )
                  :'')+
                // 'NOTIFY '+n+';\n'+
                (cond?'END IF;\n':'')+
                'RETURN '+rec+';\n'+
              'END;\n'+
              '$$ LANGUAGE plpgsql;';

    return rv;
  }else{
    console.log('postgresql-trigger-method.js, opts.table REQUIRED');
  }
};
/** Compose and returns CREATE TRIGGER query */
var triggerStr=function triggerStr(type, opts){
  var n=name(opts, type);
  var rv='CREATE TRIGGER '+n+' AFTER '+type+' ON '+opts.table+' FOR EACH '+(type==='truncate'?'STATEMENT':'ROW')+' EXECUTE PROCEDURE '+n+'_fn();';

  return rv;
};
/** Compose and returns CREATE TABLE query for history table */
var historyTableStr=function historyTableStr(opts){
  var n=name(opts, 'history')+'_table';
  var addflds=opts.addflds&&opts.addflds.length?','+_.map(opts.addflds,function(f){return f.name+' '+f.type;}).join(','):'';
  var rv= //'DROP TABLE IF EXISTS '+n+' CASCADE; '+
          'CREATE TABLE '+n+' (id serial primary key, op char(1), k '+opts.keyfld.type+', oldk '+opts.keyfld.type+addflds+');';

  return rv;
};

/** Main function, returns the main EventEmitter object used by the driver */
var init=function init(opts){
  console.log('PostgreSQL Polling Method Init');

  //The returned object is an eventemitter, so others can listen for events easily
  var me=new events.EventEmitter(),
      cli=opts.driverOpts[opts.driver].cli;

  if (!cli && opts.driverOpts[opts.driver].connStr){
    var pg=require('pg');
    cli=new pg.Client(opts.driverOpts[opts.driver].connStr);
    cli.connect();
  }

  //Normalize type of events
  var types=opts.monitor.split(',');
  types=_.map(types, function(t){return t.trim().toLowerCase()});

  //Required for PostgreSQL 8.x
  cli.query('create language plpgsql;', function(){ /*plpgsql is created only the first time, an error could occour*/ });

  //Time to notify all listeners
  var historyId=-1, historyTable=name(opts, 'history')+'_table',
      addflds=opts.addflds&&opts.addflds.length?','+_.map(opts.addflds,function(f){return f.name;}).join(','):'',
      historySql='select op,k,oldk,id'+addflds+' from '+historyTable+' where id>$1 order by id';

  var historyIdCache={};

  var startPolling=function(){
    var tab=name(opts, 'history')+'_table', q;
    q='select * from '+tab+' order by id desc limit 1';
    cli.query(q, function(err,res){

      var lastId=res && res.rows && res.rows.length ? res.rows[0].id : -1;

      var poll=function(){
        q='select * from '+tab+' where id>'+lastId+' order by id';
        // clog('pppppppppp poll, lastId='+lastId+', q='+q);
        cli.query(q, function(err,res){
          if (err) console.dir(err);

          if (res && res.rows && res.rows.length){
            _.each(res.rows, function(r){
              var op={i:'insert',u:'update',d:'delete'}[r.op];
              // clog('emitting "'+op+'" for '+JSON.stringify(r));
              me.emit(op, [r]);
            });
            lastId=res.rows[res.rows.length-1].id;
          }
          setTimeout(poll, 1000);

        });
      };
      poll();

    });
  };

  Step(
    function createHistoryTableIfNecessary(){
      if (opts.keyfld.name && opts.keyfld.type){
        cli.query(historyTableStr(opts), this);
      }else{
        console.log('postgresql-polling-method.js, history table not created, opts.keyfld or opts.keytype not valid');
        this();
      }
    },
    function emptyHistoryTable(err){
      if (err){ console.log(err.message); }
      var n=name(opts, 'history')+'_table';
      cli.query('truncate table '+n, this);
    },
    function createTriggerStuff(err){
      if (err){ console.log(err.message); }

      var afterAll=_.after(types.length, startPolling);

      _.each(types, function(type){
        var chname=name(opts, type);
        cli.query(triggerFnStr(type, opts), function(err){
          if (err){ console.log(err.message); }
          cli.query(triggerStr(type, opts), function(err){
            if (err){ console.log(err.message); }

            afterAll();

          });
        });
      });
    }
  );

  me.stop=function(callback){
    var asyncCallback=_.after((types.length*2)+1, function(){
      //check if db connection has been made by dbmon
      if (!opts.driverOpts[opts.driver].cli && cli){
        cli.end();
      }
      callback();
    });

    cli.query('DROP TABLE IF EXISTS '+name(opts, 'history')+'_table CASCADE', asyncCallback);
    _.each(types, function(t){
      var iname=name(opts, t);
      cli.query('DROP TRIGGER IF EXISTS '+iname+' on '+opts.table+' CASCADE', asyncCallback);
      cli.query('DROP FUNCTION IF EXISTS '+iname+'_fn() CASCADE', asyncCallback);
    });
  };

  return me;
};

module.exports={init:init};
