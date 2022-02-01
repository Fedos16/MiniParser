const functions = {};

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require("fs");
const { google } = require('googleapis');
const readline = require('readline');

functions.getPriceProductFromPetrovich = async (url) => {
    try {
    
        const response = await axios.get(url);

        const $ = cheerio.load(response.data);
        const priceElement = $('.product-sidebar .retail-price');
        let price = 'Не найдено';
        if (priceElement.length > 0) price = priceElement.text().replace(/\D/g, '');
        
        return { status: true, price: price };

    } catch(e) {
        const text = `[ Petrovich ] - ERROR: ${url}`;
        console.log(text);
        return { status: false, text: text, error: e };
    }
}
functions.getPriceProductFromAllInstruments = async (url) => {
    try {
    
        const response = await axios.get(url);

        const $ = cheerio.load(response.data);
        const priceElement = $('.product-main .product-price .current-price');
        let price = 'Не найдено';
        if (priceElement.length > 0) price = priceElement.text().replace(/\D/g, '');
        
        return { status: true, price: price };

    } catch(e) {
        const text = `[ AllInstruments ] - ERROR: ${url}`;
        console.log(text);
        return { status: false, text: text, error: e };
    }
}
functions.GoogleSheets = async (listMajors) => {
    // АВТОРИЗАЦИЯ В ГУГЛ ТАБЛИЦАХ И ЗАПРОС ДАННЫХ
    const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
    const TOKEN_PATH = 'token_sheets.json';
    fs.readFile('credentials_sheets.json', (err, content) => {
        if (err) return console.log('Error loading client secret file:', err);

        authorize(JSON.parse(content), listMajors);
    });
    function authorize(credentials, callback) {
        const {client_secret, client_id, redirect_uris} = credentials.installed;
        const oAuth2Client = new google.auth.OAuth2(
            client_id, client_secret, redirect_uris[0]);
        fs.readFile(TOKEN_PATH, (err, token) => {
            if (err) return getNewToken(oAuth2Client, callback);
            oAuth2Client.setCredentials(JSON.parse(token));
            callback(oAuth2Client);
        });
    }
    function getNewToken(oAuth2Client, callback) {
        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
        });
        console.log('Authorize this app by visiting this url:', authUrl);
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        rl.question('Enter the code from that page here: ', (code) => {
            rl.close();
            oAuth2Client.getToken(code, (err, token) => {
                if (err) return console.error('Error while trying to retrieve access token', err);
                oAuth2Client.setCredentials(token);
                // Store the token to disk for later program executions
                fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                    if (err) console.error(err);
                    console.log('Token stored to', TOKEN_PATH);
                });
                callback(oAuth2Client);
            });
        });
    }
}

module.exports = functions;