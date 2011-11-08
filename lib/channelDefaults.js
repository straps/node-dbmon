/** Dbmon channel defaults */
var d={
  /** Database driver to use; postgresql8, postgresql9, mysql, oracle, etc...
      REQUIRED */
  driver: null,
  /** Driver dedicated opts */
  driverOpts:{
    postgresql:{
      /** connected client, REQUIRED */
      cli:null
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
  /** Trigger condition; notification are sent only if it evaluates to true;
      Can be an underscore template; input will be {rec:'NEW'} for insert/update or {rec:'OLD'} for delete;
      it is not considered for filesystem driver and for truncate triggers.
      Examples: cond:"<%= rec %>.codline='line01'" */
  cond: null,

  /** What to monitor, comma separated list of insert,update,delete or all */
  monitor: 'all',

  /** Type of monitor, trigger or polling */
  method: 'trigger',
  /** Options dedicated to method types */
  methodOpts:{
    trigger:{},
    polling:{}
  },

  /** Comma separated list of transports, console, eventEmitter, tcp, faye, nowjs, more to come, etc.. */
  transports: 'console',
  transportsOpts:{
    eventEmitter:{
      /** if transports contains eventEmitter, this is REQUIRED */
      eventEmitter:null
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

  /** Debounce notification support, avoid server and listeners overload on frequest updates */
  debouncedNotifications:100
};

module.exports={channelDefaults:d};