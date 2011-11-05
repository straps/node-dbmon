//Nowjs Tranport
var _=require('underscore')._;
var init=function init(opts){
  console.log('Nowjs Transport init, fn='+opts.transportsOpts.nowjs.fn);

  if (!opts.transportsOpts.nowjs.everyone){
    console.log('Nowjs Transport, creating everyone object');
    opts.transportsOpts.nowjs.everyone=require('now').initialize(opts.transportsOpts.nowjs.server);
  }else{
    console.log('Nowjs Transport, everyone object exists');
  }

  //Use underscore templating for function name templating
  var tcompiled=_.template(opts.transportsOpts.nowjs.fn);

  var me={
    notify:function(type, row){
      console.log('Nowjs transport calling '+opts.transportsOpts.nowjs.fn);
      var fnName=tcompiled(row);
      var fn=opts.transportsOpts.nowjs.everyone.now[fnName];
      if (fn){
        fn(row);
      }else{
        console.log('Nowjs Transport, everyone.'+fnName+' dont exists yet');
      }
      return me;
    },
    stop:function(){
    }
  };
  return me;
};

module.exports={init:init};
