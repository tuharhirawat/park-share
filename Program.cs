using Microsoft.EntityFrameworkCore;
using ParkMitra_BE.Data;
using ParkMitra_BE.Infrastructure.Clients;
using ParkMitra_BE.Options;
using ParkMitra_BE.Services;
using ParkMitra_BE.Services.Auth;
using System.Text.Json.Serialization;

namespace ParkMitra_BE;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        builder.Configuration.AddJsonFile("appsettings.local.json", optional: true, reloadOnChange: true);

        builder.Services.AddControllers()
            .AddJsonOptions(options =>
            {
                options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
            });

        builder.Services.AddDbContext<ApplicationDbContext>(options =>
            options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen();

        // Business Services
        builder.Services.AddScoped<AuthService>();
        builder.Services.AddScoped<ThirdPartyAuthService>();
        builder.Services.AddScoped<CookieService>();
        builder.Services.AddScoped<CurrentUserService>();
        builder.Services.AddScoped<UserInitializationService>();
        builder.Services.AddScoped<ProfileService>();
        builder.Services.AddScoped<HostService>();
        builder.Services.AddScoped<ParkingSpaceService>();
        builder.Services.AddScoped<BookingService>();
        builder.Services.AddScoped<VehicleService>();
        builder.Services.AddScoped<HostService>();
        builder.Services.AddScoped<ImageUploadService>();
        builder.Services.AddScoped<ReviewService>();
        builder.Services.AddScoped<PaymentService>();
        builder.Services.AddScoped<PricingService>();
        builder.Services.AddScoped<LocationService>();

        builder.Services.AddMemoryCache();
        builder.Services.AddSingleton<ICodeVerifierStore, MemoryCodeVerifierStore>();

        // Infrastructure Clients
        builder.Services.AddScoped<IAuthProviderClient, SupabaseAuthClient>();
        builder.Services.AddScoped<IStorageClient, SupabaseStorageClient>();
        builder.Services.AddScoped<IPaymentGatewayClient, RazorpayClient>();

        // Options
        builder.Services.Configure<PricingOptions>(builder.Configuration.GetSection("Pricing"));

        // Http Clients
        builder.Services.AddHttpClient();

        var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
            ?? GetLegacyOrigin(builder.Configuration["FrontendUrl"]);

        if (allowedOrigins.Length == 0)
        {
            throw new InvalidOperationException(
                "At least one frontend origin must be configured in Cors:AllowedOrigins or FrontendUrl.");
        }

        builder.Services.AddCors(options =>
        {
            options.AddPolicy("AllowFrontend",
                policy =>
                {
                    policy
                        .WithOrigins(allowedOrigins)
                        .AllowAnyHeader()
                        .AllowAnyMethod()
                        .AllowCredentials();
                });
        });

        var app = builder.Build();

        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }

        app.UseHttpsRedirection();

        app.UseCors("AllowFrontend");

        app.UseAuthentication();
        app.UseAuthorization();

        app.MapControllers();

        app.Run();
    }

    private static string[] GetLegacyOrigin(string? frontendUrl)
    {
        return string.IsNullOrWhiteSpace(frontendUrl)
            ? []
            : [frontendUrl];
    }
}
