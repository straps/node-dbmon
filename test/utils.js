// Test Utils
var colors=require('colors'), assert=require('assert'), pg=require('pg');

var u={
  /** PostgreSQL facilities */
  pg:{
    cli:null,
    requests:0,
    conString:'tcp://postgres@localhost:5432/template1',
    getCli:function(){
      u.pg.requests++;
      if (!u.pg.cli){
        console.log(u.pg.conString);
        var pg=require('pg');
        u.pg.cli=new pg.Client(u.pg.conString);
        u.pg.cli.connect();
      }
      return u.pg.cli;
    },
    end:function(){
      if (!--u.pg.requests){
        u.pg.cli.end();
      }
    }
  },

  /** Color and log facilities */
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
  assertclog:function(cond, oklog, kolog){
    assert.ok(cond, kolog);
    u.clogok(oklog);
    return u;
  },
  chkerr:function(err){
    assert.ok(!err, err&&err.message.red);
    return u;
  }
};

module.exports={utils:u};
