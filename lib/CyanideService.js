'use strict';
const axios = require('axios')
, loggingService = require("./loggingService.js");
const { query } = require('express');

class CyanideService{
  /**
   * @constructor
   */
  constructor(){
    this.apiKey = process.env['cyanideKey'];
    this.baseAddress = process.env['cyanideApiHost'];
  }

  static _serialize(params) {
    var str = [];
    for (var p in params)
      if (Object.prototype.hasOwnProperty.call(params,p)) {
        str.push(encodeURIComponent(p) + "=" + encodeURIComponent(params[p]));
      }
    return str.join("&");
  }

  _url(method){
    return `${this.baseAddress}/${method}/?key=${this.apiKey}`;
  }

  async _getData(endpoint, params){
    const queryString = CyanideService._serialize(params);
    
    let x = 0;
    while(x < 3){
      try {
        x++;
        let response = await axios.get(`${this._url(endpoint)}&${queryString}`);
        if (response.data.meta)
          delete response.data.meta;
        if (response.data.urls)
          delete response.data.urls;
        if (response.data.size)
          delete response.data.size;
  
        return response.data;
      } catch (e){
        e.message += `\n ${endpoint}: Try #${x} \n qs:${queryString}`; 
        if (e.message.indexOf("connect ETIMEDOUT") === -1) {
          loggingService.error(e);
        } else if(x === 3){
          loggingService.error(e);
        }
      }
      await new Promise(done => setTimeout(done, 10000));
    }
    return null;
  }

  /** 
   * 
   */
  async endpoints(){
    try{
      let response = await axios.get(`https://web.cyanide-studio.com/ws/?key=${this.apiKey}`);
      if (response.data.meta)
        delete response.data.meta;
      if (response.data.urls)
        delete response.data.urls;
      if (response.data.size)
        delete response.data.size;
      return response.data;
    } catch(e){
      return e.message;
    }
  }

  /**
   * Return team details
   * @param {Object} params - The search criteria.
   * @param {string} [params.platform] - pc|ps4|xb1
   * @param {number} [params.team] - team id
   * @param {string} [params.name] - name of the team
   * @param {string} [params.order] - ID|LastMatchDate|CreationDate
   * @param {string} [params.bb] - 1|2|3
   */
  async team(params){
    if (!params.order) params.order = 'CreationDate';
    return await this._getData("team", params);
  }


  /**
   * Return all teams for a league for a given set of search criteria
   * @param {Object} params - The search criteria.
   * @param {string} [params.league] - League name (default = Cabalvision Official League)
   * @param {string} [params.competition] - Competition name (default = all competitions from given league),
   * @param {string} [params.platform] - pc|ps4|xb1
   * @param {number} [params.limit] - Max amount of team results (default = 100)
   * @param {string} [params.bb] - 1|2|3
   */
  async teams(params){
    return await this._getData("teams", params);
  }

  /**
   * Return all teams for a league for a given set of search criteria
   * @param {Object} params - The search criteria.
   * @param {string} [params.platform] - pc|ps4|xb1
   * @param {string} [params.match_id] - BB2 Match UUID
   * @param {string} [params.bb] - Opus 1|2|3
   */
  async match(params){
    return await this._getData("match", params);
  }

