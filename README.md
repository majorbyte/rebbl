# REBBL.NET

## How to run locally

You need NodeJS and MongoDB to run this locally

1. [Download rebbl.net dump](https://cdn2.rebbl.net/rebbl.net/rebbl.archive) 
2. Run the following command: `mongorestore -h localhost -d rebbl --gzip --archive=<path>/rebbl.archive --drop`
3. Make sure you have the following environment variables availables:
    ```javascript
    NODE_ENV :"development"  // setting the env to development makes your local instance use local js/css files
    port : 3000 // port to run on
    mongoDBUri : "mongodb://127.0.0.1:27017/rebbl?retryWrites=true"

    // all of the following options are optional and not required to run

    //passport settings for reddit
    redditKey : "value" // your reddit key, makes sure this does NOT get checked in
    redditSecret : "value" // your reddit secret, makes sure this does NOT get checked in
    redditcallbackURL : "http://localhost:3000/auth/reddit/callback" // the local url for callback of the login action

    //Settings for a different application used for using the reddit API for getting comments from weekly threads, see ./lib/RedditService.js
    rebblPlannerKey :  "value" // your other reddit key, makes sure this does NOT get checked in
    rebblPlannerSecret : "value" // your other reddit secret, makes sure this does NOT get checked in
    redditUsername : "value" //Yes, requires an account
    redditPassword : "value" //and accompanying password

    cyanideKey : "value" // cyanide api key, needed if you want to sync data.
    verifyToken :  "value" // maintenace uses this to have Azure Functions call specific URLS
    rampuphook : "discord hook for stuff"
    errorhook : "discord hook for stuff"
    oiwebhook : "discord hook for stuff"
    storage : "Azure Storage Account URL"  //Used for uploading trophy images to the CDN  

4. Run `node server.js` or start from your favorite IDE like [VS Code](https://code.visualstudio.com/)

## How to run using Docker

⚠️**Important:** Windows 10 hosts must use [Linux containers](https://docs.docker.com/docker-for-windows/#switch-between-windows-and-linux-containers).

1. Install [Docker](https://www.docker.com/get-started)
2. Download the [Rebbel.net dump](https://cdn2.rebbl.net/rebbl.net/rebbl.archive) and store it on this folder as `rebbl.archive`
3. Run `docker-compose build`
4. Run `docker-compose up`. This is the only step you need to follow on subsequent runs.
