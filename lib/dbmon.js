// DbMon - Copyright Francesco Strappini <f@strx.it> (MIT Licensed)
var _=require('underscore')._,
    channelDefaults=require('./channelDefaults').channelDefaults;

var dbmon={
  version : '1.0.7'
};

dbmon.channel = function(opts){
  opts=_.extend({}, channelDefaults, opts);
  if (opts.monitor==='all') {
    opts.monitor='insert,update,delete,truncate';
  }

  //Dynamic Transports Init
  var transports=[];
  _.each(opts.transports.split(','), function(t){
    t=t.trim();
    //underscore does not support deep extend
    if (channelDefaults.transportsOpts[t]){
      opts.transportsOpts[t]=_.extend({}, channelDefaults.transportsOpts[t], opts.transportsOpts[t]);
    }
    if (t){
      transports.push(require('./transports/'+t+'-transport').init(opts));
    }
  });

  //Main Object to Return
  var me={
    //Dynamic driver initialization
    // driver:require('./drivers/'+opts.driver+'-driver').init(opts, transports),

    transports:transports,

    stop:function(callback){
      callback=callback || function(){};
      me.driver.stop(callback);
    }
  };
  me.driver=require('./drivers/'+opts.driver+'-driver').init(opts, transports);

  return me;
};

module.exports=dbmon;