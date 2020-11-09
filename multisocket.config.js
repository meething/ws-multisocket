module.exports = {
  apps : [{
    name: 'ws-multisocket',
    script: 'server.js',
    watch: true
    env: {
      SSL : false,
      SSLKEY : 'cert/server.key',
      SSLCERT  : 'cert/server.cert',
      DEBUG : false
    }
  }]
};
