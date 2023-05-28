# REBBL.NET

## How to run locally

You need NodeJS and MongoDB to run this locally

1. [Download rebbl.net dump](https://cdn.rebbl.net/rebbl.net/rebbl.archive) 
2. Run the following command: `mongorestore -h localhost -d rebbl --gzip --archive=<path>/rebbl.archive --drop`
3. Make sure you have the following environment variables availables:
    ```javascript
    NODE_ENV :"development"  // setting the env to development makes your local instance use local js/css files
    port : 3000 // port to run on

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
    
    DB_USER:"user",
    DB_PASS:"pass",
    DB_HOST:"host",
    DB_PORT:"port",
    DB_NAME:"rebbl"
    ```

4. Run `node server.js` or start from your favorite IDE like [VS Code](https://code.visualstudio.com/)

## How to run using Docker

⚠️**Important:** Windows 10 hosts must use [Linux containers](https://docs.docker.com/docker-for-windows/#switch-between-windows-and-linux-containers).

1. Install [Docker](https://www.docker.com/get-started)
2. Download the [Rebbel.net dump](https://cdn.rebbl.net/rebbl.net/rebbl.archive) and store it on `./db-dump/rebbl.archive`
3. Create a `.env` with the follow contents
    ```yml
    port=3000 
    #all of the following options are optional and not required to run

    #passport settings for reddit
    redditKey=value #your reddit key, makes sure this does NOT get checked in
    redditSecret=value #your reddit secret, makes sure this does NOT get checked in
    redditcallbackURL=http://localhost:3000/auth/reddit/callback #the local url for callback of the login action

    #Settings for a different application used for using the reddit API for getting comments from weekly threads, see ./lib/RedditService.js
    rebblPlannerKey=value #your other reddit key, makes sure this does NOT get checked in
    rebblPlannerSecret=value #your other reddit secret, makes sure this does NOT get checked in
    redditUsername=value #Yes, requires an account
    redditPassword=value #and accompanying password

    cyanideKey=value #cyanide api key, needed if you want to sync data.
    verifyToken=value #maintenace uses this to have Azure Functions call specific URLS
    rampuphook= #discord hook for stuff
    errorhook= #discord hook for stuff
    oiwebhook= #discord hook for stuff

    DB_USER=user
    DB_PASS=pass
    DB_HOST=host
    DB_PORT=port
    DB_NAME=rebbl  
    ```
4. Run `docker-compose build`

## First time running locallly
1. For the first time, run `docker start rebbl_mongodb-dev_1`
2. Followed by `docker exec -i rebbl_mongodb-dev_1 /usr/bin/mongorestore --db rebbl --archive=/db-dump/rebbl.archive --gzip --username=user --authenticationDatabase=admin --drop`
3. Run `docker-compose up`

## subsequent runs
1. Run `docker-compose up` alternatively `docker-compose up -d` 
