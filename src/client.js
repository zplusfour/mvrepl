import { Crosis } from 'crosis4furrets';
import conf from 'conf';
import inquirer from 'inquirer';
import open from 'open';
import ora from 'ora';
import * as fs from 'fs';
import Gql from './gql.js';
const config = new conf();
const isLoggedIn = config.get('login') ? true : false;
let l = isLoggedIn ? config.get('login') : '';

const replQuestions = [
	{
		type: 'input',
		name: 'replname',
		message: 'Repl name:'
	},
	{
		type: 'input',
		name: 'language',
		message: 'Language:'
	}
];

var gql = new Gql(l);

const createRepl = async (title, language) => {
	const query = await gql.raw({
		variables: { input: { title, language } },
		query: `mutation CreateRepl($input: CreateReplInput!) {
			createRepl(input: $input) {
				...on Repl { id, url  }
				...on UserError { message }
			}
		}`
	});

	return query;
};

const statItem = (i) => {
	let s = fs.statSync(i);
	let toret = [];
	if (s.isDirectory()) {
		let ps = fs.readdirSync(i);
		ps.forEach((p) => {
			if (fs.statSync(i + '/' + p).isDirectory()) {
				statItem(i + '/' + p);
			} else {
				toret.push({ name: i + '/' + p, content: fs.readFileSync(i + '/' + p) });
			}
		});
	} else {
		toret.push({ name: i, content: fs.readFileSync(i) });
	}

	return toret;
};

export const deploy = async () => {
	if (!isLoggedIn) {
		console.log('you are not logged in!');
		return;
	} else {
		inquirer.prompt(replQuestions).then(async ({ replname, language }) => {
			const newRepl = await createRepl(replname, language);
			if (newRepl.data.createRepl.message) {
				console.log('message:', newRepl.data.createRepl.message);
				process.exit(0);
			}

			const id = newRepl.data.createRepl.id;
			const url = 'https://replit.com' + newRepl.data.createRepl.url;
			const client = new Crosis(l, id);
			var filesToPush = [];
			var thisDirFiles = [];

			await client.connect();
			await client.persist();

			const spinner = ora({
				text: 'Creating repl...',
				spinner: 'point'
			}).start();

			for (const f of fs.readdirSync('./')) {
				if (f === 'node_modules') {
					continue;
				} else {
					thisDirFiles.push(f);
				}
			}

			for (const item of thisDirFiles) {
				filesToPush.push(statItem(item)[0]);
			}

			for (const i of filesToPush) {
				await client.write(i.name, i.content);
			}

			client.close();

			inquirer
				.prompt([
					{
						name: 'openUrl',
						type: 'confirm',
						message: 'Open repl?'
					}
				])
				.then(async ({ openUrl }) => {
					if (openUrl) {
						await open(url);
					} else {
						console.log('you chose to not open the repl.');
					}
				});
			spinner.succeed('Done! You can access your repl at ' + url);
		});
	}
};
