# SpotifyDiscordBot

## Modules
To write a module simply create a .js file inside the src/modules folder.

The basic structure of a module is
```javascript
'use strict';
const DiscordBotModule = require('../discordBotModule.js');

module.exports = class JokeModule extends DiscordBotModule {
    constructor(discordClient) {
        let commands = ['command'];
        super("[ModuleName]", commands, discordClient);
    }

    command(message, params) {
        // YOUR CODE HERE
        // You can access the discord client via this.discordClient
    }
};
```

### Configs for your modules
If you need a configuration file for your module we recommend
adding a .json file with the name of your module inside the modules folder.
You can then `require` the config and use it.

```javascript
const config = require('./moduleConfig.json');
```

## Installation
Simply run `npm install`

## Running the bot
Run the bot with `node app.js` after installing the dependencies.