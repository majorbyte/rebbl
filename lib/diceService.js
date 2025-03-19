'use strict';
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
    let response = await fetch(`https://www.random.org/integers/?num=${this.window}&min=1&max=${sides}&col=1&base=10&format=plain&rnd=new`);

    if (!response.ok) return -1;

    let data = await response.json();

    this.dice[sides+''] = data.split('\n').map(Number);
    this.dice[sides+''].pop();
  }
}

module.exports = new DiceService();