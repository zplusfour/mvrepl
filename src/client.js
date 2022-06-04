import { Crosis } from 'crosis4furrets';
import conf from 'conf';
import inquirer from 'inquirer';
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

const getReplId = async (sid, u, r) => {
	const url = `/@${u}/${r}`;
	const query = await gql.raw({
		variables: { url },
		query: `query repl($url: String!) {
					repl(url: $url) {
						...on Repl {
							id
						}
					}
		}`
	});
	return query;
};

const createRepl = async (sid, title, language) => {
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

export const host = async () => {
	if (!isLoggedIn) {
		console.log('you are not logged in!');
		return;
	} else {
		inquirer.prompt(replQuestions).then(async ({ replname, language }) => {
			const test = await createRepl(l, replname, language);
			const id = test.data.createRepl.id;
			const url = 'https://replit.com' + test.data.createRepl.url;

			const client = new Crosis(l, id);
			var filesToPush = [];
			var thisDirFiles = [];
			await client.connect();

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

			await client.close();
			spinner.succeed('Done! You can access your repl at ' + url);
		});
	}
};
