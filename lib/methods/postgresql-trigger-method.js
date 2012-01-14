//Trigger method for postgresql driver
var events=require('events'), _=require('underscore')._, Step=require('step');

/** Return a base name for functions and trigger based on table name and options */
var name=function name(opts, type){
  var rv='dbmon_'+opts.table+'_'+type+'_trigger';
  if (opts.addflds && opts.addflds.length){
    rv+='_'+_.map(opts.addflds,function(f){return f.name;}).join('_');
  }
  if (opts.cond){
    //Dynamic names lets create more than one trigger and trigger fn
    rv+='_'+opts.cond.replace(/\W/g, '_').replace(/_+/g, '_');
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
                'NOTIFY '+n+';\n'+
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
  console.log('PostgreSQL Trigger Method Init');

  //The returned object is an eventemitter, so others can listen for events easily
  var me=new events.EventEmitter(),
      cli=opts.driverOpts[opts.driver].cli;

  //Normalize type of events
  var types=opts.monitor.split(',');
  types=_.map(types, function(t){return t.trim().toLowerCase()});

  //Required for PostgreSQL 8.x
  cli.query('create language plpgsql;', function(){ /*plpgsql is created only the first time, an error could occour*/ });

  //Time to notify all listeners
  var historyId=-1, historyTable=name(opts, 'history')+'_table',
      addflds=opts.addflds&&opts.addflds.length?','+_.map(opts.addflds,function(f){return f.name;}).join(','):'',
      historySql='select op,k,oldk,id'+addflds+' from '+historyTable+' where id>$1 order by id',
      pendingRequests=0;
  var onNotification=function(type){
    if (opts.keyfld.name && opts.keyfld.type){
      var shortType=type.charAt(0);
      pendingRequests++;
      cli.query(historySql, [historyId], function(err, res){
        if (!--pendingRequests){
          historyId=res.rows[res.rows.length-1].id;
          me.emit(type, res.rows);
        }
      });
    }else{
      me.emit(type);
    }
  };

  //If keyfld is not specified, I'll try to notify always clients for changes */
  if (opts.keyfld.name && opts.keyfld.type && opts.debouncedNotifications){
    onNotification=_.debounce(onNotification, opts.debouncedNotifications);
  }

  Step(
    function createHistoryTableIfNecessary(){
      if (opts.keyfld.name && opts.keyfld.type){
        cli.query(historyTableStr(opts), this);
      }else{
        console.log('postgresql-trigger-method.js, history table not created, opts.keyfld or opts.keytype not valid');
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
      _.each(types, function(type){
        var chname=name(opts, type);
        cli.query(triggerFnStr(type, opts), function(err){
          if (err){ console.log(err.message); }
          cli.query(triggerStr(type, opts), function(err){
            if (err){ console.log(err.message); }
            //Listening for NOTIFYs
            cli.query('LISTEN '+chname, function(err){
              if (err){ console.log(err.message); }
            });

            cli.on('notification', function(data){
              if (data.channel===chname){
                onNotification(type);
              }
            });
          });
        });
      });
    }
  );

  me.stop=function(callback){
    var asyncCallback=_.after((types.length*2)+1, callback);

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
