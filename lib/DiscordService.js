'use strict';

const accountService = require("./accountService.js") 
  , axios = require('axios')
  , { URLSearchParams } = require('url');


const CLIENT_ID = process.env['discord.clientId'];
const CLIENT_SECRET = process.env['discord.clientSecret'];

class DiscordService{
  async authDiscordCallback(code, url) {
    try {
      if (!code) return null;

      const params = new URLSearchParams();
      params.append('client_id', CLIENT_ID);
      params.append('client_secret', CLIENT_SECRET);
      params.append('grant_type', 'authorization_code');
      params.append('code', code);
      params.append('redirect_uri', url);
      params.append('scope', 'identify');


      const options = {
        baseURL: 'https://discord.com',
        url: '/api/oauth2/token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        data:params
      }

      const response = await axios(options);
      return response.data.access_token;
    } catch (ex) {
      console.log(ex.message);
      console.log(ex.stack);
    }
    return null;
  }

  async updateDiscord(token, account) {
    const response = await axios(`https://discord.com/api/oauth2/@me`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        },
      }
    );

    const discordUser = response.data.user;
    
    if (!discordUser) return false;

    account.discordId = discordUser.id;
    account.discord = discordUser.username;
    account.discordOptedOut = false;

    await accountService.updateAccount(account);
    return true;
  }
}  

module.exports = new DiscordService();