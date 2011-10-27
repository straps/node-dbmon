var assert=require('assert'), utils=require('./utils').utils, dbmon=require('../lib/dbmon'),
    events=require('events'), _=require('underscore')._, fs=require('fs');

var notifications=0,
    eventEmitter=new events.EventEmitter();

var dir='/tmp/dbmon', path=dir+'/dbmon-test-filesystem.tmp';

try {
  fs.unlinkSync(path);
  fs.rmdirSync(dir);
}catch(e){}
try {
  fs.mkdirSync(dir, '777');
}catch(e){}


var channel=dbmon.channel({
  driver:'filesystem',
  driverOpts:{
    filesystem:{
      root:dir
    }
  },
  method:'inotifywait',
  transports:'faye',
  transportsOpts:{
    faye:{
      channel:'/dbmon'
    }
  }
});

//Subscribing from server
channel.transports[0].bayeux.getClient().subscribe('/dbmon', function(row){
  notifications++;
  console.log('on channel /dbmon, row='+JSON.stringify(row));
});


setTimeout(function(){
  console.log('Creating '+path);
  var f=fs.openSync(path, 'w+');                                      //fire insert

  fs.writeSync(f, 'testing update');                                  //fire update
  fs.closeSync(f);
  fs.unlinkSync(path);                                                //fire delete

  setTimeout(function(){
    utils.assertclog(notifications===3, 'Everything is OK', 'Theres Something Wrong, emitted notifications='+notifications);

    channel.stop();
    process.exit(0);

  }, 100);

}, 500);