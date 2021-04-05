using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

namespace rebbl.Server.Migrations
{
    public partial class CreateIdentitySchema : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "public");

            migrationBuilder.CreateTable(
                name: "applicationuser",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    user_name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    normalized_user_name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    normalized_email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    email_confirmed = table.Column<bool>(type: "boolean", nullable: false),
                    password_hash = table.Column<string>(type: "text", nullable: true),
                    security_stamp = table.Column<string>(type: "text", nullable: true),
                    concurrency_stamp = table.Column<string>(type: "text", nullable: true),
                    phone_number = table.Column<string>(type: "text", nullable: true),
                    phone_number_confirmed = table.Column<bool>(type: "boolean", nullable: false),
                    two_factor_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    lockout_end = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    lockout_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    access_failed_count = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_applicationuser", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "deviceflowcodes",
                schema: "public",
                columns: table => new
                {
                    user_code = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    device_code = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    subject_id = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    session_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    client_id = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    description = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    creation_time = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    expiration = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    data = table.Column<string>(type: "character varying(50000)", maxLength: 50000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_deviceflowcodes", x => x.user_code);
                });

            migrationBuilder.CreateTable(
                name: "identityrole",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    normalized_name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    concurrency_stamp = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_identityrole", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "persistedgrant",
                schema: "public",
                columns: table => new
                {
                    key = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    subject_id = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    session_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    client_id = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    description = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    creation_time = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    expiration = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    consumed_time = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    data = table.Column<string>(type: "character varying(50000)", maxLength: 50000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_persistedgrant", x => x.key);
                });

            migrationBuilder.CreateTable(
                name: "identityuserclaim<string>",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    user_id = table.Column<string>(type: "text", nullable: false),
                    claim_type = table.Column<string>(type: "text", nullable: true),
                    claim_value = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_identityuserclaim_string", x => x.id);
                    table.ForeignKey(
                        name: "fk_identityuserclaim_string_asp_net_users_user_id",
                        column: x => x.user_id,
                        principalSchema: "public",
                        principalTable: "applicationuser",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "identityuserlogin<string>",
                schema: "public",
                columns: table => new
                {
                    login_provider = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    provider_key = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    provider_display_name = table.Column<string>(type: "text", nullable: true),
                    user_id = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_identityuserlogin_string", x => new { x.login_provider, x.provider_key });
                    table.ForeignKey(
                        name: "fk_identityuserlogin_string_asp_net_users_user_id",
                        column: x => x.user_id,
                        principalSchema: "public",
                        principalTable: "applicationuser",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "identityusertoken<string>",
                schema: "public",
                columns: table => new
                {
                    user_id = table.Column<string>(type: "text", nullable: false),
                    login_provider = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    name = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    value = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_identityusertoken_string", x => new { x.user_id, x.login_provider, x.name });
                    table.ForeignKey(
                        name: "fk_identityusertoken_string_asp_net_users_user_id",
                        column: x => x.user_id,
                        principalSchema: "public",
                        principalTable: "applicationuser",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "identityroleclaim<string>",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    role_id = table.Column<string>(type: "text", nullable: false),
                    claim_type = table.Column<string>(type: "text", nullable: true),
                    claim_value = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_identityroleclaim_string", x => x.id);
                    table.ForeignKey(
                        name: "fk_identityroleclaim_string_identityrole_role_id",
                        column: x => x.role_id,
                        principalSchema: "public",
                        principalTable: "identityrole",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "identityuserrole<string>",
                schema: "public",
                columns: table => new
                {
                    user_id = table.Column<string>(type: "text", nullable: false),
                    role_id = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_identityuserrole_string", x => new { x.user_id, x.role_id });
                    table.ForeignKey(
                        name: "fk_identityuserrole_string_asp_net_users_user_id",
                        column: x => x.user_id,
                        principalSchema: "public",
                        principalTable: "applicationuser",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_identityuserrole_string_identityrole_role_id",
                        column: x => x.role_id,
                        principalSchema: "public",
                        principalTable: "identityrole",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "EmailIndex",
                schema: "public",
                table: "applicationuser",
                column: "normalized_email");

            migrationBuilder.CreateIndex(
                name: "UserNameIndex",
                schema: "public",
                table: "applicationuser",
                column: "normalized_user_name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_deviceflowcodes_device_code",
                schema: "public",
                table: "deviceflowcodes",
                column: "device_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_deviceflowcodes_expiration",
                schema: "public",
                table: "deviceflowcodes",
                column: "expiration");

            migrationBuilder.CreateIndex(
                name: "RoleNameIndex",
                schema: "public",
                table: "identityrole",
                column: "normalized_name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_identityroleclaim_string_role_id",
                schema: "public",
                table: "identityroleclaim<string>",
                column: "role_id");

            migrationBuilder.CreateIndex(
                name: "ix_identityuserclaim_string_user_id",
                schema: "public",
                table: "identityuserclaim<string>",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_identityuserlogin_string_user_id",
                schema: "public",
                table: "identityuserlogin<string>",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_identityuserrole_string_role_id",
                schema: "public",
                table: "identityuserrole<string>",
                column: "role_id");

            migrationBuilder.CreateIndex(
                name: "ix_persistedgrant_expiration",
                schema: "public",
                table: "persistedgrant",
                column: "expiration");

            migrationBuilder.CreateIndex(
                name: "ix_persistedgrant_subject_id_client_id_type",
                schema: "public",
                table: "persistedgrant",
                columns: new[] { "subject_id", "client_id", "type" });

            migrationBuilder.CreateIndex(
                name: "ix_persistedgrant_subject_id_session_id_type",
                schema: "public",
                table: "persistedgrant",
                columns: new[] { "subject_id", "session_id", "type" });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "deviceflowcodes",
                schema: "public");

            migrationBuilder.DropTable(
                name: "identityroleclaim<string>",
                schema: "public");

            migrationBuilder.DropTable(
                name: "identityuserclaim<string>",
                schema: "public");

            migrationBuilder.DropTable(
                name: "identityuserlogin<string>",
                schema: "public");

            migrationBuilder.DropTable(
                name: "identityuserrole<string>",
                schema: "public");

            migrationBuilder.DropTable(
                name: "identityusertoken<string>",
                schema: "public");

            migrationBuilder.DropTable(
                name: "persistedgrant",
                schema: "public");

            migrationBuilder.DropTable(
                name: "identityrole",
                schema: "public");

            migrationBuilder.DropTable(
                name: "applicationuser",
                schema: "public");
        }
    }
}
