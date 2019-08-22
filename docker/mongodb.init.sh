# Init DB when the /data/db does not exist:
MONGO_FILE="/data/db/storage.bson"
if test -f "$MONGO_FILE"; then
  echo "started Mongo"
else
  mongod --fork --logpath /var/log/mongodb.log
  mongorestore --gzip --dir /usr/src/rebbl
  mongod --shutdown;
fi

# Init Mongod
docker-entrypoint.sh mongod
