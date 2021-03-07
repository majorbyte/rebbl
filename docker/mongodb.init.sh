INIT_CHECK_FILE="/data/db/db-has-been-initialized"

if test -f "$INIT_CHECK_FILE"; then
  echo "Skipping init db"
else
  mongod --fork --logpath /var/log/mongodb.log
  mongorestore -h localhost -d rebbl --gzip --archive=/usr/src/rebbl.archive --drop
  mongod --shutdown
  touch "$INIT_CHECK_FILE"
fi

# Init Mongod
docker-entrypoint.sh mongod
