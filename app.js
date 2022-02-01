const path = require('path');
const express = require('express');
const app = express()
const port = 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(
	'/socket.io',
	express.static(path.join(__dirname, 'node_modules', 'socket.io-client', 'dist'))
);

const server = app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
});

require('./sockets')(server);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'main.html'));
})