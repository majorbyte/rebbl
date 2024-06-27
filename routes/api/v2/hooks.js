'use strict';
const 
  accountService = require('../../../lib/accountService.js')
  , crypto = require('crypto')
  , express = require('express')
  , dataService = require("../../../lib/DataService.js").rebbl
  , util = require('../../../lib/util.js');


class HooksApi{
  constructor(){
    this.router = express.Router({mergeParams: true});
  }

  routesConfig(){
    this.router.get("/", util.ensureAuthenticated, this.#getHooks);
    this.router.post("/", util.ensureAuthenticated, this.#createHook.bind(this));
    this.router.put("/:id", util.ensureAuthenticated, this.#updateHook.bind(this));
    this.router.delete("/:id", util.ensureAuthenticated, this.#deleteHook);

    return this.router;
  }

  async #getHooks(req,res){
    try {
      let data = await dataService.getHooks({owner:req.user.name});
      data.forEach(x => {
        x.reportCoach = (x.bb3coach || false) !== false;
        delete x.bb3coach;
        delete x.token;
      });
      res.json(data);
    }
    catch (e){
      res.status(400).send({message: e.message});
    }
  }

  async #createHook(req,res){
    try {
      const hook =    {   
        races:req.body.races || [],
        competitions:req.body.competitions || [],
        owner:req.user.name
      } 
      
      //check webhook
      const webhook = await this.#checkWebhook(req.body.url);

      const existingHook = await dataService.getHook({id:webhook.id});
      if (existingHook) throw new Error(`this hook is already registered by ${existingHook.owner}`);

      hook.id = webhook.id;
      hook.token = this.#encrypt(webhook.token);
      hook.image = this.#getAvatar(webhook);
      hook.name = webhook.name;
      hook.channelId = webhook.channel_id;
      hook.guidlId = webhook.guild_id;
      
      await dataService.insertHook(hook);
      dataService.refreshHooks();
  
      res.json({});
    }
    catch (e){
      res.status(400).send({message: e.message});
    }
  }

  async #updateHook(req,res){
    try {
      const hook =  await dataService.getHook({id:req.params.id});

      if (hook.owner !== req.user.name) throw new Error ("You are not the owner of this hook.");

      hook.races = req.body.races || hook.races;
      hook.competitions = req.body.competitions || hook.competitions;

      if (req.body.reportCoach){
        const account = await accountService.getAccount(req.user.name);
        hook.bb3coach = account.bb3id || false;;
      } else {
        hook.bb3coach = false;
      }

      dataService.updateHook({_id:hook._id},hook);
      dataService.refreshHooks();
  
      res.json({});
    }
    catch (e){
      res.status(400).json({message: e.message});
    }
  }

  async #deleteHook(req,res){
    try{
      await dataService.removeHook({owner:req.user.name,id:req.params.id});
      res.json({});
    }
    catch (e){
      res.status(400).json({message: e.message});
    }
  }

  async #checkWebhook(url){
    const response = await fetch(url);

    if (response.ok) return await response.json();

    throw new Error("invalid webhook");
  }

  #getAvatar(webhook){
    if (webhook.avatar) return `https://cdn.discordapp.com/avatars/${webhook.id}/${webhook.avatar}.png`;

    return `https://cdn.discordapp.com/embed/avatars/${Math.abs((webhook.id >> 22) % 6)}.png` 
  }

  #encrypt(message) {
    const salt = crypto.randomBytes(16).toString('hex').slice(0, 16);
  
    const iv = crypto.randomBytes(16).toString('hex').slice(0, 16);
    const password = process.env['encryptionKey'];
  
    const key =crypto.scryptSync(password, salt, 32);
    const cipher = crypto.createCipheriv('aes-256-ctr', key, iv);
  
    let encryptedMessage = cipher.update(message, 'utf8', 'hex');
    encryptedMessage += cipher.final('hex');
  
    return `${encryptedMessage}:${iv}:${salt}`;
  }
}

module.exports = HooksApi;