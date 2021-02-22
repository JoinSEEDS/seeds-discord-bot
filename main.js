/* This section of code is used by the install and setup guides, if you modify it make sure you still are hosting a webpage (seen in "show") or Uptime Robot will stop working */

const express = require("express");
const router = express.Router();
const discordBotkit = require("botkit-discord");
const discordBot = require("./bot");

router.get("/guide", function(request, response) {
  response.sendFile(__dirname + "/views/index.html");
});

router.get("/domainname", function(request, response) {
  let domain = process.env.PROJECT_DOMAIN;
  response.status(200).json({
    message: domain
  });
});

router.get("/botinfo", async function(request, response) {
  let authURL;
  let domain = process.env.PROJECT_DOMAIN;
  let uptime = process.uptime();

  try {
    authURL =
      "https://discordapp.com/api/oauth2/authorize?client_id=" +
      discordBot.config.client.user.id +
      "&permissions=0&scope=bot";
  } catch (e) {
    console.error(e);
  }

  response.status(200).json({
    url: authURL,
    domain: domain,
    uptime: uptime
  });
});

router.get("/", function(request, response) {
  response.sendFile(__dirname + "/views/index.html");
});

module.exports = router;
