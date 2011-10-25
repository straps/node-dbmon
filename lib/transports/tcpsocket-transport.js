//TCP Socket Tranport
var init=function init(opts){
  console.log('TCP Socket Transport init');
  var me={
    notify:function(type, row){
      opts.transportsOpts.tcpsocket.client.write(JSON.stringify(row));
      return me;
    }
  };
  return me;
};
module.exports={init:init};