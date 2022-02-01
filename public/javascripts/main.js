window.onload = async () => {

    function startParsing(e) {
        socket.emit('start-parsing');

        e.target.disabled = true;
        e.target.textContent = 'Парсинг ...';

        progress.textContent = 'Загружаю данные для парсинга ...'
    }

    const socket = io();
    const progress = document.querySelector('.row_progress b');

    const btnStart = document.querySelector('#startParsing');
    if (btnStart) btnStart.addEventListener('click', startParsing, true);

    socket.on('parsing-status', msg => {
        progress.textContent = msg;
    });
    socket.on('parsing-finish', msg => {
        progress.textContent = msg;
        btnStart.disabled = false;
        btnStart.textContent = 'Парсить';
    });
}