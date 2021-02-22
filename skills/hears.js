// Botkit is powered by "skills". For example this one is "hears"
// Basically the bot listens to to direct mentions and mentions (of the bot)
// and if it hears the word "!thanks" then the skill is triggered
// try changing the trigger word
// here are the docs for more info https://botkit.ai/docs/v0/core.html
// and the Botkit Discord code which has some great examples!
// https://github.com/brh55/botkit-discord

module.exports = function(controller) {
  // help
  controller.hears(
    ["help", "hi", "hello", "!help"],
    ["direct_mention", "mention"],
    (bot, message) => {
      const sender = message.user.toString();
      bot.reply(
        message,
        `
        Hey ${sender}! I'm GratzBot, and I can aid you to interact with SEEDS Gratitude in many ways!
        
        * To pay someone with Seeds send me a DM: \`\!pay <seeds-account> <value> [memo]\`.
        * To check your token balances send me a DM: \`\!balance <seeds-account>\`.
        * To give gratitude tokens to someone send me a DM: \`\!gratz <seeds-account> <quantity> [memo]\`.
        * I can also show current gratitude round stats: \`\!grstats\`.
        
        Welcome to the SEEDS ecossystem!`
      );
    }
  );
  
  controller.hears("!setgratzchannel", ["mention"], (bot, message) => {
    const sender = message.user.toString();
    bot.createConversation(message, (err, convo) => {
      convo.addQuestion("What is the password?", (response, convo) => {
        const password = response.text.match(/[0-9]+/g);
        if (password != process.env.GRATZ_ADMIN_PASSWORD) {
          convo.say("Wrong password!");
          convo.next();
        }
        convo.say("Ok, done.");
        // save channel to tb now
        convo.next();
      });
    });

    bot.reply(message, "Setting #channel as target for gratitude messages.");
  });

  controller.hears("!pay", ["direct_message"], (bot, message) => {
    let response;
    let sender = message.user;
    //let recipient = message.mentions.users.filter(user => user.bot === false).last();
    let pieces = message.text.split(" ");
    var recipient, quantity, memo;
    if (pieces.length == 4) {
      recipient = pieces[pieces.length - 3];
      quantity = pieces[pieces.length - 2];
      memo = pieces[pieces.length - 1];
    } else if (pieces.length == 3) {
      recipient = pieces[pieces.length - 2];
      quantity = pieces[pieces.length - 1];
      memo = "";
    } else {
      bot.reply(message, "Usage: pay <to> <quantity> [memo]");
      return message.intent === "help";
    }

    const request = require("sync-request");

    var res = request(
      "GET",
      `https://api-esr.hypha.earth/invoice?to=${recipient}&quantity=${quantity}&memo={memo}`,
      {
        headers: {
          "user-agent": "bot-user-agent"
        }
      }
    );
    res = JSON.parse(res.getBody("utf8"));

    const embed = new controller.RichEmbed();
    embed.addField(
      `Sending ${quantity} Seeds to ${recipient}.`,
      "Scan using SEEDS Wallet"
    );
    embed.setColor("GREEN");
    embed.setImage(res.qr);
    embed.setAuthor("Authorize Payment");
    embed.setTitle("Click to authorize from mobile");
    var link = "https://eosio.to/" + res.esr.slice(6);
    embed.setURL(link);

    bot.reply(message, embed);
  });

  controller.hears("!balance", ["direct_message"], (bot, message) => {
    let response;
    let sender = message.user;
    //let recipient = message.mentions.users.filter(user => user.bot === false).last();
    let pieces = message.text.split(" ");
    let account = pieces[pieces.length - 1];

    const request = require("sync-request");
    const {
      getReceivedGratitude,
      getRemainingGratitude,
      getBalance
    } = require("../seeds");

    const embed = new controller.RichEmbed();
    //https://github.com/cc32d9/eosio_light_api
    var res = request(
      "GET",
      `https://api.light.xeos.me/api/account/telos/${account}`,
      {
        headers: {
          "user-agent": "bot-user-agent"
        }
      }
    );
    res = JSON.parse(res.getBody("utf8"));
    Promise.all([
      getRemainingGratitude(account),
      getReceivedGratitude(account)
    ]).then(([remaining, received]) => {
      for (var i = 0; i < res.balances.length; i++) {
        embed.addField(res.balances[i].currency, res.balances[i].amount);
      }
      embed.addField("GRATZ to give", remaining);
      embed.addField("GRATZ received", received);
      embed.setColor("GREEN");
      embed.setAuthor("Token Balances");
      embed.setTitle(`Balances for ${account}`);
      bot.reply(message, embed);
    });
  });

  controller.hears("!gratz", ["direct_message"], (bot, message) => {
    let response;
    let sender = message.user;
    //let recipient = message.mentions.users.filter(user => user.bot === false).last();
    let pieces = message.text.split(" ");
    var recipient, quantity, memo;
    if (pieces.length == 4) {
      recipient = pieces[pieces.length - 3];
      quantity = pieces[pieces.length - 2];
      memo = pieces[pieces.length - 1];
    } else if (pieces.length == 3) {
      recipient = pieces[pieces.length - 2];
      quantity = pieces[pieces.length - 1];
      memo = "";
    } else {
      bot.reply(message, "Usage: gratz <to> <quantity> [memo]");
      return message.intent === "help";
    }

    const request = require("sync-request");

    var res = request("POST", `https://api-esr.hypha.earth/qr`, {
      headers: {
        "user-agent": "bot-user-agent"
      },
      json: {
        actions: [
          {
            account: "gratz.seeds",
            name: "give",
            authorization: [
              {
                actor: "............1",
                permission: "............2"
              }
            ],
            data: {
              from: "............1",
              to: recipient,
              quantity: parseFloat(quantity).toFixed(4) + " GRATZ",
              memo: memo
            }
          }
        ]
      }
    });
    res = JSON.parse(res.getBody("utf8"));

    const embed = new controller.RichEmbed();
    embed.addField(
      `Gifting ${quantity} GRATZ to ${recipient}.`,
      "Scan using your SEEDS Wallet"
    );
    embed.setColor("GREEN");
    embed.setImage(res.qr);
    embed.setAuthor("Authorize Gratitude");
    embed.setTitle("Click to authorize from mobile");
    var link = "https://eosio.to/" + res.esr.slice(6);
    embed.setURL(link);

    //const channel = message.guild.channels.find(ch => ch.name === 'gratitude');
    //channel.send(`${sender} sent ${quantity} gratitude to ${recipient}`)
    bot.reply(message, embed);
  });

  controller.hears("!grstats", ["direct_message"], (bot, message) => {
    let response;
    let sender = message.user;

    const { getBalance, getGratitudeStats } = require("../seeds");

    const embed = new controller.RichEmbed();
    Promise.all([getBalance("gratz.seeds"), getGratitudeStats()]).then(
      ([bal, stats]) => {
        embed.addField("Current round", stats.round_id);
        embed.addField("SEEDS on round", bal);
        embed.addField("Number of gratitude transactions", stats.num_transfers);
        embed.addField("Gratitude volume", stats.volume);
        embed.setColor("GREEN");
        embed.setAuthor("Gratitude round stats");
        bot.reply(message, embed);
      }
    );
  });
};
