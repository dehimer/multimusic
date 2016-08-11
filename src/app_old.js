import $ from 'jquery';
import io from 'socket.io-client';
import IScroll from 'iscroll';

import './styles/base.css';
import './styles/app.css';


let root_el = $('#root');
let content = (`
    <div class='melodies__list-wrapper'>
        <div class='melodies__list'></div>
    </div>
    <div class='toolbar'>
        <div class='progressbar'>
            <div class='progressbar__line'></div>
        <div class='live'>
            <div class='live__button'>
                <div class='live__button-text'>
                    LIVE
                </div>
            </div>
        </div>
    </div>
`);

root_el.append(content);

const iscroll = new IScroll('.melodies__list-wrapper', {
    mouseWheel: true,
    scrollbars: true,
    fadeScrollbars: true,
    tap: true
});


const liveButton = {
    el: root_el.find('.live__button'),
    switch: function (live) {
        if(live){
            this.el.addClass('live__button_active');
        }else{
            this.el.removeClass('live__button_active');
        }
    }
};

const progressLine = {
    el: root_el.find('.progressbar__line'),
    getColor: (value) => {
        //value from 0 to 1
        var hue=((1-value)*120).toString(10);
        return ['hsl(',hue,',100%,50%)'].join('');
    },
    nextTick: function (volume) {
        const newVolume = typeof volume === 'undefined' ? Math.random() : volume;
        const volumeColor = this.getColor(newVolume*0.9);
        // console.log(newVolume+':'+volumeColor);
        this.el.css({
            width: newVolume*250,
            backgroundColor: volumeColor
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

$.get('/serverip', (serverip) => {

    const socket = io('http://'+serverip);

    let state = {};

    socket.on('state', (clientState) => {

        state = clientState;
        console.log(state);

        progressLine.switch(state.melodyid);
        liveButton.switch(state.live);


        const melodies_mrkp = state.melodies.map( melody => {

            let classNames = '';

            if(melody.id === state.melodyid) {
                classNames += 'melodies__list-item_active'
            }

            return (`
                <div class='melodies__list-item ${classNames}' data-id='${melody.id}'>
                    ${melody.name}
                </div>
            `)}
        ).join('');

        root_el.find('.melodies__list').html(melodies_mrkp);
        iscroll.refresh();

        root_el.find('.melodies__list-item').on('tap', (e) => {
            const id = e.target.dataset.id;
            if(id === state.melodyid){
                socket.emit('melody_selected', '00');
            }else{
                socket.emit('melody_selected', id);
            }
        });

        liveButton.el.on('click', () => {
            // alert(!state.live);
            socket.emit('switch_live', !state.live);
        })
    });

});



document.ontouchmove = (e) => {
    e.preventDefault();
};
