var spawn = require('child_process').spawn,
    events=require('events'),
    _=require('underscore');

var init=function init(opts){
  var me=new events.EventEmitter();

  var nChanges=0;

  var inotifywait = spawn('inotifywait', ['-m', '-r', '-q', '--format', '"%e %w%f"', opts.driverOpts[opts.driver].root]);

  console.log('Monitoring '+opts.driverOpts[opts.driver].root+' and subfolders');

  inotifywait.stderr.setEncoding('utf8');
  inotifywait.stderr.on('data', function (data) {
    if (/^execvp\(\)/.test(data)) {
      console.log('ERR: Failed to start inotifywait process.');
    }
  });

  inotifywait.stdout.on('data', function(data){
    data=''+data;
    _.each(data.split('\n'), function(row){
      if (row){
        //Remove " chars
        row=row.substr(1, row.length-2);

        //console.log(row);

        var isep=row.indexOf(' '),
            cmds=row.substr(0, isep),
            file=row.substr(isep+1);

        var type=cmds.indexOf('ISDIR')>-1?'d':'f';

        _.each(cmds.split(','), function(cmd){
          switch(cmd){
            case 'CREATE':
            case 'MOVED_TO':
              me.emit('insert', [{op:'i', k:file, oldk:file, id:++nChanges, type:type}]);
              break;
            case 'CLOSE_WRITE':
              me.emit('update', [{op:'u', k:file, oldk:file, id:++nChanges, type:type}]);
              break;
            case 'DELETE':
            case 'MOVED_FROM':
              me.emit('delete', [{op:'d', k:file, oldk:file, id:++nChanges, type:type}]);
              break;
          }
        });
      }
    });
  });

  me.stop=function(callback){
    inotifywait.kill();
    callback();
  };

  return me;
};

module.exports={init:init};