import rq from 'request-promise-native';
import readline from 'readline';
import fs from 'fs';
import { Observable, Observer } from "rxjs";

require('babel-polyfill');

const geocodeUrl = 'https://maps.googleapis.com/maps/api/geocode/json?address=';

const apiKey = process.argv[2]; // Google maps API key as script argument

const inFile = process.argv[3] || './inFile.csv';
const outFile = process.argv[4] || './outFile.csv';

const separator = ';';

function delayedCall(fn, par, delay) {
    return new Promise((resolve) => {
        setTimeout(() => resolve(fn(par)), delay);
    });
}

async function geocodeAddress(address) {
    const url = geocodeUrl + encodeURIComponent(address) + '&key=' + apiKey;
    try {
        let res = await rq.get({url: url});
        let data = JSON.parse(res);
        if (data.status === 'OK') {
            return data.results[0].geometry.location;
        } else {
            if(data.status === 'OVER_QUERY_LIMIT') {
                let delay = Math.floor((Math.random() * 1000) + 1);
                let res = await delayedCall(rq.get, {url: url}, delay);
                data = JSON.parse(res);
                if (data.status === 'OK') {
                    return data.results[0].geometry.location;
                }
            }
            return Promise.reject(new Error(data.status));
        }
    } catch (err) {
        return Promise.reject(err);
    }
}

function readFile(file) {
    return Observable.create((observer) => {
        const lineReader = readline.createInterface({
            input: fs.createReadStream(file)
        });
        lineReader.on('line', line => {
            observer.next(line)
        }).on('close', () => {
            observer.complete();
        }).on('error', err => {
            observer.error(err);
        })

    })
}

async function processLine(line, lineWriter) {
    const regex = /\(.*\)/g;
    let agent = line.split(separator);
    let address = agent[5] + ' ' + agent[6] + ', ' + agent[7];
    address = address.replace(regex, ''); // Remove () place specification from address
    let id = agent[18];
    try {
        let location = await geocodeAddress(address);
        console.log(`OK - obtained data for ${address}`);
        lineWriter.write([id, location.lng, location.lat].join(separator) + '\n');
    } catch (err) {
        console.error(`ERROR - obtaining location for ${id}. Address - ${address}`);
        console.error(err);
    }
}

async function geocode(cb) {
    const lineWriter = fs.createWriteStream(outFile);
    return new Promise((resolve, reject) => {
        readFile(inFile).flatMap(line => processLine(line, lineWriter)).subscribe({
            complete: () => {
                lineWriter.close();
                cb();
                resolve();
            },
            error: err => {
                reject(err);
            }
        });
    })
}
async function main() {
    console.log(`Geocoding data from ${inFile}`);
    await geocode(() => console.log(`Geocoding done and saved in file ${outFile}`));
}

main();
