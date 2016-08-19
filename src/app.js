import $ from 'jquery';
import io from 'socket.io-client';
import IScroll from 'iscroll';

import './styles/base.css';
import './styles/app.css';


let root_el = $('#root');

//show first pages
const stages = {
    first: function(playersid, socket) {
        // console.log(playersid);
        let content = $(`
            <div class='players-id'>
                <div class='players-id__logo'>
                    <img src='logo.jpg'/>
                </div>
                <div class='players-id__message-block'>
                    <div class='players-id__message'>
                        Выберите номер игрока
                    </div>
                </div>
                <div class='players-id__buttons'>
                ${
                    playersid.map(playerid => {
                        return (`<div data-id='${playerid}' class='players-id__buttons-button'>
                               <div class='players-id__buttons-button-text'>
                                    ${playerid}
                               </div>
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
            
                <div class='header__row'>
                    <div class='logo'>
                        <img src='logo.jpg'/>
                    </div>
                </div>
                <div class='header__row'>
                    <div class='header__column progress-bar'>
                        <div class='progress-bar__content'>
                            <div style='width:100%;'>Положение в такте</div>
                            <div class='progress-bar__line-wrapper'>
                                
                            </div>
                        </div>
                    </div>
                    <div class='header__column tacts-bar'>
                        <div class='tacts-bar__content'>
                            <div style='width:100%;'>Тактов сыграно</div>
                            <div class='tacts-bar__line-wrapper'>
                            </div>
                        </div>
                    </div>
                </div>
                
            </div>

            <div class='content'>
                <div class='content__column'>
                    <div class='melodies__list-name'>
                        <div class='melodies__list-name-text melodies__list-name-left'></div>
                    </div>
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
                <div class='content__column'>
                    <div class='melodies__list-name'>
                        <div class='melodies__list-name-text melodies__list-name-right'></div>
                    </div>
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


        const tactsBar = {
            el: root_el.find('.tacts-bar__line-wrapper'),
            update: function (step) {

                const markup = [1, 2, 3].map(currentStep => {
                    let classNames = 'tacts-bar__line';
                    if(currentStep <= step) {
                        classNames += ' tacts-bar__line_active';
                    }
                    return (`<div class='${classNames}'></div>`)
                });

                this.el.html(markup);
            }
        };

        const progressLine = {
            el: root_el.find('.progress-bar__line-wrapper'),
            update: function (time) {

                // const duration = transition-duration: 0.5s;;

                this.el.html('<div class="progress-bar__line"></div>');
                // console.log(0);
                let line_el = this.el.find('.progress-bar__line');
                // this.el.css({
                //     transitionDuration: '0s',
                //     width:'0px'
                // });
                // console.log()
                line_el.animate({
                    width: '100%'
                }, time, function() {
                    line_el.remove();
                    // Animation complete.
                });

                // console.log(time/1000);
                // line_el.css({
                //     transitionDuration: time/1000+'s',
                //     width:'100%'
                // });
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

        return function(state) {
            console.log(state);


            const instruments = state.instruments;
            const instrumentsId = Object.keys(instruments);
            const leftInstrument = instruments[instrumentsId[0]];
            const rightInstrument = instruments[instrumentsId[1]];

            lists.update('left', leftInstrument);
            lists.update('right', rightInstrument);

            tactsBar.update(state.step.num);
            progressLine.update(state.step.time);

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
