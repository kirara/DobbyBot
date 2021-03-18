const fs = require('fs');
const rp = require('request-promise');
const request = require("request");
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
let eightBallTable;

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

function refreshEightBall() {
	try {
		delete require.cache[require.resolve('./eightBall.json')];
		eightBallTable = require('./eightBall.json');
	}
	catch(e) { eightBallTable = [];}
}

refreshReply();
refreshReact();
refreshAddress();
refreshEightBall();

const prefixRE = new RegExp('^(' + config.prefix.join('|') + ')(.*)$');

let userTable = new Map();
fs.readFile('userTable.json', (err, data) => {
	if (err) {
		console.log('There was an error reading userTable.json');
		return;
	}
	userTable = new Map(JSON.parse(data));
});

let mythTable = new Map();
fs.readFile('mythTable.json', (err, data) => {
	if (err) {
		console.log('There was an error reading mythTable.json');
		return;
	}
	mythTable = new Map(JSON.parse(data));
});

bot.on('ready', function() {
	console.log('This bot is online!');
});

bot.on('message', msg => {
	if (msg.author.id != msg.client.user.id) {
		let matches = msg.content.matchAll(reactRE);
		for (const match of matches) {
			const result = reactTable.find(row => row[1].includes(match[1].toLowerCase()));
			if (result === null) console.log("Hledal jsem " + match[1].toLowerCase() + " a nenašel :(");
			else {
				msg.react(result[0]);
			}
		}
	}

	const sex = userTable.get(msg.author.id) || 0;

	let args;
	if ((args = msg.content.match(/(?<=^|[\s.,!?;])([^\s.,!?;]+)\s+je (taky )?mýtus(?=[\s.,!?;]|$)/i)) !== null) {
		if (!['co','vše','všechno'].includes(args[1]) && msg.author.id != msg.client.user.id) {
			console.log((new Date().toLocaleTimeString()) + (msg.guild !== null ? '@' + msg.guild.nameAcronym : '@DM') + ` ${msg.author.username}[${sex}]: ${msg.content}`);
			args[1] = args[1].toLowerCase();
			if (mythTable.has(args[1])) mythTable.set(args[1], +mythTable.get(args[1])+1);
			else {
				mythTable.set(args[1], 1);
			}
			mythTable = new Map([...mythTable].sort((a, b) => Math.sign(b[1] - a[1])));
			fs.writeFile('mythTable.json', JSON.stringify([...mythTable]), err => {
				if (err) console.log('There was an error updating mythTable.json');
				else console.log('File mythTable.json updated successfully.');
			});
		}
	}

	if ((args = msg.content.match(/(?<=^|[\s.,!?;])([^\s.,!?;]+)\s+(už )?není mýtus(?=[\s.,!?;]|$)/i)) !== null) {
		console.log((new Date().toLocaleTimeString()) + (msg.guild !== null ? '@' + msg.guild.nameAcronym : '@DM') + ` ${msg.author.username}[${sex}]: ${msg.content}`);
		args[1] = args[1].toLowerCase();
		if (mythTable.has(args[1])) mythTable.delete(args[1]);

		mythTable = new Map([...mythTable].sort((a, b) => Math.sign(b[1] - a[1])));
		fs.writeFile('mythTable.json', JSON.stringify([...mythTable]), err => {
			if (err) console.log('There was an error updating mythTable.json');
			else console.log('File mythTable.json updated successfully.');
		});
	}

	if ((parts = prefixRE.exec(msg.content)) === null) return;

	const cmd = parts[2].trim();

	console.log((new Date().toLocaleTimeString()) + (msg.guild !== null ? '@' + msg.guild.nameAcronym : '@DM') + ` ${msg.author.username}[${sex}]: ${msg.content}`);

	if (cmd.startsWith('?')) {
		msg.channel.send(addressReplies[sex][Math.floor(Math.random() * addressReplies[sex].length)]);
	}

	if ((args = cmd.match(addressRE)) !== null) {
		let sexSet = address1.indexOf(args[1].toLowerCase());
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

	if ((args = cmd.match(/(?<=^|[\s.,!?;])skloňuj\s+([^.,!?;]+)(?=[.,!?;]|$)/i)) !== null) {
		const options = {
			uri: 'https://m.prirucka.ujc.cas.cz/',
			qs: {
				id: args[1]
			},
			transform: function (body) {
				return cheerio.load(body);
			}
		};

		let arg = args;
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

	if ((args = cmd.match(/(?<=^|[\s.,!?;])vysvětli\s+([^.,!?;]+)(?=[.,!?;]|$)/i)) !== null) {
		const options = {
			uri: 'https://cs.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(args[1].replace(' ', '_')),
			json: true
		};

		let arg = args;
		rp(options)
			.then(function (repos) {
				const embed = {
					title: repos.titles.display,
					url: 'https://cs.wikipedia.org/wiki/' + encodeURIComponent(arg[1].replace(' ', '_')),
					description: turndown.turndown(repos.extract_html),
					footer: {
						icon_url: "https://cs.wikipedia.org/static/apple-touch/wikipedia.png",
						text: "Wikipedia"
					}
				};
				if (repos.thumbnail) embed['thumbnail'] = { url: repos.thumbnail.source };
				msg.channel.send({embed: embed});
			})
			.catch(function (err) {
				msg.channel.send(arg[1] + " jsem nenašel :frowning:");
			});
	}

	if (cmd.search(/(?<=^|[\s.,!?;])co (vše(chno)? )?je mýtus(?=[\s.,!?;]|$)/i) !== -1) {
		const len = mythTable.size;
		if (len === 0) {
			msg.channel.send('Nic není mýtus.');
		} else {
			const mythArray = [...mythTable.keys()];
			const first = mythArray.slice(0, 1)[0];
			msg.channel.send(
				first[0].toUpperCase() + first.slice(1)
				+ (len > 2 ? (', '  + mythArray.slice(1, -1).join(', ')) : '')
				+ (len > 1 ? (' a ' + mythArray.slice(-1))               : '')
				+ ' je mýtus.'
			);
		}
	}
	if (cmd.search(/(?<=^|[\s.,!?;])co myslíš(?=[\s.,!?;]|$)/i) !== -1) {
		msg.channel.send(":fortune_cookie:" + eightBallTable[Math.floor(Math.random() * eightBallTable.length)]+":fortune_cookie:");
	}
				  
	if (cmd.search(/(?<=^|[\s.,!?;])(potřebuj(i|u) inspiraci|motivuj mně|nakopni mně)(?=[\s.,!?;]|$)/i) !== -1) {
		request('http://inspirobot.me/api?generate=true', function (error, response, body) {
     		if (!error && response.statusCode == 200) {
        		msg.channel.send({
          			embed: {
            			color: 3447003,
            			footer: {
							icon_url: "https://inspirobot.me/website/images/inspirobot-dark-green.png",
							text: "InspiroBot"
						},
            			image: {
              				url: body
            			}
          			}
        		});
      		}
	
		});
	}
});
bot.login(config.token);