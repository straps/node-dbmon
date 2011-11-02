//Trigger method for postgresql driver
var events=require('events'), _=require('underscore')._, Step=require('step');

/** Return a base name for functions and trigger based on table name and options */
var name=function name(table, type){
  return 'dbmon_'+table+'_'+type+'_trigger';
};

/** Compose and returns CREATE FUNCTION query */
var triggerFnStr=function triggerFnStr(type, opts){
  if (opts.table){
    var n=name(opts.table, type),
        historyTable=name(opts.table, 'history')+'_table',
        shortType=type.charAt(0),
        rec=type==='delete'?'OLD':'NEW';
    var rv='CREATE OR REPLACE FUNCTION '+n+'_fn() RETURNS trigger AS $$\n'+
              'DECLARE\n'+
              'BEGIN\n'+
                  (opts.keyfld.name && opts.keyfld.type?
                    'INSERT INTO '+historyTable+' (op, k, oldk)'+
                      (type==='truncate'?
                        'VALUES (\''+shortType+'\', NULL, NULL);\n':
                        //If UPDATE, save also the old key field value
                        'VALUES (\''+shortType+'\', '+rec+'.'+opts.keyfld.name+', '+(type==='update'?'OLD.'+opts.keyfld.name:rec+'.'+opts.keyfld.name)+');\n'
                      )
                  :'')+
                'NOTIFY '+n+';\n'+
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
  var n=name(opts.table, type);
  var rv='CREATE TRIGGER '+n+' AFTER '+type+' ON '+opts.table+' FOR EACH '+(type==='truncate'?'STATEMENT':'ROW')+' EXECUTE PROCEDURE '+n+'_fn();';
  return rv;
};
/** Compose and returns CREATE TABLE query for history table */
var historyTableStr=function historyTableStr(opts){
  var n=name(opts.table, 'history')+'_table';
  var rv= 'DROP TABLE IF EXISTS '+n+' CASCADE; '+
          'CREATE TABLE '+n+' (id serial primary key, op char(1), k '+opts.keyfld.type+', oldk '+opts.keyfld.type+');';
          //'CREATE INDEX ix_'+n+'_op ON '+n+' (op);';
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
  var historyId=-1, historyTable=name(opts.table, 'history')+'_table',
      historySql='select op,k,oldk,id from '+historyTable+' where id>$1 order by id',
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
    function createTriggerStuff(err){
      if (err){ console.log(err.message); }
      _.each(types, function(type){
        var chname=name(opts.table, type);
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

  return me;
};

module.exports={init:init};
