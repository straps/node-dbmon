//Socket.io Tranport
var _=require('underscore')._;
var init=function init(opts){
  //Simple shortcut
  var sio=opts.transportsOpts.socketio;

  console.log('Socket.io Transport init, event='+sio.event);

  //Socket.io io object creation
  if (!sio.io){
    console.log('Socket.io Transport, creating io object');
    sio.io=require('socket.io').listen(sio.server || sio.port);
  }else{
    console.log('Socket.io Transport, io object exists');
  }

  //Socket.io namespace support
  if (sio.io && sio.namespace){
    var namespace=sio.namespace.indexOf('/')===0?sio.namespace:'/'+sio.namespace;
    sio.io.of(namespace);
  }

  //Use underscore templating for function name templating
  var tcompiled=_.template(sio.event);

  if (sio.io){
    sio.io.on('connection', function(socket){
      console.log('socket connected');
    });
  }

  var me={
    notify:function(type, row){
      console.log('Socket.io transport calling '+sio.event);
      var event=tcompiled(row);

      if (sio.io){
        sio.io.sockets.emit(event, row);
      }else{
        console.log('Socket.io Transport, io dont exists yet');
      }

      return me;
    },
    stop:function(){
    }
  };
  return me;
};

module.exports={init:init};
