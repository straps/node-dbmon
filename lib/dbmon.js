// DbMon - Copyright Francesco Strappini <f@strx.it> (MIT Licensed)
var _=require('underscore')._,
    channelDefaults=require('./channelDefaults').channelDefaults;

var dbmon={
  version : '1.0.0'
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
    transports.push(require('./transports/'+t+'-transport').init(opts));
  });

  //Main Object to Return
  var me={
    //Dynamic driver initialization
    driver:require('./drivers/'+opts.driver+'-driver').init(opts, transports),

    start:function(){}
  };
  return me;
};

module.exports=dbmon;