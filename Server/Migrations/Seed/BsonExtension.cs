using MongoDB.Bson;
using System;

namespace rebbl.Server.Migrations.Seed
{
    public static class BsonExtension
    {
        public static int GetInt(this BsonDocument doc, string name) 
        {
            if (doc.TryGetValue(name, out var x)) 
            {
                return x.ToInt32();
            }
            return 0;
        }
        public static string GetString(this BsonDocument doc, string name)
        {
            if (doc.TryGetValue(name, out var x))
            {
                return x.ToString();
            }
            return "";
        }
        public static DateTime GetDateTime(this BsonDocument doc, string name)
        {
            if (doc.TryGetValue(name, out var x))
            {
                return DateTime.Parse(x.ToString());
            }
            return default(DateTime);
        }
    }
}
