//EventEmitter Tranport
var init=function init(opts){
  console.log('EventEmitter Transport init');

  var me={
    notify:function(type, row){
      opts.transportsOpts.eventEmitter.eventEmitter.emit(type, row);
      return me;
    }
  };
  return me;

};

module.exports={init:init};