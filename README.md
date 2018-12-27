# Duets Database 🗄
This is the data that will be part of the Duets game. This includes music genres, instruments and other static data that is needed for the game to run. The game will automatically update itself with these files every once in a while.

## Genres
All the genres are taken from the Sputnik Music webpage. In order to automate this, the file `genre-scrapper.js` inside of the `scrappers` folder will automatically take all the genres available in Sputnik Music and create the compatibility list between them.