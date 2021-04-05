using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

namespace rebbl.Server.Data.Migrations
{
    public partial class CreateIdentitySchema : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "public");
            migrationBuilder.CreateTable(
                name: "aspnetroles",
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
                name: "aspnetusers",
				schema: "public",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
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
                    lockoutend = table.Column<DateTimeOffset>(type: "timestamp", nullable: true),
                    lockoutenabled = table.Column<bool>(type: "boolean", nullable: false),
                    accessfailedcount = table.Column<int>(type: "integer", nullable: false)

                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_aspnetusers", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "devicecodes",
                schema: "public",
                columns: table => new
                {
                    usercode = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    devicecode = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    subjectid = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    sessionid = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    clientid = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    description = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    creationtime = table.Column<DateTime>(type: "timestamp", nullable: false),
                    expiration = table.Column<DateTime>(type: "timestamp", nullable: false),
                    data = table.Column<string>(type: "character varying(50000)", maxLength: 50000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_devicecodes", x => x.usercode);
                });

            migrationBuilder.CreateTable(
                name: "persistedgrants",
                schema: "public",
                columns: table => new
                {
                    key = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    subjectid = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    sessionid = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    clientid = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    description = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    creationtime = table.Column<DateTime>(type: "timestamp", nullable: false),
                    expiration = table.Column<DateTime>(type: "timestamp", nullable: true),
                    consumedtime = table.Column<DateTime>(type: "timestamp", nullable: true),
                    data = table.Column<string>(type: "character varying(50000)", maxLength: 50000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_persistedgrants", x => x.key);
                });

            migrationBuilder.CreateTable(
                name: "aspnetroleclaims",
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
                        name: "FK_aspnetroleclaims_aspnetroles_roleid",
                        column: x => x.roleid,
                        principalSchema: "public",
                        principalTable: "aspnetroles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "aspnetuserclaims",
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
                    table.PrimaryKey("PK_aspnetuserclaims", x => x.id);
                    table.ForeignKey(
                        name: "FK_aspnetuserclaims_aspnetusers_userid",
                        column: x => x.userid,
                        principalSchema: "public",
                        principalTable: "aspnetusers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "aspnetuserlogins",
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
                    table.PrimaryKey("PK_aspnetuserlogins", x => new { x.loginprovider, x.providerkey});
                    table.ForeignKey(
                        name: "FK_aspnetuserlogins_aspnetusers_userid",
                        column: x => x.userid,
                        principalSchema: "public",
                        principalTable: "aspnetusers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "aspnetuserroles",
                schema: "public",
                columns: table => new
                {
                    userid = table.Column<string>(type: "text", nullable: false),
                    roleid = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_aspnetuserroles", x => new { x.userid, x.roleid });
                    table.ForeignKey(
                        name: "FK_aspnetuserroles_aspnetroles_roleid",
                        column: x => x.roleid,
                        principalTable: "aspnetroles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_aspnetuserroles_aspnetusers_userid",
                        column: x => x.userid,
                        principalSchema: "public",
                        principalTable: "aspnetusers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "aspnetusertokens",
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
                    table.PrimaryKey("PK_aspnetusertokens", x => new { x.userid, x.loginprovider, x.name });
                    table.ForeignKey(
                        name: "FK_aspnetusertokens_aspnetusers_userid",
                        column: x => x.userid,
                        principalSchema: "public",
                        principalTable: "aspnetusers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            

            migrationBuilder.CreateIndex(
                name: "IX_aspnetroleclaims_roleid",
                table: "aspnetroleclaims",
                column: "roleid");

            migrationBuilder.CreateIndex(
                name: "rolenameindex",
                schema: "public",
                table: "aspnetroles",
                column: "normalizedname",
                unique: true,
                filter: "normalizedname IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_aspnetuserclaims_userid",
                schema: "public",
                table: "aspnetuserclaims",
                column: "userid");

            migrationBuilder.CreateIndex(
                name: "IX_aspnetuserlogins_userid",
                schema: "public",
                table: "aspnetuserlogins",
                column: "userid");

            migrationBuilder.CreateIndex(
                name: "IX_aspnetuserroles_roleid",
                schema: "public",
                table: "aspnetuserroles",
                column: "roleid");

            migrationBuilder.CreateIndex(
                name: "emailindex",
                table: "aspnetusers",
                schema: "public",
                column: "normalizedemail");

            migrationBuilder.CreateIndex(
                name: "usernameindex",
                schema: "public",
                table: "aspnetusers",
                column: "normalizedusername",
                unique: true,
                filter: "normalizedusername IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_devicecodes_devicecode",
                table: "devicecodes",
                schema: "public",
                column: "devicecode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_devicecodes_expiration",
                table: "devicecodes",
                schema: "public",
                column: "expiration");

            migrationBuilder.CreateIndex(
                name: "IX_persistedgrants_expiration",
                schema: "public",
                table: "persistedgrants",
                column: "expiration");

            migrationBuilder.CreateIndex(
                name: "IX_persistedgrants_subjectid_clientid_type",
                schema: "public",
                table: "persistedgrants",
                columns: new[] { "subjectid", "clientid", "type" });

            migrationBuilder.CreateIndex(
                name: "IX_persistedgrants_subjectid_sessionid_type",
                schema: "public",
                table: "persistedgrants",
                columns: new[] { "subjectid", "sessionid", "type" });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "aspnetroleclaims");

            migrationBuilder.DropTable(
                name: "aspnetuserclaims");

            migrationBuilder.DropTable(
                name: "aspnetuserlogins");

            migrationBuilder.DropTable(
                name: "aspnetuserroles");

            migrationBuilder.DropTable(
                name: "aspnetusertokens");

            migrationBuilder.DropTable(
                name: "devicecodes");

            migrationBuilder.DropTable(
                name: "persistedgrants");

            migrationBuilder.DropTable(
                name: "aspnetroles");

            migrationBuilder.DropTable(
                name: "aspnetusers");
        }
    }
}
