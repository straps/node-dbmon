var _=require('underscore')._;

var init=function init(opts, transports){
  console.log('Postgresql Driver Init');

  var shorts={'i':'insert','u':'update','d':'delete','t':'truncate'};

  //Dynamic Method Init
  var method=require('../methods/'+opts.driver+'-'+opts.method+'-method').init(opts);
  _.each(['insert', 'update', 'delete', 'truncate'], function(op){
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
  };
  return me;
};

module.exports={init:init};