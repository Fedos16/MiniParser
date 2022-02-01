module.exports = (server) => {
    const io = require("socket.io")(server);

    const axios = require('axios');
    const cheerio = require('cheerio');
    const fs = require("fs");
    const { google } = require('googleapis');
    const readline = require('readline');

    const { GoogleSheets, getPriceProductFromPetrovich, getPriceProductFromAllInstruments } = require('../functions');

    io.sockets.on('connection', (socket) => {

        console.log('A user connected');

        socket.on('start-parsing', async () => {
            console.log('Start parsing...');

            const spreadsheetID = '1HvRc9aeWnzLxNDi8aPTQg-O_dfmpoPsXF5kfQKgTV-I';
            const sheetName = 'SourceData';

            await GoogleSheets(async auth => {
                try {
                    const sheets = google.sheets({ version: 'v4', auth });
                    const params = {
                        spreadsheetId: spreadsheetID,
                        range: `${sheetName}!A1:E`
                    }

                    const data = await sheets.spreadsheets.values.get(params);
                    const rows = data.data.values;

                    socket.emit('parsing-status', `Найдено строк для парсинга: ${rows.length}`);

                    const array = [];

                    let index = 0;
                    for (let row of rows) {
                        const id = row[0];
                        const name = row[1];
                        const unit = row[2];
                        const urlPetrovich = row[3];
                        const urlAllInstruments = row[4];

                        let myPrice = '';

                        if (id && name && unit) {
                            if (urlPetrovich) {
                                let { price } = await getPriceProductFromPetrovich(urlPetrovich);
                                if (price) myPrice = price;
                            } else if (urlAllInstruments) {
                                let { price } = await getPriceProductFromAllInstruments(urlAllInstruments);
                                if (price) myPrice = price;
                            }

                            array.push([ id, name, unit, myPrice ]);
                        }

                        index ++;

                        socket.emit('parsing-status', `Спаршено ${index} из ${rows.length} или ${Number(index / rows.length * 100).toFixed(2)}%`);
                    }

                    const newSheetName = new Date().getTime().toString();

                    await sheets.spreadsheets.batchUpdate({
                        spreadsheetId: spreadsheetID,
                        resource: {
                            requests: [{
                                addSheet: {
                                    properties: {
                                        title: newSheetName,
                                    }
                                },
                            }]
                        },
                    });

                    const request = {
                        spreadsheetId: spreadsheetID,
                        range: `${newSheetName}!A1:D`,
                        valueInputOption: 'USER_ENTERED',
                        resource: {
                            values: array
                        }
                    }

                    await sheets.spreadsheets.values.update(request);

                    socket.emit('parsing-finish', `Парсинг завершен`);

                    
                } catch (err) {
                    console.log(err);
                    socket.emit('parsing-finish', `Парсинг не удался`);
                }
            });

        });

    })

    return io;
}