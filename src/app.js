import rq from 'request-promise-native';

require('babel-polyfill');

const geocodeUrl = 'https://maps.googleapis.com/maps/api/geocode/json?address=';
const apiKey = process.argv[2]; // Google maps API key as script argument

const addresses = ['Jungmannova 1405, Hradec Králové', 'Náměstí 28. Října, Hradec Králové', ''];

async function geocodeAddress(address) {
    const url = geocodeUrl + encodeURIComponent(address) + '&key=' + apiKey;
    try {
        let res = await rq.get({url: url});
        let data = JSON.parse(res);
        if(data.status === 'OK') {
            return data.results[0].geometry.location;
        }
    } catch (err) {
        new Promise.reject(err);
    }
}

async function geocode(addresses) {
    for (let address of addresses) {
        try {
            console.log(`Checking  "${address}"...`);
            let location = await geocodeAddress(address);
            console.log(`Address  "${address}" checked`);
            console.log(`LAT: ${location.lat}`);
            console.log(`LNG: ${location.lng}`);
        } catch (err) {
            console.error(`Error obtaining location for "${address}"`);
            console.error(err);
        }

    }
}

geocode(addresses);
