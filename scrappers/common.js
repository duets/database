/**
 * These are the common methods used across all scrappers.
 */

const fs = require('fs');
const path = require('path');

function getFullPath(file) {
    const currentPath = process.cwd();
    return path.join(currentPath, `../${file}`);
}

function removeFileIfExists(file) {
    const fileAlreadyExists = fs.existsSync(file);
    if (fileAlreadyExists) {
        console.log(`File already exists. Removing ${file}`);

        try {
            fs.unlinkSync(file);
        } catch (err) {
            console.error('There was an error removing the file. Please delete it manually and re-run the script');
            return;
        }
    }
}

function saveObjectToFile(obj, path) {
    const stringified = JSON.stringify(obj);
    fs.writeFileSync(path, stringified, 'utf-8');
}

/**
 * According to the Puppeteer documentation, we need to wait for navigation before submitting a click to the page.
 * Otherwise we get a nice timeout when we try to execute this script in headless mode :)
 * Documentation: (https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pageclickselector-options)
 */
function click(page, selector) {
    return Promise.all([
        page.waitForNavigation({ waitUntil: 'load' }),
        page.click(selector)
    ])
}

module.exports = {
    getFullPath,
    removeFileIfExists,
    saveObjectToFile,
    click
};