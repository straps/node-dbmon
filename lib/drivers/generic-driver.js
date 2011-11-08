var _=require('underscore')._;

var init=function init(opts, transports){
  console.log('Generic Driver Init');

  var shorts={'i':'insert','u':'update','d':'delete','t':'truncate'};

  //Dynamic Method Init
  var method=require('../methods/'+opts.driver+'-'+opts.method+'-method').init(opts);
  _.each(_.values(shorts), function(op){
    method.on(op, function(rows){
      if (rows && rows.length){
        _.each(rows, function(row){
          _.each(transports, function(t){
            t.notify(shorts[row.op], row);
          });
        });
      }else{
        t.notify(op);
      }
    });
  });

  var me={
    stop:function(callback){
      method.stop(callback);
    }
  };
  return me;
};

module.exports={init:init};