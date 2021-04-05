using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

namespace rebbl.Server.Migrations
{
    public partial class InitialSchema : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "public");

            migrationBuilder.CreateTable(
                name: "AspNetRoles",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    normalizedname = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    concurrencystamp = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_aspnetroles", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "coaches",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_coaches", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "DeviceCodes",
                schema: "public",
                columns: table => new
                {
                    usercode = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    devicecode = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    subjectid = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    sessionid = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    clientid = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    description = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    creationtime = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    expiration = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    data = table.Column<string>(type: "character varying(50000)", maxLength: 50000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_devicecodes", x => x.usercode);
                });

            migrationBuilder.CreateTable(
                name: "leagues",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "text", nullable: true),
                    logo = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_leagues", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "PersistedGrants",
                schema: "public",
                columns: table => new
                {
                    key = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    subjectid = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    sessionid = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    clientid = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    description = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    creationtime = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    expiration = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    consumedtime = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    data = table.Column<string>(type: "character varying(50000)", maxLength: 50000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_persistedgrants", x => x.key);
                });

            migrationBuilder.CreateTable(
                name: "AspNetRoleClaims",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    roleid = table.Column<string>(type: "text", nullable: false),
                    claimtype = table.Column<string>(type: "text", nullable: true),
                    claimvalue = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_aspnetroleclaims", x => x.id);
                    table.ForeignKey(
                        name: "fk_aspnetroleclaims_aspnetroles_roleid",
                        column: x => x.roleid,
                        principalSchema: "public",
                        principalTable: "AspNetRoles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUsers",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    coachid = table.Column<int>(type: "integer", nullable: false),
                    username = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    normalizedusername = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    normalizedemail = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    emailconfirmed = table.Column<bool>(type: "boolean", nullable: false),
                    passwordhash = table.Column<string>(type: "text", nullable: true),
                    securitystamp = table.Column<string>(type: "text", nullable: true),
                    concurrencystamp = table.Column<string>(type: "text", nullable: true),
                    phonenumber = table.Column<string>(type: "text", nullable: true),
                    phonenumberconfirmed = table.Column<bool>(type: "boolean", nullable: false),
                    twofactorenabled = table.Column<bool>(type: "boolean", nullable: false),
                    lockoutend = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    lockoutenabled = table.Column<bool>(type: "boolean", nullable: false),
                    accessfailedcount = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_aspnetusers", x => x.id);
                    table.ForeignKey(
                        name: "fk_aspnetusers_coaches_coachid",
                        column: x => x.coachid,
                        principalSchema: "public",
                        principalTable: "coaches",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "teams",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    created = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    datelastmatch = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    name = table.Column<string>(type: "text", nullable: true),
                    coachid = table.Column<int>(type: "integer", nullable: false),
                    raceid = table.Column<int>(type: "integer", nullable: false),
                    logo = table.Column<string>(type: "text", nullable: true),
                    teamcolor = table.Column<int>(type: "integer", nullable: false),
                    motto = table.Column<string>(type: "text", nullable: true),
                    value = table.Column<int>(type: "integer", nullable: false),
                    fanfactor = table.Column<int>(type: "integer", nullable: false),
                    cash = table.Column<int>(type: "integer", nullable: false),
                    cheerleaders = table.Column<int>(type: "integer", nullable: false),
                    balms = table.Column<int>(type: "integer", nullable: false),
                    apothecary = table.Column<int>(type: "integer", nullable: false),
                    necromancer = table.Column<int>(type: "integer", nullable: false),
                    rerolls = table.Column<int>(type: "integer", nullable: false),
                    assistantcoaches = table.Column<int>(type: "integer", nullable: false),
                    stadiumname = table.Column<string>(type: "text", nullable: true),
                    stadiumlevel = table.Column<int>(type: "integer", nullable: false),
                    stadiumtype = table.Column<string>(type: "text", nullable: true),
                    stadiumupgrade = table.Column<string>(type: "text", nullable: true),
                    nextmatchvalue = table.Column<int>(type: "integer", nullable: false),
                    actualvalue = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_teams", x => x.id);
                    table.ForeignKey(
                        name: "fk_teams_coaches_coachid",
                        column: x => x.coachid,
                        principalSchema: "public",
                        principalTable: "coaches",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "competitions",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "text", nullable: true),
                    format = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<int>(type: "integer", nullable: false),
                    rounds = table.Column<int>(type: "integer", nullable: false),
                    round = table.Column<int>(type: "integer", nullable: false),
                    leagueid = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_competitions", x => x.id);
                    table.ForeignKey(
                        name: "fk_competitions_leagues_leagueid",
                        column: x => x.leagueid,
                        principalSchema: "public",
                        principalTable: "leagues",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserClaims",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    userid = table.Column<string>(type: "text", nullable: false),
                    claimtype = table.Column<string>(type: "text", nullable: true),
                    claimvalue = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_aspnetuserclaims", x => x.id);
                    table.ForeignKey(
                        name: "fk_aspnetuserclaims_aspnetusers_userid",
                        column: x => x.userid,
                        principalSchema: "public",
                        principalTable: "AspNetUsers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserLogins",
                schema: "public",
                columns: table => new
                {
                    loginprovider = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    providerkey = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    providerdisplayname = table.Column<string>(type: "text", nullable: true),
                    userid = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_aspnetuserlogins", x => new { x.loginprovider, x.providerkey });
                    table.ForeignKey(
                        name: "fk_aspnetuserlogins_aspnetusers_userid",
                        column: x => x.userid,
                        principalSchema: "public",
                        principalTable: "AspNetUsers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserRoles",
                schema: "public",
                columns: table => new
                {
                    userid = table.Column<string>(type: "text", nullable: false),
                    roleid = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_aspnetuserroles", x => new { x.userid, x.roleid });
                    table.ForeignKey(
                        name: "fk_aspnetuserroles_aspnetroles_roleid",
                        column: x => x.roleid,
                        principalSchema: "public",
                        principalTable: "AspNetRoles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_aspnetuserroles_aspnetusers_userid",
                        column: x => x.userid,
                        principalSchema: "public",
                        principalTable: "AspNetUsers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserTokens",
                schema: "public",
                columns: table => new
                {
                    userid = table.Column<string>(type: "text", nullable: false),
                    loginprovider = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    name = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    value = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_aspnetusertokens", x => new { x.userid, x.loginprovider, x.name });
                    table.ForeignKey(
                        name: "fk_aspnetusertokens_aspnetusers_userid",
                        column: x => x.userid,
                        principalSchema: "public",
                        principalTable: "AspNetUsers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "player",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    teamid = table.Column<int>(type: "integer", nullable: false),
                    active = table.Column<bool>(type: "boolean", nullable: false),
                    suspended = table.Column<bool>(type: "boolean", nullable: false),
                    number = table.Column<int>(type: "integer", nullable: false),
                    type = table.Column<int>(type: "integer", nullable: false),
                    name = table.Column<int>(type: "integer", nullable: false),
                    level = table.Column<int>(type: "integer", nullable: false),
                    experience = table.Column<int>(type: "integer", nullable: false),
                    movement = table.Column<int>(type: "integer", nullable: false),
                    agility = table.Column<int>(type: "integer", nullable: false),
                    armourvalue = table.Column<int>(type: "integer", nullable: false),
                    strength = table.Column<int>(type: "integer", nullable: false),
                    gamesplayed = table.Column<int>(type: "integer", nullable: false),
                    mvp = table.Column<int>(type: "integer", nullable: false),
                    inflictedcasualties = table.Column<int>(type: "integer", nullable: false),
                    inflictedstuns = table.Column<int>(type: "integer", nullable: false),
                    inflictedpasses = table.Column<int>(type: "integer", nullable: false),
                    inflictedmeterspassing = table.Column<int>(type: "integer", nullable: false),
                    inflictedtackles = table.Column<int>(type: "integer", nullable: false),
                    inflictedko = table.Column<int>(type: "integer", nullable: false),
                    inflicteddead = table.Column<int>(type: "integer", nullable: false),
                    inflictedinterceptions = table.Column<int>(type: "integer", nullable: false),
                    inflictedpushouts = table.Column<int>(type: "integer", nullable: false),
                    inflictedcatches = table.Column<int>(type: "integer", nullable: false),
                    inflictedinjuries = table.Column<int>(type: "integer", nullable: false),
                    inflictedmetersrunning = table.Column<int>(type: "integer", nullable: false),
                    inflictedtouchdowns = table.Column<int>(type: "integer", nullable: false),
                    sustainedinterceptions = table.Column<int>(type: "integer", nullable: false),
                    sustainedtackles = table.Column<int>(type: "integer", nullable: false),
                    sustainedinjuries = table.Column<int>(type: "integer", nullable: false),
                    sustaineddead = table.Column<int>(type: "integer", nullable: false),
                    sustainedko = table.Column<int>(type: "integer", nullable: false),
                    sustainedcasualties = table.Column<int>(type: "integer", nullable: false),
                    sustainedstuns = table.Column<int>(type: "integer", nullable: false),
                    skills = table.Column<string>(type: "text", nullable: true),
                    casualtiesstate = table.Column<string>(type: "text", nullable: true),
                    casualtiessustained = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_player", x => x.id);
                    table.ForeignKey(
                        name: "fk_player_teams_teamid",
                        column: x => x.teamid,
                        principalSchema: "public",
                        principalTable: "teams",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "matches",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    competitionid = table.Column<int>(type: "integer", nullable: false),
                    started = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    finished = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    round = table.Column<int>(type: "integer", nullable: false),
                    stadium = table.Column<string>(type: "text", nullable: true),
                    stadiumenhancement = table.Column<string>(type: "text", nullable: true),
                    hometeamid = table.Column<int>(type: "integer", nullable: false),
                    awayteamid = table.Column<int>(type: "integer", nullable: false),
                    homecoachid = table.Column<int>(type: "integer", nullable: false),
                    awaycoachid = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_matches", x => x.id);
                    table.UniqueConstraint("ak_matches_id_awayteamid", x => new { x.id, x.awayteamid });
                    table.UniqueConstraint("ak_matches_id_hometeamid", x => new { x.id, x.hometeamid });
                    table.ForeignKey(
                        name: "fk_matches_coaches_awaycoachid",
                        column: x => x.awaycoachid,
                        principalSchema: "public",
                        principalTable: "coaches",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_matches_coaches_coachid",
                        column: x => x.homecoachid,
                        principalSchema: "public",
                        principalTable: "coaches",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_matches_competitions_competitionid",
                        column: x => x.competitionid,
                        principalSchema: "public",
                        principalTable: "competitions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_matches_teams_teamid",
                        column: x => x.awayteamid,
                        principalSchema: "public",
                        principalTable: "teams",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_matches_teams_teamid1",
                        column: x => x.hometeamid,
                        principalSchema: "public",
                        principalTable: "teams",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "contests",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    competitionid = table.Column<int>(type: "integer", nullable: false),
                    round = table.Column<int>(type: "integer", nullable: true),
                    matchtype = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<string>(type: "text", nullable: true),
                    stadium = table.Column<string>(type: "text", nullable: true),
                    homecoachid = table.Column<int>(type: "integer", nullable: true),
                    hometeamid = table.Column<int>(type: "integer", nullable: false),
                    hometv = table.Column<int>(type: "integer", nullable: false),
                    homescore = table.Column<int>(type: "integer", nullable: true),
                    homedeath = table.Column<int>(type: "integer", nullable: true),
                    awaycoachid = table.Column<int>(type: "integer", nullable: true),
                    awayteamid = table.Column<int>(type: "integer", nullable: false),
                    awaytv = table.Column<int>(type: "integer", nullable: false),
                    awayscore = table.Column<int>(type: "integer", nullable: true),
                    awaydeath = table.Column<int>(type: "integer", nullable: true),
                    matchuuid = table.Column<string>(type: "text", nullable: true),
                    matchid = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_contests", x => x.id);
                    table.ForeignKey(
                        name: "fk_contests_coaches_awaycoachid",
                        column: x => x.awaycoachid,
                        principalSchema: "public",
                        principalTable: "coaches",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_contests_coaches_coachid",
                        column: x => x.homecoachid,
                        principalSchema: "public",
                        principalTable: "coaches",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_contests_competitions_competitionid",
                        column: x => x.competitionid,
                        principalSchema: "public",
                        principalTable: "competitions",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_contests_matches_matchid1",
                        column: x => x.matchuuid,
                        principalSchema: "public",
                        principalTable: "matches",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_contests_teams_awayteamid",
                        column: x => x.awayteamid,
                        principalSchema: "public",
                        principalTable: "teams",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_contests_teams_hometeamid",
                        column: x => x.hometeamid,
                        principalSchema: "public",
                        principalTable: "teams",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "matchteams",
                schema: "public",
                columns: table => new
                {
                    matchid = table.Column<string>(type: "text", nullable: false),
                    teamid = table.Column<int>(type: "integer", nullable: false),
                    competitionid = table.Column<int>(type: "integer", nullable: false),
                    tv = table.Column<int>(type: "integer", nullable: false),
                    score = table.Column<int>(type: "integer", nullable: false),
                    cashbeforematch = table.Column<int>(type: "integer", nullable: false),
                    popularitybeforematch = table.Column<int>(type: "integer", nullable: false),
                    popularitygain = table.Column<int>(type: "integer", nullable: false),
                    cashspentinducements = table.Column<int>(type: "integer", nullable: false),
                    cashearned = table.Column<int>(type: "integer", nullable: false),
                    cashearnedbeforeconcession = table.Column<int>(type: "integer", nullable: false),
                    winningsdice = table.Column<int>(type: "integer", nullable: false),
                    spirallingexpenses = table.Column<int>(type: "integer", nullable: false),
                    supporters = table.Column<int>(type: "integer", nullable: false),
                    possessionball = table.Column<int>(type: "integer", nullable: false),
                    occupationown = table.Column<int>(type: "integer", nullable: false),
                    occupationtheir = table.Column<int>(type: "integer", nullable: false),
                    mvp = table.Column<int>(type: "integer", nullable: false),
                    inflictedpasses = table.Column<int>(type: "integer", nullable: false),
                    inflictedcatches = table.Column<int>(type: "integer", nullable: false),
                    inflictedinterceptions = table.Column<int>(type: "integer", nullable: false),
                    inflictedtouchdowns = table.Column<int>(type: "integer", nullable: false),
                    inflictedcasualties = table.Column<int>(type: "integer", nullable: false),
                    inflictedtackles = table.Column<int>(type: "integer", nullable: false),
                    inflictedko = table.Column<int>(type: "integer", nullable: false),
                    inflictedinjuries = table.Column<int>(type: "integer", nullable: false),
                    inflicteddead = table.Column<int>(type: "integer", nullable: false),
                    inflictedmetersrunning = table.Column<int>(type: "integer", nullable: false),
                    inflictedmeterspassing = table.Column<int>(type: "integer", nullable: false),
                    inflictedpushouts = table.Column<int>(type: "integer", nullable: false),
                    sustainedexpulsions = table.Column<int>(type: "integer", nullable: false),
                    sustainedcasualties = table.Column<int>(type: "integer", nullable: false),
                    sustainedko = table.Column<int>(type: "integer", nullable: false),
                    sustainedinjuries = table.Column<int>(type: "integer", nullable: false),
                    sustaineddead = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_matchteams", x => new { x.matchid, x.teamid });
                    table.ForeignKey(
                        name: "fk_matchteams_matches_matchid_teamid",
                        columns: x => new { x.matchid, x.teamid },
                        principalSchema: "public",
                        principalTable: "matches",
                        principalColumns: new[] { "id", "awayteamid" });
                    table.ForeignKey(
                        name: "fk_matchteams_matches_matchid_teamid1",
                        columns: x => new { x.matchid, x.teamid },
                        principalSchema: "public",
                        principalTable: "matches",
                        principalColumns: new[] { "id", "hometeamid" });
                });

            migrationBuilder.CreateTable(
                name: "matchplayer",
                schema: "public",
                columns: table => new
                {
                    matchid = table.Column<string>(type: "text", nullable: false),
                    teamid = table.Column<int>(type: "integer", nullable: false),
                    playerid = table.Column<int>(type: "integer", nullable: false),
                    competitionid = table.Column<int>(type: "integer", nullable: false),
                    number = table.Column<int>(type: "integer", nullable: false),
                    type = table.Column<int>(type: "integer", nullable: false),
                    name = table.Column<int>(type: "integer", nullable: false),
                    level = table.Column<int>(type: "integer", nullable: false),
                    experience = table.Column<int>(type: "integer", nullable: false),
                    experiencegain = table.Column<int>(type: "integer", nullable: false),
                    matchplayed = table.Column<int>(type: "integer", nullable: false),
                    mvp = table.Column<int>(type: "integer", nullable: false),
                    movement = table.Column<int>(type: "integer", nullable: false),
                    agility = table.Column<int>(type: "integer", nullable: false),
                    armourvalue = table.Column<int>(type: "integer", nullable: false),
                    strength = table.Column<int>(type: "integer", nullable: false),
                    inflictedcasualties = table.Column<int>(type: "integer", nullable: false),
                    inflictedstuns = table.Column<int>(type: "integer", nullable: false),
                    inflictedpasses = table.Column<int>(type: "integer", nullable: false),
                    inflictedmeterspassing = table.Column<int>(type: "integer", nullable: false),
                    inflictedtackles = table.Column<int>(type: "integer", nullable: false),
                    inflictedko = table.Column<int>(type: "integer", nullable: false),
                    inflicteddead = table.Column<int>(type: "integer", nullable: false),
                    inflictedinterceptions = table.Column<int>(type: "integer", nullable: false),
                    inflictedpushouts = table.Column<int>(type: "integer", nullable: false),
                    inflictedcatches = table.Column<int>(type: "integer", nullable: false),
                    inflictedinjuries = table.Column<int>(type: "integer", nullable: false),
                    inflictedmetersrunning = table.Column<int>(type: "integer", nullable: false),
                    inflictedtouchdowns = table.Column<int>(type: "integer", nullable: false),
                    sustainedinterceptions = table.Column<int>(type: "integer", nullable: false),
                    sustainedtackles = table.Column<int>(type: "integer", nullable: false),
                    sustainedinjuries = table.Column<int>(type: "integer", nullable: false),
                    sustaineddead = table.Column<int>(type: "integer", nullable: false),
                    sustainedko = table.Column<int>(type: "integer", nullable: false),
                    sustainedcasualties = table.Column<int>(type: "integer", nullable: false),
                    sustainedstuns = table.Column<int>(type: "integer", nullable: false),
                    skills = table.Column<string>(type: "text", nullable: true),
                    casualtiesstate = table.Column<string>(type: "text", nullable: true),
                    casualtiessustained = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_matchplayer", x => new { x.matchid, x.teamid, x.playerid });
                    table.ForeignKey(
                        name: "fk_matchplayer_matchteams_teammatchid_teamid1",
                        columns: x => new { x.matchid, x.teamid },
                        principalSchema: "public",
                        principalTable: "matchteams",
                        principalColumns: new[] { "matchid", "teamid" });
                });

            migrationBuilder.CreateIndex(
                name: "ix_aspnetroleclaims_roleid",
                schema: "public",
                table: "AspNetRoleClaims",
                column: "roleid");

            migrationBuilder.CreateIndex(
                name: "RoleNameIndex",
                schema: "public",
                table: "AspNetRoles",
                column: "normalizedname",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_aspnetuserclaims_userid",
                schema: "public",
                table: "AspNetUserClaims",
                column: "userid");

            migrationBuilder.CreateIndex(
                name: "ix_aspnetuserlogins_userid",
                schema: "public",
                table: "AspNetUserLogins",
                column: "userid");

            migrationBuilder.CreateIndex(
                name: "ix_aspnetuserroles_roleid",
                schema: "public",
                table: "AspNetUserRoles",
                column: "roleid");

            migrationBuilder.CreateIndex(
                name: "EmailIndex",
                schema: "public",
                table: "AspNetUsers",
                column: "normalizedemail");

            migrationBuilder.CreateIndex(
                name: "ix_aspnetusers_coachid",
                schema: "public",
                table: "AspNetUsers",
                column: "coachid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UserNameIndex",
                schema: "public",
                table: "AspNetUsers",
                column: "normalizedusername",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_competitions_leagueid",
                schema: "public",
                table: "competitions",
                column: "leagueid");

            migrationBuilder.CreateIndex(
                name: "ix_contests_awaycoachid",
                schema: "public",
                table: "contests",
                column: "awaycoachid");

            migrationBuilder.CreateIndex(
                name: "ix_contests_awayteamid",
                schema: "public",
                table: "contests",
                column: "awayteamid");

            migrationBuilder.CreateIndex(
                name: "ix_contests_competitionid",
                schema: "public",
                table: "contests",
                column: "competitionid");

            migrationBuilder.CreateIndex(
                name: "ix_contests_homecoachid",
                schema: "public",
                table: "contests",
                column: "homecoachid");

            migrationBuilder.CreateIndex(
                name: "ix_contests_hometeamid",
                schema: "public",
                table: "contests",
                column: "hometeamid");

            migrationBuilder.CreateIndex(
                name: "ix_contests_matchuuid",
                schema: "public",
                table: "contests",
                column: "matchuuid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_devicecodes_devicecode",
                schema: "public",
                table: "DeviceCodes",
                column: "devicecode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_devicecodes_expiration",
                schema: "public",
                table: "DeviceCodes",
                column: "expiration");

            migrationBuilder.CreateIndex(
                name: "ix_matches_awaycoachid",
                schema: "public",
                table: "matches",
                column: "awaycoachid");

            migrationBuilder.CreateIndex(
                name: "ix_matches_awayteamid",
                schema: "public",
                table: "matches",
                column: "awayteamid");

            migrationBuilder.CreateIndex(
                name: "ix_matches_competitionid",
                schema: "public",
                table: "matches",
                column: "competitionid");

            migrationBuilder.CreateIndex(
                name: "ix_matches_homecoachid",
                schema: "public",
                table: "matches",
                column: "homecoachid");

            migrationBuilder.CreateIndex(
                name: "ix_matches_hometeamid",
                schema: "public",
                table: "matches",
                column: "hometeamid");

            migrationBuilder.CreateIndex(
                name: "ix_persistedgrants_expiration",
                schema: "public",
                table: "PersistedGrants",
                column: "expiration");

            migrationBuilder.CreateIndex(
                name: "ix_persistedgrants_subjectid_clientid_type",
                schema: "public",
                table: "PersistedGrants",
                columns: new[] { "subjectid", "clientid", "type" });

            migrationBuilder.CreateIndex(
                name: "ix_persistedgrants_subjectid_sessionid_type",
                schema: "public",
                table: "PersistedGrants",
                columns: new[] { "subjectid", "sessionid", "type" });

            migrationBuilder.CreateIndex(
                name: "ix_player_teamid",
                schema: "public",
                table: "player",
                column: "teamid");

            migrationBuilder.CreateIndex(
                name: "ix_teams_coachid",
                schema: "public",
                table: "teams",
                column: "coachid");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AspNetRoleClaims",
                schema: "public");

            migrationBuilder.DropTable(
                name: "AspNetUserClaims",
                schema: "public");

            migrationBuilder.DropTable(
                name: "AspNetUserLogins",
                schema: "public");

            migrationBuilder.DropTable(
                name: "AspNetUserRoles",
                schema: "public");

            migrationBuilder.DropTable(
                name: "AspNetUserTokens",
                schema: "public");

            migrationBuilder.DropTable(
                name: "contests",
                schema: "public");

            migrationBuilder.DropTable(
                name: "DeviceCodes",
                schema: "public");

            migrationBuilder.DropTable(
                name: "matchplayer",
                schema: "public");

            migrationBuilder.DropTable(
                name: "PersistedGrants",
                schema: "public");

            migrationBuilder.DropTable(
                name: "player",
                schema: "public");

            migrationBuilder.DropTable(
                name: "AspNetRoles",
                schema: "public");

            migrationBuilder.DropTable(
                name: "AspNetUsers",
                schema: "public");

            migrationBuilder.DropTable(
                name: "matchteams",
                schema: "public");

            migrationBuilder.DropTable(
                name: "matches",
                schema: "public");

            migrationBuilder.DropTable(
                name: "competitions",
                schema: "public");

            migrationBuilder.DropTable(
                name: "teams",
                schema: "public");

            migrationBuilder.DropTable(
                name: "leagues",
                schema: "public");

            migrationBuilder.DropTable(
                name: "coaches",
                schema: "public");
        }
    }
}
