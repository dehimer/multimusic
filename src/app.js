import $ from 'jquery';
import io from 'socket.io-client';
import IScroll from 'iscroll';

import './styles/base.css';
import './styles/app.css';


let root_el = $('#root');

//show first pages
const stages = {
    first: function(playersid, socket) {
        console.log(playersid);
        let content = $(`
            <div class='players-id'>
                <div class='players-id__logo'>
                    <img src='logo.jpg'/>
                </div>
                <div class='players-id__message'>Выберите номер игрока</div>
                <div class='players-id__buttons'>
                ${
                    playersid.map(playerid => {
                        return (`<div data-id='${playerid}' class='players-id__buttons-button'>
                            ${playerid}
                        </div>`)
                    }).join('')
                }
                </div>
            </div>
        `);

        root_el.html(content);

        root_el.find('.players-id__buttons-button').on('click', (e) => {

            const playerid = e.target.dataset.id;

            // alert(playerid);
            socket.emit('set:playerId', playerid);

        });
    },
    second: function(socket) {
        let content = $(`
            <div class='header'>
            
                <div class='header__column'>
                    <div class='logo'>
                        <img src='logo.jpg'/>
                    </div>
                </div>
                <div class='header__column'>
                    <div class='progress-bar'>
                        <div class='progress-bar__content'>
                            <div style='width:100%;'>Положение в такте</div>
                            <div class='progress-bar__line-wrapper'>
                                <div class='progress-bar__line'></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class='header__column'>
                    <div class='tacts-bar'>
                        <div class='tacts-bar__content'>
                            <div style='width:100%;'>Тактов сыграно</div>
                            <div class='tacts-bar__line-wrapper'>
                                <div class='tacts-bar__line tacts-bar__line_active'></div>
                                <div class='tacts-bar__line'></div>
                                <div class='tacts-bar__line'></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class='content'>
                <div class='column'>
                    <div class='column__content'>
                        <div class='melodies__list-name melodies__list-name-left'></div>
                        <div class='melodies__list-wrapper-wrapper'>
                            <div class='melodies__list-scrollline'></div>
                            <div class='melodies__list-wrapper'>
                                <div class='melodies__list melodies__list-left'></div>
                            </div>
                        </div>
                        <div class='live-button__wrapper'>
                            <div class='live__button live__button-left'>
                                <div class='live__button-text'>LIVE</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class='column'>
                    <div class='column__content'>
                        <div class='melodies__list-name melodies__list-name-right'></div>
                        <div class='melodies__list-wrapper-wrapper'>
                            <div class='melodies__list-scrollline'></div>
                            <div class='melodies__list-wrapper'>
                                <div class='melodies__list melodies__list-right'></div>
                            </div>
                        </div>
                        <div class='live-button__wrapper'>
                            <div class='live__button live__button-right'>
                                <div class='live__button-text'>LIVE</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `);

        root_el.html(content);

        const lists = {
            els: {
                left: root_el.find('.melodies__list-left'),
                right: root_el.find('.melodies__list-right')
            },
            name_els: {
                left: root_el.find('.melodies__list-name-left'),
                right: root_el.find('.melodies__list-name-right')
            },
            scrolls: {
                create: function(){
                    // console.log(this);

                    Object.keys(this.els).map(sideName=>{
                        const el = this.els[sideName];

                        this.scrolls[sideName] = new IScroll(el.parent()[0], {
                            mouseWheel: true,
                            scrollbars: true,
                            // fadeScrollbars: true,
                            tap: true,
                            // scrollbars: 'custom',
                            resizeScrollbars: false
                        });
                    });
                }
            },
            update: function(sideName, instrument){
                // console.log(instrument.name+':'+!!this.name_els);
                this.name_els[sideName].html(instrument.name);
                this.els[sideName].html(this.generate(instrument));
                this.scrolls[sideName].refresh();
            },
            generate: (instrument) => {

                return instrument.loops.map( loop => {

                    let classNames = '';

                    if(loop.id === instrument.selectedLoopId) {
                        classNames += ' melodies__list-item_active'
                    } else if(loop.id === instrument.liveLoopId) {
                        classNames += ' melodies__list-item_lived'
                    }

                    // console.log(instrument);
                    return (`
                        <div class='melodies__list-item ${classNames}' data-id='${loop.id}' data-instrumentid='${instrument.id}'>
                            <span>${loop.name}</span>
                        </div>
                    `)}
                ).join('');
            },
            init: function(){
                // console.log()
                this.scrolls.create.call(this);
            }
        };

        lists.init();


        const progressLine = {
            el: root_el.find('.progress-bar__line'),
            // getColor: (value) => {
            //     //value from 0 to 1
            //     var hue=((1-value)*120).toString(10);
            //     return ['hsl(',hue,',100%,50%)'].join('');
            // },
            nextTick: function (volume) {
                const newVolume = typeof volume === 'undefined' ? Math.random() : volume;
                // const volumeColor = this.getColor(newVolume*0.9);
                // console.log(newVolume+':'+volumeColor);
                this.el.css({
                    width: newVolume*100
                    // backgroundColor: volumeColor
                });
            },
            switch: function (active) {
                console.log(active);
                if(active){
                    clearInterval(this.intF);
                    this.intF = setInterval(::this.nextTick, 100)
                }else{
                    this.nextTick(0);
                    clearInterval(this.intF);
                }

            }
        };

        const liveButtons = {
            els: {
                left: root_el.find('.live__button-left'),
                right: root_el.find('.live__button-right')
            },
            switch: function (sideName, instruments) {

                const live = +instruments.liveLoopId >0 && +instruments.liveLoopId === +instruments.selectedLoopId;

                if(live){
                    this.els[sideName].addClass('live__button_active');
                }else{
                    this.els[sideName].removeClass('live__button_active');
                }
            }
        };

        return function(instruments) {
            const instrumentsId = Object.keys(instruments);
            console.log(instruments);
            const leftInstrument = instruments[instrumentsId[0]];
            const rightInstrument = instruments[instrumentsId[1]];

            lists.update('left', leftInstrument);
            lists.update('right', rightInstrument);

            progressLine.switch(leftInstrument.live || rightInstrument.live);

            liveButtons.switch('left', leftInstrument);
            liveButtons.switch('right', rightInstrument);


            root_el.find('.melodies__list-item').on('tap', (e) => {
                // console.log(e.target.dataset);
                const instrumentId = +e.target.dataset.instrumentid;
                const loopId = +e.target.dataset.id;

                if(loopId === instruments[instrumentId].selectedLoopId){
                    socket.emit('melody_selected', instrumentId, 0);
                }else{
                    socket.emit('melody_selected', instrumentId, loopId);
                }
            });

            liveButtons.els['left'].off('click').on('click', () => {
                const instrumentId = instrumentsId[0];
                socket.emit('switch_live', instrumentId);
            });
            liveButtons.els['right'].off('click').on('click', () => {
                const instrumentId = instrumentsId[1];
                socket.emit('switch_live', instrumentId);
            })
        };

    }
};

$.get('/serverip', (serverip) => {

    const socket = io('http://'+serverip);
    socket.on('playersId', (playersId) => {
        stages.first(playersId, socket);
    });

    let refresh = void 0;
    socket.on('state', (state) => {
        // console.log(state);
        if(typeof refresh !== 'function') {
            refresh = stages.second(socket);
        }
        refresh(state)
    });

});


document.ontouchmove = (e) => {
    e.preventDefault();
};
