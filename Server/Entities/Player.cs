namespace rebbl.Server.Entities
{
    public class Player
    {
        public int Id { get; set; }
        public int TeamId { get; set; }
        public bool Active { get; set; }
        public bool Suspended{ get; set; }
        public int Number { get; set; }
        public int Type { get; set; }
        public int Name { get; set; }
        public int Level { get; set; }
        public int Experience { get; set; }
        public int Movement { get; set; }
        public int Agility { get; set; }
        public int ArmourValue { get; set; }
        public int Strength { get; set; }
        public int GamesPlayed { get; set; }
        public int MVP { get; set; }
        public int InflictedCasualties { get; set; }
        public int InflictedStuns { get; set; }
        public int InflictedPasses { get; set; }
        public int InflictedMetersPassing { get; set; }
        public int InflictedTackles { get; set; }
        public int InflictedKO { get; set; }
        public int InflictedDead { get; set; }
        public int InflictedInterceptions { get; set; }
        public int InflictedPushouts { get; set; }
        public int InflictedCatches { get; set; }
        public int InflictedInjuries { get; set; }
        public int InflictedMetersRunning { get; set; }
        public int InflictedTouchdowns { get; set; }
        public int SustainedInterceptions { get; set; }
        public int SustainedTackles { get; set; }
        public int SustainedInjuries { get; set; }
        public int SustainedDead { get; set; }
        public int SustainedKO { get; set; }
        public int SustainedCasualties { get; set; }
        public int SustainedStuns { get; set; }
        public string Skills { get; set; }
        public string CasualtiesState { get; set; }
        public string CasualtiesSustained { get; set; }

        public Team Team { get; set; }
    }
}
