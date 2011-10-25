// Test Utils
var colors=require('colors'), assert=require('assert');

var u={
  arrcolor:function(arr, color){
    for (var i=0; i<arr.length; i++){
      arr[i]=arr[i][color];
    }
    return arr;
  },
  clogok:function(){
    console.log.apply(this, u.arrcolor(arguments, 'green'));
    return u;
  },
  clogko:function(){
    console.log.apply(this, u.arrcolor(arguments, 'red'));
    return u;
  },
  chkerr:function(err){
    assert.ok(!err, err&&err.message.red);
    return u;
  }
};

module.exports={utils:u};
