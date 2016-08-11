import $ from 'jquery';
import io from 'socket.io-client';
import IScroll from 'iscroll';

import './styles/base.css';
import './styles/app.css';


let root_el = $('#root');
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

root_el.append(content);



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
            console.log(this);

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
    update: function(sideName, row){
        console.log(row.name+':'+!!this.name_els);
        this.name_els[sideName].html(row.name);
        this.els[sideName].html(this.generate(row));
        this.scrolls[sideName].refresh();
    },
    generate: (row) => {

        return row.list.map( melody => {

            let classNames = '';

            if(melody.id === row.melodyid) {
                classNames += 'melodies__list-item_active'
            }

            return (`
                    <div class='melodies__list-item ${classNames}' data-id='${melody.id}' data-rowid='${row.id}'>
                        <span>${melody.name}</span>
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
    switch: function (sideName, live) {
        if(live){
            this.els[sideName].addClass('live__button_active');
        }else{
            this.els[sideName].removeClass('live__button_active');
        }
    }
};


$.get('/serverip', (serverip) => {

    const socket = io('http://'+serverip);

    let state = {};

    socket.on('state', (clientState) => {

        state = clientState;
        // console.log(state);

        lists.update('left', state.melodies['01']);
        lists.update('right', state.melodies['02']);

        progressLine.switch(state.melodies['01'].live || state.melodies['02'].live);

        liveButtons.switch('left', state.melodies['01'].live);
        liveButtons.switch('right', state.melodies['02'].live);


        root_el.find('.melodies__list-item').on('tap', (e) => {

            const rowid = e.target.dataset.rowid;
            const id = e.target.dataset.id;
            console.log(rowid);
            console.log(id);
            if(id === state.melodies[rowid].melodyid){
                socket.emit('melody_selected', rowid, '00');
            }else{
                socket.emit('melody_selected', rowid, id);
            }
        });


        liveButtons.els['left'].on('click', () => {
            const rowid = '01';
            socket.emit('switch_live', rowid, !state.melodies[rowid].live);
        });
        liveButtons.els['right'].on('click', () => {
            const rowid = '02';
            socket.emit('switch_live', rowid, !state.melodies[rowid].live);
        })


    });

});


document.ontouchmove = (e) => {
    e.preventDefault();
};
