# rebbl.net

This will be (hopefully) the remake of rebbl.net in C#/blazor and PostgreSql.

Currently just a PoC with reddit login working and some ugly contest page showing data from a GMan season.

In order to run this, install PostgreSql and restore the backup provided.

Then add the following `user-secrets`:

```bash
cd Server
dotnet user-secrets set "Reddit:ClientId" "{value}"
dotnet user-secrets set "Reddit:ClientSecret" "{value}"
dotnet user-secrets set "Sql:Password" "{value}"
dotnet user-secrets set "Sql:MongoUri" "{value}"
```

Since the reddit ClientId/Secret are currently only required for login and there's no data behind authorization yet, you can just add dummy data.
Same goes for the MongoUri, which is only used for seeding...
