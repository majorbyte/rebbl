using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using rebbl.Server.Migrations.Seed;
using rebbl.Server.Options;
using rebbl.Server.Services;

namespace rebbl.Server.Extensions
{
    public static class ServiceCollectionExtension
    {
        public static IServiceCollection AddServices(this IServiceCollection services, IConfiguration configuration)
        {

            services.AddScoped<ContestService, ContestService>();

            services.AddAutoMapper(typeof(Startup));

            services.AddScoped<Seeding, Seeding>();

            return services;
        }
    }
}
