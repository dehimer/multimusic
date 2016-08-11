const http = require('http');
var fs = require('fs');

const express = require('express');
const osc = require('osc');
const config = require('./config');
console.log(__dirname+'/melodies.json');
const melodies = JSON.parse(fs.readFileSync(__dirname+'/melodies.json', 'utf8'));

const app = express();

/* hot reload for webpack */
if(process.env.npm_lifecycle_event === 'dev')
{

	console.log('WHR');
  	const webpack = require('webpack');
	const webpackConfig = require('./../webpack/common.config.js');
	const compiler = webpack(webpackConfig);

	app.use(require('webpack-dev-middleware')(compiler, {
		noInfo: false, publicPath: webpackConfig.output.publicPath,
	}));

	app.use(require('webpack-hot-middleware')(compiler, {
		log: console.log, path: '/__webpack_hmr', heartbeat: 10 * 1000,
	}));
};

/* serve static */
app.use(express.static(__dirname + '/client'));

app.get(/^\/$/, (req, res) => {
  	res.sendFile(__dirname + '/client/index.html');
});

// app.get(/^\/fonts\/*$/, (req, res) => {
//     res.sendFile(__dirname + '/client/index.html');
// });

app.get(/^\/serverip$/, (req, res) => {
    res.send(req.headers.host)
});

// app.get('*', (req, res) => {
//     console.log('!');
// 	res.redirect('/');
// });


const server = new http.Server(app);
const PORT = process.env.PORT || 3001;

server.listen(PORT);


/*
*
* SERVE REQUEST TO MUSICAL SERVER
*
* */

var udpPort = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: 57121
});

// Listen for incoming OSC bundles.
udpPort.on("bundle", function (oscBundle, timeTag, info) {
    console.log("An OSC bundle just arrived for time tag", timeTag, ":", oscBundle);
    console.log("Remote info is: ", info);
});

// Open the socket.
udpPort.open();

const { music_server } = config;

const sendOSC = (message, params) => {
    console.log(message);
    console.log(params);
    // Send an OSC message to, say, SuperCollider
    udpPort.send({
        address: message,
        args: params
    }, music_server.address, music_server.port);

};


/*
*
* SERVE MOBILE CLIENTS PART
*
* */

const io = require('socket.io')(server);
let lastClientId = 1;
io.on('connection', (socket) => {
	console.log('socket client connection');

    const playerid = ++lastClientId;

    let client_state = {
        melodies: melodies.reduce((res, row)=>{
            res[row.id] = row;
            return res;
        }, {})
    };

    // console.log(client_state.melodies);

	socket.emit('state', client_state);


    socket.on('melody_selected', (rowid, melodyid) => {

        client_state.melodies[rowid].melodyid = melodyid;

        sendOSC('/melody', [playerid, rowid, +melodyid]);

        socket.emit('state', client_state);

    });

    socket.on('switch_live', (rowid, live) => {

        live = live && client_state.melodies[rowid].melodyid;
        client_state.melodies[rowid].live = live;

        sendOSC('/live', [playerid, live?1:0]);

        socket.emit('state', client_state);
    })
});
