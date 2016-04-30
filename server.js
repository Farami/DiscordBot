'use strict';
const configFile = require('./config.json');
const Discord = require("discord.js");
const express = require('express');
const q = require('q');

const app = express();

var server = app.listen(configFile.port, function() {
    var port = server.address().port;
    console.log('Server is running on port %s', port)
});