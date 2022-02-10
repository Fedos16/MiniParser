module.exports = (server) => {

    const axios = require('axios');
    const cheerio = require('cheerio');
    const fs = require("fs");
    const { google } = require('googleapis');
    const readline = require('readline');

    const io = require("socket.io")(server);
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
                        range: `${sheetName}!A1:G`
                    }

                    const data = await sheets.spreadsheets.values.get(params);
                    const rows = data.data.values;

                    socket.emit('parsing-status', `Найдено строк для парсинга: ${rows.length}`);

                    const array = [
                        [ 'Артикул', 'Наименование', 'Ед. изм', 'Цена Петрович', 'Цена Все инструменты', 'Минимальная цена' ]
                    ];

                    let index = 0;
                    for (let row of rows) {
                        const id = row[0];
                        const name = row[1];
                        const unit = row[2];

                        let divide = row[3];
                        (divide) ? divide = Number(divide.replace(',', '.')): divide = 1;
                        let multiply = row[4];
                        (multiply) ? multiply = Number(multiply.replace(',', '.')) : multiply = 1;

                        const urlPetrovich = row[5];
                        const urlAllInstruments = row[6];

                        if (id && name && unit) {
                            let pricePetrovich = '';
                            let pricelAllInstruments = '';
                            let minPrice = '';
                            if (urlPetrovich) {
                                let { price } = await getPriceProductFromPetrovich(urlPetrovich);
                                if (price) {
                                    if (price == 'Не найдено') {
                                        pricePetrovich = price;
                                    } else {
                                        pricePetrovich = price / divide * multiply;
                                        minPrice = price / divide * multiply;
                                    }
                                }
                            }
                            if (urlAllInstruments) {
                                let { price } = await getPriceProductFromAllInstruments(urlAllInstruments);
                                if (price) {
                                    pricelAllInstruments = price / divide * multiply;
                                    minPrice = price / divide * multiply;
                                }
                            }

                            
                            if ((pricePetrovich && pricePetrovich != 'Не найдено') && pricelAllInstruments) {
                                minPrice = Math.min(pricePetrovich, pricelAllInstruments) / divide * multiply;
                            }

                            array.push([ id, name, unit, pricePetrovich, pricelAllInstruments, minPrice ]);
                        }

                        index ++;

                        socket.emit('parsing-status', `Спаршено ${index} из ${rows.length} или ${Number(index / rows.length * 100).toFixed(2)}%`);

                        //if (index == 36) break;
                    }

                    const newSheetName = new Date().toLocaleDateString('ru-RU', { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })
                    .toString();

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
                        range: `${newSheetName}!A1:F`,
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