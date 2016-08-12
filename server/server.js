const http = require('http');
var fs = require('fs');

const express = require('express');
const osc = require('osc');
const config = require('./config');
const melodies = JSON.parse(fs.readFileSync(__dirname+'/melodies.json', 'utf8'));
const loops = JSON.parse(fs.readFileSync(__dirname+'/loops.json', 'utf8'));

const app = express();


/*
*
* обновить таблицу лупов можно выполнив перевод следующие шаги:
*
* 1. из таблицы excel список загрузить к себе в формате CSV
* 2. сконвертировать его в JSON (можно тут: http://www.convertcsv.com/csv-to-json.htm)
* 3. сохранить результат в файл loops.json
*
*
* ниже результирующий json я дополнительно преобразую в дерево
*
* {player:id->instruments:id->{name, selected, live, loops:[{id, name}]}}
*
* */
const parsedLoops = loops.reduce((result, loop)=>{

    const playerId = loop['Player assignment (3p)'];
    const instrumentId = loop['Instrument ID'];
    const instrumentName = loop['Instrument name'];
    const loopId = loop['ID'];
    const loopName = loop['Codename'];

    //get users
    if(typeof result[playerId] === 'undefined'){
        result[playerId] = {}
    }

    //get users instruments
    if(typeof result[playerId][instrumentId] === 'undefined'){
        result[playerId][instrumentId] = {
            name: instrumentName,
            loops: [],
            selected: 0,
            live: false
        };
    }

    //get loop
    result[playerId][instrumentId].loops.push({
        id: loopId,
        name: loopName
    });

    return result;

}, {});

fs.writeFileSync(__dirname+'/parsedLoops.json', JSON.stringify(parsedLoops));
console.log(parsedLoops);


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

io.on('connection', (socket) => {
	console.log('socket client connection');

    let playerId = void 0;

    let client_state = void 0;

    // console.log(client_state.melodies);
    const playersId = Object.keys(parsedLoops).map(playerId => playerId);
    socket.emit('playersId', playersId);

    socket.on('set:playerId', function (playerId) {
        client_state = parsedLoops[playerId]
    });

    //simple - select melody in list
    socket.on('melody_selected', (rowid, melodyid) => {

        client_state.melodies[rowid].melodyid = melodyid;

        // sendOSC('/melody', [playerid, rowid, +melodyid]);

        socket.emit('state', client_state);

    });

    socket.on('switch_live', (rowid, live) => {
        // console.log('switch');
        client_state.melodies[rowid].live = live;
        const melodyid =  live?client_state.melodies[rowid].melodyid:0;

        sendOSC('/melody', [+playerid, +rowid, +melodyid]);

        socket.emit('state', client_state);
    })
});
