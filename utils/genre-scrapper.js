const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { performance } = require('perf_hooks');

const sputnikUrl = 'https://www.sputnikmusic.com/';

const currentPath = process.cwd();
const resultFilePath = path.join(currentPath, 'results.json');

const fileAlreadyExists = fs.existsSync(resultFilePath);
if (fileAlreadyExists) {
    console.log(`File already exists. Removing ${resultFilePath}`);

    try {
        removeExistingFile(resultFilePath);
    } catch (err) {
        console.error('There was an error removing the file. Please delete it manually and re-run the script');
        return;
    }
}

const startingTime = performance.now();
(async () => {
    console.log('Starting browser...');
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    console.log(`Browser started. Navigating to ${sputnikUrl}`);
    await page.goto(sputnikUrl);

    // Click the browse genre button so the pop-up will show.
    await click(page, '#browsegenre');

    console.log('Retrieving list of genres.');
    const genres = await page.evaluate(() => {
        const genreAnchors = document.querySelectorAll('a[href*="genre"]');
        const result = [];

        genreAnchors.forEach((genre) => {
            const url = genre.href;
            const isValidUrl = /.*\/genre\/\d*\/.*\//.test(url);

            if (!isValidUrl) return;

            const name = genre.textContent;
            result.push({ name, url })
        });

        return result;
    });

    console.log(`Finished retrieving genres. Got ${genres.length} entries`);
    console.log('Starting subgenre processing');

    const scrappedGenres = [];
    for (const genre of genres) {
        console.log(`Navigating to ${genre.url}`);
        await page.goto(genre.url);

        console.log(`Processing tags of genre ${genre.name}`)
        const relatedGenres = await page.evaluate(() => {
            const tags = document.querySelectorAll('.tag');
            const tagsArray = [...tags];
            const tagsText = tagsArray.map((t) => t.textContent);

            return tagsText;
        });
        console.log(`Tags processed. Got ${relatedGenres.length} entries`);

        const scrappedGenre = {
            name: genre.name,
            related: relatedGenres
        };
        scrappedGenres.push(scrappedGenre);
    }

    console.log('Finished processing subgenres.');
    console.log('Closing browser');
    await browser.close();

    console.log(`Browser closed. Saving results in ${resultFilePath}`);
    try {
        saveObjectToFile(scrappedGenres, resultFilePath);
    } catch (err) {
        console.error('There was an error saving the file.');
        return;
    }

    console.log('Saved successfully');

    const finishTime = performance.now();
    const executionTime = finishTime - startingTime;
    console.log(`Execution finished. Took ${executionTime} milliseconds`)
})();

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

function saveObjectToFile(obj, path) {
    const stringified = JSON.stringify(obj);
    fs.writeFileSync(path, stringified, 'utf-8');
}

function removeExistingFile(path) {
    fs.unlinkSync(path);
}