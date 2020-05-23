const fs = require('fs');

const Discord = require('discord.js');
const bot = new Discord.Client();

const config = require('./config.json');

let replyTable;
let replyRE;
let reactTable;
let reactRE;

function refreshReply() {
	try {
		delete require.cache[require.resolve('./replyTable.json')];
		replyTable = require('./replyTable.json');
		replyRE = new RegExp('(?<=^|[\\s.,!?;])(' + replyTable.flatMap(a => a[1]).join('|') + ')(?=[\\s.,!?;]|$)', 'ig');
	}
	catch(e) { replyTable = []; replyRE = new RegExp('a^'); }
}

function refreshReact() {
	try {
		delete require.cache[require.resolve('./reactTable.json')];
		reactTable = require('./reactTable.json');
		reactRE = new RegExp('(?<=^|[\\s.,!?;])(' + reactTable.flatMap(a => a[1]).join('|') + ')(?=[\\s.,!?;]|$)', 'ig');
	}
	catch(e) { reactTable = []; reactRE = new RegExp('a^'); }
}

refreshReply();
refreshReact();

const addressRE = new RegExp('^(' + config.prefix.join('|') + ')(.*)$');

const gender1 = ['pán', 'paní', 'soudruh', 'soudružka'];
const gender5 = ['pane', 'paní', 'soudruhu', 'soudružko'];
const genderRE = new RegExp('\\bjsem (' + gender1.join('|') + ')(?=[\\s.,!?]|$)', 'i');

let userTable = new Map();
fs.readFile('userTable.json', (err, data) => {
	if (err) {
		console.log('There was an error reading userTable.json');
		return;
	}
	userTable = new Map(JSON.parse(data));
});


bot.on('ready', function() {
	console.log('This bot is online!');
});

bot.on('message', msg => {

	let matches = msg.content.matchAll(reactRE);
	for (const match of matches) {
		const result = reactTable.find(row => row[1].includes(match[1].toLowerCase()));
		if (result === null) console.log("Hledal jsem " + match[1].toLowerCase() + " a nenašel :(");
		else {
			msg.react(result[0]);
		}
	}

	if ((parts = addressRE.exec(msg.content)) === null) return;

	const cmd = parts[2].trim();
	const sex = userTable.get(msg.author.id) || 0;

	console.log((new Date().toLocaleTimeString()) + (msg.guild !== null ? '@' + msg.guild.nameAcronym : '@DM') + ' ' + msg.author.username + (sex%2 ? '♀' : '♂') + ': ' + msg.content);

	if (cmd.startsWith('?')) {
		const replies = [
			['Ano, můj pane?', 'Čeho si žádáte, pane?', 'Čím může Dobby posloužit?'],
			['Ano, má paní?', 'Čeho si žádáte, paní?', 'Čím může Dobby posloužit?'],
			['Ano, soudruhu?', 'Co si přejete, soudruhu?', 'Jak posloužím socialismu?'],
			['Ano, soudružko?', 'Co si přejete, soudružko?', 'Jak posloužím socialismu?']
		];

		msg.channel.send(replies[sex][Math.floor(Math.random() * replies[sex].length)]);
	}

	let arg;
	if ((arg = genderRE.exec(cmd)) !== null) {
		let sexSet = gender1.indexOf(arg[1]);
		if (sexSet === sex) msg.channel.send('Já vím ' + gender5[sexSet] + '.');
		else {
			userTable.set(msg.author.id, sexSet);
			msg.channel.send('Dobře, ' + gender5[sexSet] + '.');
			fs.writeFile('userTable.json', JSON.stringify([...userTable]), err => {
				if (err) console.log('There was an error updating userTable.json');
				else console.log('File userTable.json updated successfully.');
			});
		}
	}

	let replyOutput = '';
	matches = cmd.matchAll(replyRE);
	for (const match of matches) {
		const result = replyTable.find(row => row[1].includes(match[1].toLowerCase()));
		if (result === null) console.log("Hledal jsem " + match[1].toLowerCase() + " a nenašel :(");
		else {
			replyOutput += result[0];
		}
	}
	if (replyOutput !== '') msg.channel.send(replyOutput);

	if (cmd.search(/(?<=^|[\\s.,!?;])čti|uč se|studuj(?=[\\s.,!?;]|$)/i) !== -1) {
		refreshReply();
		refreshReact();
		console.log('Table cache was refreshed.');
		const replies = ['"Učit se, učit se, učit se" ~ Lenin', 'Kolik řečí znáš, tolikrát jsi soudruhem.'];
		msg.channel.send(replies[Math.floor(Math.random() * replies.length)]);
	}
});

bot.login(config.token);