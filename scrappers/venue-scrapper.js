/**
 * This little script recovers all the venues listed in the List of Music Venues
 * of Wikipedia (https://en.wikipedia.org/wiki/List_of_music_venues). It runs through
 * all the tables and categorizes every venue by the country they're in and their capacity.
 * Sounds easy, right? Well, turns out there's a lot of different options to consider here.
 *
 * So brace yourselves, this ain't gonna be pretty.
 */

const puppeteer = require('puppeteer');
const { performance } = require('perf_hooks');
const {
    getFullPath,
    removeFileIfExists,
    saveObjectToFile,
    click
} = require('./common');

const venuesListUrl = 'https://en.wikipedia.org/wiki/List_of_music_venues';

const venuesFilePath = getFullPath('venues.json');
removeFileIfExists(venuesFilePath);

const startingTime = performance.now();
(async () => {
    console.log('Starting browser...');
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    console.log(`Browser started. Navigating to ${venuesListUrl}`);
    await page.goto(venuesListUrl);

    console.log('Retrieving tables containing the data');

    // console.log inside of page.evaluate logs to the browser console (which is pretty useless in our case)
    // so we redirect it to the Node.js log this way.
    page.on('console', consoleObj => console.log(consoleObj.text()));

    const venues = await page.evaluate(() => {
        const tables = document.querySelectorAll('#mw-content-text > div > table');
        const countryNames = document.querySelectorAll('#mw-content-text > div > h3');

        if (!tables) {
            console.error('No tables retrieved. Is the URL still okay? :(');
            return;
        }

        console.log(`Tables retrieved. Got ${tables.length} tables`);
        console.log('Processing tables...');

        const countries = {};
        tables.forEach((e, i) => {
            const tableRows = e.getElementsByTagName('tr');
            const countryName = countryNames[i]
                .childNodes[0]
                .textContent
                .trim();

            if (!countryName) {
                console.log(`No country found for table ${i}; skipping`);
                return;
            }

            countries[countryName] = [];

            // Some rows re-use the previous city and capacity, so let's save those for this case.
            let previousCity = '';
            let previousCapacity = '';
            for (let x = 2; x < tableRows.length; x++) {
                const columns = tableRows[x].getElementsByTagName('td');
                if (columns.length == 0) {
                    console.log(`No columns detected for position ${x} in country ${countryName}; skipping`);
                    continue;
                }

                // The venue and city name are an <a> element (most of the times)
                // with a title. But of course that'd be too easy.
                // There are some cases in which the venue and city name are 1
                // position earlier (opened date is unknown).
                let venueName = '';

                // The "Opened" column turns into a <th> when it's "Unknown".
                const includesOpenedColumn = tableRows[x].getElementsByTagName('th').length == 0;
                const venueColumnIndex = (includesOpenedColumn) ? 1 : 0;

                // There are also some cases in which the city name is not an <a> element
                const isVenueNameAnchorElement = columns[venueColumnIndex].childNodes.length > 1 || false;

                if (isVenueNameAnchorElement) {
                    venueName = columns[venueColumnIndex]
                        .childNodes[0]
                        .textContent
                        .trim();
                } else {
                    venueName = columns[venueColumnIndex].textContent.trim();
                }

                if (!venueName) {
                    console.log(`No venue name detected for position ${x} in country ${countryName}; skipping`);
                    continue;
                }

                // Capacity can appear either in the 3th column (if the city was not reused)
                // or in the 2nd column if it was reused
                // or even in the 1st if the opened date is unknown and the city was reused
                let capacityColumn = 0;
                let cityColumnIndexOffset = 0;

                if (columns[3]) {
                    capacityColumn = columns[3];
                } else {
                    capacityColumn = columns[2] || columns[1];
                    cityColumnIndexOffset = -1;
                }

                const capacityContent = capacityColumn.textContent;

                // Capacity can have different options:
                // - It can be a simple number (example: 80,000)
                // - It can be a range (example: 9,000-10,000), we take the first
                // - It can contain a reference (example: 20,000[2]), we just take the number
                // - Have multiple properties. We also take the first
                const capacityRegex = /(^\d+,\d+)|(^\d+)/
                const matches = capacityRegex.exec(capacityContent);

                let venueCapacity = '';

                if (matches) {
                    venueCapacity = matches[0];
                } else {
                    venueCapacity = previousCapacity;
                }

                if (!venueCapacity) {
                    console.log(`No capacity detected for venue ${venueName}; skipping`);
                    continue;
                }

                previousCapacity = venueCapacity;

                // In some cases the "Opened" column is shared too, so we'll simply ignore those registries for now.
                const wrongNameMatches = capacityRegex.exec(venueName);
                if (wrongNameMatches) {
                    console.log(`Wrong data processed in row ${i} of country ${countryName}; skipping`);
                    continue;
                }

                const cityColumnIndex = 2 + cityColumnIndexOffset;
                let cityName = '';

                // This condition means that the city column was reused and makes no sense to attempt parsing it.
                const noCityColumn = columns.length <= 3;
                const isCityColumnReused = cityColumnIndexOffset != 0 && (!includesOpenedColumn || noCityColumn)
                if (isCityColumnReused) {
                    cityName = previousCity;
                } else {
                    // In a similar fashion, city name can also be just a text element
                    const isCityNameAnchorElement = columns[cityColumnIndex].childNodes.length > 1;
                    if (isCityNameAnchorElement) {
                        cityName = columns[cityColumnIndex]
                                .childNodes[0]
                                .textContent
                                .trim();
                    } else {
                        cityName = columns[cityColumnIndex].textContent.trim();
                        if (!cityName) cityName = previousCity;
                    }
                }

                if (!cityName) {
                    console.log(`No city name detected for position ${x} in country ${countryName}; skipping`);
                    continue;
                }

                previousCity = cityName;

                console.log(`Adding venue ${venueName} with a capacity of ${venueCapacity} in the city of ${cityName} to country ${countryName}`)
                countries[countryName].push({
                    city: cityName,
                    venue: venueName,
                    capacity: venueCapacity
                })
            }

            const containsNoVenues = countries[countryName].length == 0;
            if (containsNoVenues) {
                console.log(`No venues parsed for country ${countryName}; removing country`);
                delete countries[countryName];
            }
        });

        return countries;
    });

    console.log('Finished processing venues.');
    console.log('Closing browser');
    await browser.close();

    console.log(`Browser closed. Saving results in ${venuesFilePath}`);
    try {
        saveObjectToFile(venues, venuesFilePath);
    } catch (err) {
        console.error('There was an error saving the file.');
        return;
    }

    console.log('Saved successfully');

    const finishTime = performance.now();
    const executionTime = finishTime - startingTime;
    console.log(`Execution finished. Took ${executionTime} milliseconds`);
})()