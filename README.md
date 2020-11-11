<img src="https://i.imgur.com/XS79fTC.png" width=200> <img width="100" alt="mozilla-builders" src="https://user-images.githubusercontent.com/1423657/81992335-85346480-9643-11ea-8754-8275e98e06bc.png">

#### WSS MultiSocket
Single `HTTP/S` server providing multiple ephemeral `WebSocket` instances with path based routing and mesh isolation.

### Configuration
* requires a valid set of SSL/TLS certificates _(letsencrypt)_

### Installation
```
npm install
```

### Usage
#### npm
Explode your ENV variables manually and launch using npm:
```
PORT=443 SSLKEY=/path/to/privkey.pem SSLCERT=/path/to/fullchain.pem npm start
```
#### pm2
Configure the options in `multisocket.config.js` and launch using pm2:
```
pm2 start multisocket.config.js
```

###### Credits
This project is a component of [Gun Meething](https://github.com/meething/webrtc-gun) powered by [GunDB](https://gun.eco)


