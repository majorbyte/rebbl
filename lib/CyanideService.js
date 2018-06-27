'use strict';
const axios = require('axios');

class CyanideService{
  /**
   * @constructor
   */
  constructor(){
    this.apiKey = process.env['cyanideKey'];
  }

  static _serialize(params) {
    var str = [];
    for (var p in params)
      if (params.hasOwnProperty(p)) {
        str.push(encodeURIComponent(p) + "=" + encodeURIComponent(params[p]));
      }
    return str.join("&");
  }

  _url(method){
    return `http://web.cyanide-studio.com/ws/bb2/${method}/?key=${this.apiKey}`;
  }

  async _getData(endpoint, params){
    const queryString = CyanideService._serialize(params);
    const response =  await axios.get(`${this._url(endpoint)}&${queryString}`);

    if (response.data.meta)
      delete response.data.meta;
    if (response.data.urls)
      delete response.data.urls;

    return response.data;

  }
  /**
   * Return team details
   * @param {Object} params - The search criteria.
   * @param {string} [params.platform] - pc|ps4|xb1
   * @param {number} [params.team] - team id
   * @param {string} [params.name] - name of the team
   */
  async team(params){
    try{
      return await this._getData("team", params);
    } catch(e){
      //todo proper logging
      console.log(e);
    }
  }


  /**
   * Return all teams for a league for a given set of search criteria
   * @param {Object} params - The search criteria.
   * @param {string} [params.league] - League name (default = Cabalvision Official League)
   * @param {string} [params.competition] - Competition name (default = all competitions from given league),
   * @param {string} [params.platform] - pc|ps4|xb1
   * @param {number} [params.limit] - Max amount of team results (default = 100)
   */
  async teams(params){
    try{
      return await this._getData("teams", params);
    } catch(e){
      //todo proper logging
      console.log(e);
    }
  }

  /**
   * Return all teams for a league for a given set of search criteria
   * @param {Object} params - The search criteria.
   * @param {string} [params.platform] - pc|ps4|xb1
   * @param {string} [params.match_id] - BB2 Match UUID
   * @param {string} [params.bb] - Opus 1|2
   */
  async match(params){
    try{
      return await this._getData("match", params);
    } catch(e) {
      //todo proper logging
      console.log(e);
    }
  }

  /**
   * Return all teams for a league for a given set of search criteria
   * @param {Object} params - The search criteria.
   * @param {string} [params.platform] - pc|ps4|xb1
   * @param {string} [params.league] - League name (default = Cabalvision Official League)
   * @param {string} [params.competition] - Competition name (optional)
   * @param {number} [params.limit] - Max amount of match results (default = 100)
   * @param {string} [params.start] - Start date (default = 20 days ago)
   * @param {string} [params.end] - End date (default = today)
   * @param {string} [params.bb] - Opus 1|2
   *
   */
  async matches(params){
    try{
      return await this._getData("matches", params);
    } catch(e) {
      //todo proper logging
      console.log(e);
    }
  }


  /**
   * @typedef {Object} Coach
   * @property {number} id
   * @property {string} name
   * @property {string} twitch
   * @property {string} youtube
   * @property {string} country
   * @property {string} lang
   * */

  /**
   * @typedef {Object} OpponentTeam
   * @property {number} id
   * @property {string} name
   * @property {string} logo
   * @property {number} value
   * @property {string} motto
   * @property {number} score
   * @property {number} death
   * @property {string} race
   */

  /**
   * @typedef {Object} Opponent
   * @property {Coach} coach
   * @property {OpponentTeam} team
   */


   /**
   * @typedef {Object} ContestMatch
   * @property {string} league The league name
   * @property {string} competition The competition name
   * @property {number} competition_id  The competition id
   * @property {number} contest_id The id if the scheduled match
   * @property {string} format The competition format
   * @property {number} round Number identifying in what order matches are played
   * @property {string} type Type of the format, i.e. Single Match for Knock Out
   * @property {string} status played|scheduled
   * @property {string} stadium Statdium version
   * @property {string} match_uuid uuid for the match
   * @property {number} match_id id for the match
   * @property {Array.<Opponent>} opponents
   * @property {Opponent} winner
   */

  /**
   * @typedef {Object} ReturnContestMatch
   * @property {Array.<ContestMatch>} upcoming_matches
   */

  /**
   * Return all teams for a league for a given set of search criteria
   * @param {Object} params - The search criteria.
   * @param {string} [params.platform] - pc|ps4|xb1
   * @param {string} [params.league] - League name (default = Cabalvision Official League)
   * @param {string} [params.competition] - Competition name (default = all competitions from given league),
   * @param {string} [params.status] - scheduled|in_progress|played|* (default: sheduled; currently in_progress doesn't work)
   * @param {number} [params.round] - round
   * @param {number} [params.limit] - Max amount of results (default = 100)
   * @param {number} [params.exact] - 0|1 : Exact league name match
   * @return {ReturnContestMatch}
   */
  async contests(params){
    try {
      return await this._getData("contests", params);
    } catch (e){
      //todo proper logging
      console.log(e);
    }
  }
}

module.exports = new CyanideService();
