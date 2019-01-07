/**
 * Creates the countries and its cities from the scrapped data of the venues.
 */

const { getFullPath, saveObjectToFile } = require('./common');
const { updateLastUpdateTimeOf } = require('./last-update-time');

async function generateCountriesAndCities(venues) {
    const parsedCountries = parseCountries(venues);
    const countriesPath = getFullPath('countries.json');

    console.log(`Saving countries file in ${countriesPath}`);

    try {
        saveObjectToFile(parsedCountries, countriesPath);
    } catch (err) {
        console.error('There was an error saving the file.');
        return;
    }

    console.log('Saved successfully');

    await updateLastUpdateTimeOf('countries');
}

function parseCountries(venueList) {
    const countries = {};

    console.log('Generating countries');
    for (const [countryName, venues] of Object.entries(venueList)) {
        console.log(`Adding country ${countryName}`);
        countries[countryName] = new Set();

        venues.forEach((value) => {
            const city = value['city'];
            countries[countryName] = countries[countryName].add(city);
        });

        // Turn the set into an array since JSON.stringify does not support Sets.
        countries[countryName] = [...countries[countryName]];
    }

    return countries;
}

module.exports = { generateCountriesAndCities }