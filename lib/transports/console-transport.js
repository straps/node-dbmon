//Console Tranport
var init=function init(opts){
  console.log('Console Transport init');

  var me={
    notify:function(type, row){
      console.log('Console Transport Notification: '+type+', row='+JSON.stringify(row));
      return me;
    }
  };
  return me;

};

module.exports={init:init};