/**
 * This keeps updated the last time a file was updated so the game can check if it needs to
 * update any of the databases.
 */

const common = require('./common');
const fs = require('fs');
const util = require('util');

const fileName = 'last-update-time';

async function updateLastUpdateTimeOf(key, time = new Date()) {
    console.log(`Updating last update time of ${key}`);

    const lastUpdates = await readFile(key);

    if (!lastUpdates[key]) {
        console.log(`Key ${key} doesn't exists in file, creating key`);
    } else {
        console.log(`Key ${key} exists, updating`);
    }

    lastUpdates[key] = time.toJSON();

    try {
        await saveFile(key, lastUpdates);
    } catch (err) {
        console.log(`Could not update last update time`, err);
        return;
    }

    console.log(`Update of key ${key} was successful`);
}

function getFilePath() {
    return common.getFullPath(`${fileName}.json`);
}

async function readFile() {
    const read = util.promisify(fs.readFile);

    const filePath = getFilePath();

    console.log(`Reading last update times from ${filePath}`);

    try {
        const fileContent = await read(filePath);
        return JSON.parse(fileContent);
    } catch (err) {
        console.log(`File ${filePath} doesn't exists, returning empty object`);
        return {};
    }
}

async function saveFile(fileKey, content) {
    const write = util.promisify(fs.writeFile);

    const contentString = JSON.stringify(content);
    const filePath = getFilePath();

    console.log(`Updating last update times in ${filePath}`);

    await write(filePath, contentString);
}

module.exports = { updateLastUpdateTimeOf };