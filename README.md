# DiscordBot

Comes with a Youtube module.

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
Just add any settings you require into the config.json. They will get passed to the module as second parameter.

## Installation
Simply run `npm install`

## Running the bot
Run the bot with `node app.js` or `npm start` after installing the dependencies.