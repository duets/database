/**
 * This nice little script scans all the genres present in the "browse genres" section
 * of Sputnik Music and goes through all of them finding the compatible tags. After it,
 * dumps the data into the genres.json file.
 */

const puppeteer = require('puppeteer');
const { performance } = require('perf_hooks');
const {
    getFullPath,
    removeFileIfExists,
    saveObjectToFile,
    click
} = require('./common');

const sputnikUrl = 'https://www.sputnikmusic.com/';

const genresFilePath = getFullPath('genres.json');
removeFileIfExists(genresFilePath);

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
        const compatibleGenres = await page.evaluate(() => {
            const tags = document.querySelectorAll('.tag');
            const tagsArray = [...tags];
            const tagsText = tagsArray.map((t) => t.textContent);

            return tagsText;
        });
        console.log(`Tags processed. Got ${compatibleGenres.length} entries`);

        const scrappedGenre = {
            name: genre.name,
            compatible: compatibleGenres
        };
        scrappedGenres.push(scrappedGenre);
    }

    console.log('Finished processing subgenres.');
    console.log('Closing browser');
    await browser.close();

    console.log(`Browser closed. Saving results in ${genresFilePath}`);
    try {
        saveObjectToFile(scrappedGenres, genresFilePath);
    } catch (err) {
        console.error('There was an error saving the file.');
        return;
    }

    console.log('Saved successfully');

    const finishTime = performance.now();
    const executionTime = finishTime - startingTime;
    console.log(`Execution finished. Took ${executionTime} milliseconds`)
})();