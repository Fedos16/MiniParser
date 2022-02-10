window.onload = async () => {

    let dateStartParsing = null;

    function startParsing(e) {
        socket.emit('start-parsing');

        e.target.disabled = true;
        e.target.textContent = 'Парсинг ...';

        progress.textContent = 'Загружаю данные для парсинга ...'

        dateStartParsing = new Date();
    }

    const socket = io();
    const progress = document.querySelector('.row_progress b');

    const btnStart = document.querySelector('#startParsing');
    if (btnStart) btnStart.addEventListener('click', startParsing, true);

    socket.on('parsing-status', msg => {
        progress.innerHTML = msg;
    });
    socket.on('parsing-finish', msg => {
        progress.innerHTML = `${msg}<br>Выполнено за ~${Math.round((new Date() - dateStartParsing) / 1000 / 60)} мин.`;
        btnStart.disabled = false;
        btnStart.textContent = 'Парсить';
    });
}