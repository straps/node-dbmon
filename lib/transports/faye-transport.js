//Faye Tranport
var faye = require('faye'), bayeux;
var init=function init(opts){
  console.log('Faye Transport init, mount='+opts.transportsOpts.faye.mount+', channel='+opts.transportsOpts.faye.channel);

  bayeux = new faye.NodeAdapter({mount: opts.transportsOpts.faye.mount, timeout: opts.transportsOpts.faye.timeout});
  if (opts.transportsOpts.faye.server){
    bayeux.attach(opts.transportsOpts.faye.server);
  }else{
    bayeux.listen(opts.transportsOpts.faye.port);
  }

  var rxType=/_TYPE_/g; //compiled only the first time
  var me={
    notify:function(type, row){
      var channel=opts.transportsOpts.faye.channel.replace(rxType, type);

      console.log('Faye Notifying on channel '+channel+', row='+JSON.stringify(row));

      bayeux.getClient().publish(channel, row);
      return me;
    },
    stop:function(){
      bayeux.stop();
    },
    bayeux:bayeux
  };
  return me;

};

module.exports={init:init};
