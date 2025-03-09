
function profiler(url){
  const format = (d) => d[0] * 1e3 + d[1] * 1e-6;
  let s = process.hrtime();
  return {
    url: url,
    start: s,
    previous: s,
    steps:[],
    total:0,
    step: function(step, type){
      const diff = Number(format(process.hrtime(this.previous)));
      this.steps.push({
        type:type||"general",
        name:step,
        total:this.total + diff,
        delta:diff
      });
      this.total += diff;
      this.previous = process.hrtime();
    },
    measure: async function(step, type, cb){
      this.previous = process.hrtime();

      const result = await cb;
      this.step(step, type);
      return result;
    },
    result:function(){
      const generalTime = this.steps.filter(x => x.type == "general").reduce((p,c) => p + c.delta,0);
      const dataTime = this.steps.filter(x => x.type == "database").reduce((p,c) => p + c.delta,0);
      const renderTime = this.steps.filter(x => x.type == "render").reduce((p,c) => p + c.delta,0);
      const totalTime = this.steps[this.steps.length-1].total;
      const r = x => ~~(x*100)/100;
      return `rendered in ${r(totalTime)}ms (general:${r(generalTime)}ms, database:${r(dataTime)}ms, render:${r(renderTime)}ms)`;
    }
  };
}


module.exports.profiler = (req,res,next) => {

  res.locals.profiler = profiler(req.originalUrl);
  res.locals.profiler.step("init");

  const tempSend = res.send;
  res.send = function(...args){

    tempSend.apply(this,args);
    res.locals.profiler.step("send");
    //console.dir(res.locals.profiler);
  };
  const tempRender = res.render;

  const cb = function(err,str){
    res.locals.profiler.step("rendered","render");
    if (err) return next(err);

    if (str.indexOf("<span class=\"content\">#debuginformation#") === -1) return res.send(str)
    
    res.send(str.replace("#debuginformation#", res.locals.profiler.result()));
  };
  res.render = function(...args){
    res.locals.profiler.step("start rendering","render");
    args.push(cb);
    tempRender.apply(this,args);
  };

  next();
};