'use strict';
const axios = require('axios');

class DiceService {
  constructor(){
    this.dice = {};
    this.window = 500;
  }

  async roll(sides) {

    const key = sides+'';
    if (!this.dice[key]){
      this.dice[key] = [];
    }

    if (this.dice[key].length === 0){
      await this._getDice(sides);
    }

    return this.dice[key].shift();
  }

  async _getDice(sides){
    let response = await axios.get(`https://www.random.org/integers/?num=${this.window}&min=1&max=${sides}&col=1&base=10&format=plain&rnd=new`);

    this.dice[sides+''] = response.data.split('\n').map(Number);
    this.dice[sides+''].pop();
  }
}

module.exports = new DiceService();