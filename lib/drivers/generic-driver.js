var _=require('underscore')._;

var init=function init(opts, transports){
  console.log('Generic Driver Init');

  var shorts={'i':'insert','u':'update','d':'delete','t':'truncate'};

  //Make opts.addflds an object array in case it is a pure object
  //{description:'varchar(100)'} ==> [{name:'description', type:'varchar(100)'}]
  if (opts.addflds){
    if (_.isObject(opts.addflds) && !_.isArray(opts.addflds)){
      var addflds=[];
      _.each(opts.addflds, function(type,name){
        addflds.push({name:name, type:type});
      });
      opts.addflds=addflds;
    }
  }

  //Dynamic Method Init
  var method=require('../methods/'+opts.driver+'-'+opts.method+'-method').init(opts);
  _.each(_.values(shorts), function(op){
    method.on(op, function(rows){
      // console.log('generic-driver method.on('+op+')');
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