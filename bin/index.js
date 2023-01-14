#! /usr/bin/env node

const Yargs = require('yargs');
const createShellJson = require('./createShellJson');

const createShellJsonCommand = {
    command: 'createShellJson',
    describe: '- Create production MF Json file from mf.default.json',
    handler() {
        try {
            createShellJson();
            console.log('[command (macrof createShellJson)]: Success');
        } catch (e) {
            console.log(e)
        }
    }
};

const defaultCommand = {
    command: '*',
    handler() {
        console.log('You need at least one command before moving on');
        Yargs.showHelp();
    }
};

Yargs
    .command(createShellJsonCommand)
    .command(defaultCommand)
    .demandCommand()
    .argv;
