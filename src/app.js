import rq from 'request-promise-native';
import readline from 'readline';
import fs from 'fs';


require('babel-polyfill');

const geocodeUrl = 'https://maps.googleapis.com/maps/api/geocode/json?address=';

const apiKey = process.argv[2]; // Google maps API key as script argument

const inFile = process.argv[3] || './inFile.csv';
const outFile = process.argv[4] || './outFile.csv';

const separator = ';';

const lineReader = readline.createInterface({
    input: fs.createReadStream(inFile)
});

const lineWriter = fs.createWriteStream(outFile);

async function geocodeAddress(address) {
    const url = geocodeUrl + encodeURIComponent(address) + '&key=' + apiKey;
    try {
        let res = await rq.get({ url: url });
        let data = JSON.parse(res);
        if (data.status === 'OK') {
            return data.results[0].geometry.location;
        } else {
            return Promise.reject(new Error(data.status));
        }
    } catch (err) {
        return Promise.reject(err);
    }
}

async function geocode() {
    const regex = /\(.*\)/g; //
    lineReader.on('line', async(line) => {
        let agent = line.split(separator);
        let address = agent[5] + ' ' + agent[6] + ', ' + agent[7];
        address = address.replace(regex, ''); // Remove () place specification from address
        let id = agent[18];
        try {
            let location = await geocodeAddress(address);
            lineWriter.write([id, location.lng, location.lat].join(separator) + '\n');
        } catch (err) {
            console.error(`Error obtaining location for ${id}. Address - ${address}`);
            console.error(err);
        }
    });
}
async function main() {
    console.log(`Geocoding data from ${inFile}`);
    await geocode();
}

main(lineReader, lineWriter);