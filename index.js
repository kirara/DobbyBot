const fs = require('fs');
const rp = require('request-promise');
const cheerio = require('cheerio');
const TurndownService = require('turndown');
const turndown = new TurndownService();

const Discord = require('discord.js');
const bot = new Discord.Client();

const config = require('./config.json');

let replyTable;
let replyRE;
let reactTable;
let reactRE;
let addressTable;
let addressRE;
let address1;
let address5;
let addressReplies;

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

function refreshAddress() {
	try {
		delete require.cache[require.resolve('./addressTable.json')];
		addressTable = require('./addressTable.json');
		address1 = addressTable.map(a => a[0]);
		address5 = addressTable.map(a => a[1]);
		addressReplies = addressTable.map(a => a[2]);
		addressRE = new RegExp('(?<=^|[\\s.,!?;])jsem\\s+(' + address1.join('|') + ')(?=[\\s.,!?;]|$)', 'i');
	}
	catch(e) { addressTable = []; address1 = []; address2 = []; addressReplies = []; addressRE = new RegExp('a^'); }
}

refreshReply();
refreshReact();
refreshAddress();

const prefixRE = new RegExp('^(' + config.prefix.join('|') + ')(.*)$');

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

	if ((parts = prefixRE.exec(msg.content)) === null) return;

	const cmd = parts[2].trim();
	const sex = userTable.get(msg.author.id) || 0;

	console.log((new Date().toLocaleTimeString()) + (msg.guild !== null ? '@' + msg.guild.nameAcronym : '@DM') + ` ${msg.author.username}[${sex}]: ${msg.content}`);

	if (cmd.startsWith('?')) {
		msg.channel.send(addressReplies[sex][Math.floor(Math.random() * addressReplies[sex].length)]);
	}

	let arg;
	if ((arg = cmd.match(addressRE)) !== null) {
		let sexSet = address1.indexOf(arg[1].toLowerCase());
		if (sexSet === sex) msg.channel.send('Já vím ' + address5[sexSet] + '.');
		else {
			userTable.set(msg.author.id, sexSet);
			msg.channel.send('Dobře, ' + address5[sexSet] + '.');
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

	if (cmd.search(/(?<=^|[\s.,!?;])(čti|uč se|studuj)(?=[\s.,!?;]|$)/i) !== -1) {
		refreshReply();
		refreshReact();
		refreshAddress();
		console.log('Table cache was refreshed.');
		const replies = ['"Učit se, učit se, učit se" ~ Lenin', 'Kolik řečí znáš, tolikrát jsi soudruhem.'];
		msg.channel.send(replies[Math.floor(Math.random() * replies.length)]);
	}

	if ((arg = cmd.match(/(?<=^|[\s.,!?;])skloňuj ([^\s.,!?;]+)(?=[\s.,!?;]|$)/i)) !== null) {
		const options = {
			uri: 'https://m.prirucka.ujc.cas.cz/',
			qs: {
				id: arg[1]
			},
			transform: function (body) {
					return cheerio.load(body);
			}
		};

		rp(options)
			.then(function ($) {
				let out = '', tmp = [];
				$('.para td').each((i,el) => { if (i>2) { let txt = $(el).text(); tmp.push(txt.replace(/(?<!^)\d/, '')); if (i%3 == 2) { out += tmp.join(' ') + "\n"; tmp = []; }}});
				if (out) msg.channel.send("```" + out + "```");
				else msg.channel.send(arg[1] + " jsem nenašel :frowning:");
			})
			.catch(function (err) {
				console.log(err);
			});
	}

	if ((arg = cmd.match(/(?<=^|[\s.,!?;])vysvětli (.+)$/i)) !== null) {
		const options = {
				uri: 'https://cs.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(arg[1].replace(' ', '_').replace('[zdroj?]', '')),
				json: true
		};

		rp(options)
			.then(function (repos) {
				const embed = {
					title: repos.titles.display,
					url: repos.content_urls.desktop.page,
					description: turndown.turndown(repos.extract_html),
					footer: {
				  	icon_url: "https://en.wikipedia.org/static/apple-touch/wikipedia.png",
				  	text: "Wikipedia"
					}
				};
				if (repos.thumbnail) embed['thumbnail'] = { url: repos.thumbnail.source };
				msg.channel.send({embed: embed});
			})
			.catch(function (err) {
				 msg.channel.send(arg[1] + " jsem nenašel :frowning:");
				 console.log(err);
			 });
	}
});

bot.login(config.token);