using Microsoft.EntityFrameworkCore;
using ParkMitra_BE.Data;
using ParkMitra_BE.Services;

namespace ParkMitra_BE;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        builder.Configuration.AddJsonFile("appsettings.local.json", optional: true, reloadOnChange: true);

        builder.Services.AddControllers();

        builder.Services.AddDbContext<ApplicationDbContext>(options =>
            options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen();

        builder.Services.AddScoped<AuthService>();
        builder.Services.AddScoped<GoogleAuthService>();
        builder.Services.AddScoped<CookieService>();
        builder.Services.AddScoped<CurrentUserService>();
        builder.Services.AddScoped<UserInitializationService>();
        builder.Services.AddScoped<ProfileService>();
        builder.Services.AddScoped<HostService>();
        builder.Services.AddScoped<ParkingSpaceService>();
        builder.Services.AddScoped<BookingService>();

        builder.Services.AddHttpClient();

        builder.Services.AddCors(options =>
        {
            options.AddPolicy("AllowFrontend",
                policy =>
                {
                    policy
                        .WithOrigins("http://localhost:8080", "http://localhost:8081")
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
}