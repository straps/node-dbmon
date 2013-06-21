/** Dbmon channel defaults */
var d={
  /** Database driver to use; postgresql, mysql, oracle, etc...
      REQUIRED */
  driver: null,

  /** Driver dedicated opts */
  driverOpts:{
    postgresql:{
      /** connected client, required if connStr is null */
      cli:null,

      /** connection string, required if cli is null, in the classical form tcp://user:pwd@ip:port/db */
      connStr:null,

      /** Table/Function/Trigger base name; if null, a base name will be generated combining other options */
      baseObjectsName:null
    }
  },

  /** Table to monitor for changes,
      REQUIRED */
  table: null,
  /** Key field info, returned as k where notifying changes */
  keyfld:{
    /** Key Field Name, ie: 'id' */
    name:null,
    /** Key Field Type, ie: 'integer', or 'varchar(100)', etc.. */
    type:null
  },
  /** Additional fields to send to listeners
      Can also be an object where the key is the field name and value is his type, ie:
        addflds:{description:'varchar(250)'}
  */
  addflds:[
    /* example:
    {name:'description', type:'varchar(250)'}
    */
  ],
  /** Trigger condition; notification are sent only if it evaluates to true;
      Can be an underscore template; input will be {rec:'NEW'} for insert/update or {rec:'OLD'} for delete;
      it is not considered for filesystem driver and for truncate triggers.
      Examples: cond:"<%= rec %>.codline='line01'" */
  cond: null,

  /** What to monitor, comma separated list of insert,update,delete,truncate or all */
  monitor: 'all',

  /** Type of monitor, trigger or polling */
  method: 'trigger',
  /** Options dedicated to method types */
  methodOpts:{
    trigger:{},
    polling:{}
  },

  /** Comma separated list of transports, console, eventEmitter, tcp, faye, nowjs, socketio, more to come, etc.. */
  transports: 'console',
  transportsOpts:{
    eventEmitter:{
      /** if transports contains eventEmitter, this is REQUIRED */
      eventEmitter:null
    },
    socketio:{
      /** Can be an http server object or an express object */
      server:null,
      /** Socket.io core object to notify clients, created at runtime if null */
      io:null,
      /** Port to listen to, required if server and io are null */
      port:null,

      /** Event emitted when something changes
          Can be passed an Undercore.js template as specified here http://documentcloud.github.com/underscore/#template
          Parameters of the template will be the row notified containing fields k,oldk,op,id, ie:
          fn:'changeKey<%= k %>' */
      event:'dbmonNotify',
      /** Socket.io namespace support */
      namespace:''
    },
    faye:{
      /** Can be an http server object or an express object, if null faye initialize a
          it's own http server communicating on specified port */
      server:null,
      port:8000,
      /** Faye mount and timeout, see: http://faye.jcoglan.com/node.html */
      mount:'/faye',
      timeout: 45,
      /** Channel to publish updates on; _TYPE_ is replaced at runtime with insert/update/delete based on type of update */
      channel:'/dbmon'
    },
    nowjs:{
      /** Can be an http server object or an express object */
      server:null,
      /** Function name to call for notifying clients
          Can be passed an Undercore.js template as specified here http://documentcloud.github.com/underscore/#template
          Parameters of the template will be the row notified containing fields k,oldk,op,id, ie:
          fn:'changeKey<%= k %>' */
      fn:'dbmonNotify',
      /** Nowjs core object to notify clients, created at runtime if null */
      everyone:null
    }
  },

  /** Debounce notification support, avoid server and listeners overload on frequent updates; 0=debounce disabled */
  debouncedNotifications:100
};

module.exports={channelDefaults:d};