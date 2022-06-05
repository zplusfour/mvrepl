#!/usr/bin/env node
import inq from 'inquirer';
import * as rl from 'replit-login';
import conf from 'conf';
import { deploy } from './src/client.js';
const argv = process.argv.slice(2);

const loginQuestions = [
	{
		type: 'input',
		name: 'username',
		message: 'Enter your username:'
	},
	{
		type: 'password',
		name: 'password',
		message: 'Enter your password:'
	},
	{
		type: 'password',
		name: 'token',
		message: 'Enter your Captcha token (crkl.ml/captcha):'
	}
];

const config = new conf();
const login = async (usr, pwd, t) => {
	const REPLIT_LOGIN = await rl.authenticate(usr, pwd, t);
	if (REPLIT_LOGIN) {
		config.set('username', usr);
		config.set('login', REPLIT_LOGIN);
		console.log('logged in as', usr);
	} else {
		console.log('could not login.');
	}
};

// var r_username = process.env['REPL_OWNER'];
// var r_replname = process.env['REPL_SLUG'];
// var r_id = process.env['REPL_ID'];

if (argv[0]) {
	if (argv[0] === 'login') {
		if (!config.get('login')) {
			inq.prompt(loginQuestions).then(({ username, password, token }) => {
				login(username, password, token);
			});
		} else {
			console.log('you are already logged in!');
		}
	} else if (argv[0] === 'deploy') {
		if (config.get('login')) {
			deploy();
		} else {
			console.log('you are not logged in!');
		}
	} else {
		if (!config.get('login')) {
			console.log('you are not logged in!');
		} else {
			deploy();
		}
	}
}