  /**
   * Return all teams for a league for a given set of search criteria
   * @param {Object} params - The search criteria.
   * @param {string} [params.platform] - pc|ps4|xb1
   * @param {string} [params.league] - League name (default = Cabalvision Official League), this can be a comma seperated value
   * @param {string} [params.competition] - Competition name (optional)
   * @param {number} [params.limit] - Max amount of match results (default = 100)
   * @param {string} [params.start] - Start date (default = 20 days ago)
   * @param {string} [params.end] - End date (default = today)
   * @param {string} [params.order] - finished|started
   * @param {string} [params.bb] - Opus 1|2|3
   * @param {string} [params.id_only] - IDs only 0|1
   * @param {string} [params.team_id] - Team ID
   */
  async matches(params){
    return await this._getData("matches", params);
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
   * @property {Array.<ContestMatch>} contests
   */

  /**
   * Return all matches for a league for a given set of search criteria
   * @param {Object} params - The search criteria.
   * @param {string} [params.platform] - pc|ps4|xb1
   * @param {string} [params.league] - League name (default = Cabalvision Official League)
   * @param {string} [params.competition] - Competition name (default = all competitions from given league),
   * @param {string} [params.status] - scheduled|in_progress|played|* (default: sheduled; currently in_progress doesn't work)
   * @param {number} [params.round] - round
   * @param {number} [params.limit] - Max amount of results (default = 100)
   * @param {number} [params.exact] - 0|1 : Exact league name match
   * @param {string} [params.bb] - Opus 1|2|3
   * @return {Promise<ReturnContestMatch>} list of matches
   */
  async contests(params){
    return await this._getData("contests", params);
  }



  /**
   * @typedef {Object} League
   * @property {number} id The league id
   * @property {string} name The league name
   * @property {Date} date_created Date of creation
   * @property {boolean} official Indicator for official Cyanide leagues
   * @property {string} logo The league's logo
   * @property {number} registered_teams_count Number of teams in competition
   */

  /**
   * @typedef {Object} Competition
   * @property {number} id The competition id
   * @property {string} name The competition name
   * @property {Date} date_created Date of creation
   * @property {string} format The competition format
   * @property {number} status closed(1) or open(0)
   * @property {number} teams_max Number of allowed teams
   * @property {number} teams_count Number of current teams
   * @property {number} rounds_count Number of round to be played
   * @property {number} round Number identifying in what order matches are played
   * @property {number} turn_duration 0 = 1 minute, 3 = 4 minutes
   * @property {League} winner*
   */

  /**
   * @typedef {Object} ReturnCompetitions
   * @property {Array.<Competition>} competitions
   */

  /**
   * Return all competitions in a league
   * @param {Object} params - The search criteria.
   * @param {string} [params.league] - League name (default = Cabalvision Official League)
   * @param {string} [params.platform] - pc|ps4|xb1
   * @param {number} [params.limit] - Max amount of results (default = 100)
   * @param {number} [params.exact] - 0|1 : Exact league name match
   * @param {string} [params.bb] - Opus 1|2|3
   * @return {Promise<ReturnCompetitions>} list of competitions
   */
  async competitions(params){
    return await this._getData("competitions", params);
  }

  /**
   * @typedef {Object} LeagueCheck
   * @property {number} id The league id
   * @property {string} name The league name
   * @property {Date} date_last_match Date of latest match played
   * @property {string} logo The league's logo
   * @property {boolean} official Indicator for official Cyanide leagues
   * @property {number} treasury Assest
   * @property {number} teams_count Number of teams in competition
   */
    /**
   * @typedef {Object} ReturnLeagueCheck
   * @property {LeagueCheck} league
   */

  /**
   * Return league information
   * @param {Object} params - The search criteria.
   * @param {string} [params.league] - League name (default = Cabalvision Official League)
   * @param {string} [params.platform] - pc|ps4|xb1
   * @param {string} [params.bb] - Opus 1|2|3
   * @return {Promise<ReturnLeagueCheck>} information about the league 
   */
  async league(params){
    return await this._getData("league", params);
  }

  /**
   * @typedef {Object} MatchData
   * @property {string} uuid
   * @property {number} id
   */
  /**
   * @typedef {Object} ReturnMatchData
   * @property {Array.<MatchData>} matches
   */
  /**
   * Return all matches for a team
   * @param {Object} params - The search criteria.
   * @param {number} [params.limit] - Max amount of results (default = 100)
   * @param {string} [params.start] - Start date (default = 1 hour ago)
   * @param {string} [params.end] - End date (default = today)
   * @param {number} [params.bb] - Opus 1|2|3
   * @param {number} [params.order] - Ordering started|finished
   * @param {number} [params.team_id] - Team ID
   * @return {Promise<ReturnMatchData>} list of matches
   */
  async teammatches(params){
    return await this._getData("teammatches", params);
  }
  /**
   * Return UTC timestamp for the last finished match in a league
   * @param {Object} params - The search criteria.
   * @param {string} [params.league] - League name (default = Cabalvision Official League)
   * @param {string} [params.platform] - pc|ps4|xb1
   * @param {string} [params.bb] - Opus 1|2|3
   * @return {Promise<string>} Latest time a match was played
   */
  async lastMatchPlayed(params){
    const data = await this._getData("league", params);
    return data.league.date_last_match;
  }
}

module.exports = new CyanideService();

