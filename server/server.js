const http = require('http');
var fs = require('fs');

const express = require('express');
const osc = require('osc');
const config = require('./config');
// const melodies = JSON.parse(fs.readFileSync(__dirname+'/melodies.json', 'utf8'));


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

udpPort.on("message", function (mes) {
    console.log("Mes: ", mes);
});

udpPort.on("loop", function (oscMsg) {
    console.log("An OSC message just arrived!", oscMsg);
});

// Open the socket.
udpPort.open();

const { music_server } = config;

const sendOSC = (message, params) => {
    console.log("Sending");
    console.log(message);
    console.log(params);
    console.log("---");
    // Send an OSC message to, say, SuperCollider
    udpPort.send({
        address: message,
        args: params
    }, music_server.address, music_server.port);
};

const getOSC = (message, cb) => {
    udpPort.on(message, cb);

    if(config.emulateMusicServer){
        if(message === '/step'){
            let num = 0;
            let time = 0;
            let nextStep = function () {
                num = (num+1)%3;
                time = 500+parseInt(2000*Math.random());
                cb([num+1, time]);
                setTimeout(nextStep, time);
            };
            nextStep();
        }
    }
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

    let client_state = {step:{num:0, time:0}};

    let parsedLoops = void 0;

    /*
        ВОТ ТУТ НАДО ВОЗВРАЩАТЬ СПИСОК ЛУПОВ
        пример в файле loops.json
     */
    const onLoop = function (instruments) {

        if(client_state.instruments){
            return;
        }

        parsedLoops = instruments.reduce((result, loop)=>{

            const playerId = loop['Playerassignment(3p)'];
            const instrumentId = loop['InstrumentID'];
            const instrumentName = loop['Instrumentname'];
            const loopId = loop['ID'];
            const loopName = loop['Codename'];

            //get users
            if(typeof result[playerId] === 'undefined'){
                result[playerId] = {}
            }

            //get users instruments
            if(typeof result[instrumentId] === 'undefined'){
                result[instrumentId] = {
                    id: instrumentId,
                    name: instrumentName,
                    loops: [],
                    selectedLoopId: 0,
                    live: false
                };
            }

            //get loop
            result[instrumentId].loops.push({
                id: loopId,
                name: loopName
            });

            return result;

        }, {});


        client_state.instruments = parsedLoops;
        socket.emit('state', client_state);
    };

    getOSC('/loop', onLoop);

    getOSC('/step', function (step) {
        // io.emit('step', step);
        client_state.step = {num:step[0], time:step[1]};
        console.log(step);
        if(client_state.instruments){
            socket.emit('state', client_state);
        }
    });



    // const playersId = Object.keys(parsedLoops).map(playerId => playerId);
    socket.emit('playersId', config.playersId);

    socket.on('set:playerId', function (newPlayerId) {
        console.log('set:playerId: '+newPlayerId);
        playerId = newPlayerId;

        sendOSC('/connect', playerId-1);

        if(config.emulateMusicServer){
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
            const loops = JSON.parse(fs.readFileSync(__dirname+'/loops.json', 'utf8'));
            const parsedLoops = loops.reduce((result, loop)=>{

                const playerId = loop['Playerassignment(3p)'];
                const instrumentId = loop['InstrumentID'];
                const instrumentName = loop['Instrumentname'];
                const loopId = loop['ID'];
                const loopName = loop['Codename'];

                //get users
                if(typeof result[playerId] === 'undefined'){
                    result[playerId] = {}
                }

                //get users instruments
                if(typeof result[playerId][instrumentId] === 'undefined'){
                    result[playerId][instrumentId] = {
                        id: instrumentId,
                        name: instrumentName,
                        loops: [],
                        selectedLoopId: 0,
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

            // onLoop(parsedLoops[playerId]);
            // fs.writeFileSync(__dirname+'/parsedLoops.json', JSON.stringify(parsedLoops));
            // console.log(parsedLoops);

            client_state.instruments = parsedLoops[playerId];
            socket.emit('state', client_state);
        } else {
            udpPort.on("message", function cb (mes) {
            

            if (mes.address == "/loops") {
                
                const loops = JSON.parse(fs.readFileSync(__dirname+'/loops.json', 'utf8'));
                const parsedLoops = loops.reduce((result, loop)=>{

                    const playerId = loop['Playerassignment(3p)'];
                    const instrumentId = loop['InstrumentID'];
                    const instrumentName = loop['Instrumentname'];
                    const loopId = loop['ID'];
                    const loopName = loop['Codename'];

                    //get users
                    if(typeof result[playerId] === 'undefined'){
                        result[playerId] = {}
                    }

                    //get users instruments
                    if(typeof result[playerId][instrumentId] === 'undefined'){
                        result[playerId][instrumentId] = {
                            id: instrumentId,
                            name: instrumentName,
                            loops: [],
                            selectedLoopId: 0,
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

                // onLoop(parsedLoops[playerId]);
                // fs.writeFileSync(__dirname+'/parsedLoops.json', JSON.stringify(parsedLoops));
                // console.log(parsedLoops);

                client_state.instruments = parsedLoops[playerId];
                socket.emit('state', client_state);

            }
            
        });
        }

    });

    //simple - select melody in list
    socket.on('melody_selected', (instrumentId, selectedLoopId) => {

        client_state.instruments[instrumentId].selectedLoopId = selectedLoopId;

        sendOSC('/local', [+playerId, +selectedLoopId]);


        socket.emit('state', client_state);

    });

    socket.on('switch_live', (instrumentId) => {

        if(client_state.instruments[instrumentId].liveLoopId != client_state.instruments[instrumentId].selectedLoopId) {
            client_state.instruments[instrumentId].liveLoopId = client_state.instruments[instrumentId].selectedLoopId;
        } else {
            client_state.instruments[instrumentId].liveLoopId = 0;
        }

        const liveLoopId =  client_state.instruments[instrumentId].liveLoopId;

        sendOSC('/live', [+playerId, +liveLoopId]);

        socket.emit('state', client_state);
    });
    // socket.on('disconnect', function () {
    //     playerId = void 0;
    // });
});
