using Microsoft.EntityFrameworkCore;
using src.Data;
using src.Services;
using Npgsql;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
builder.Services.AddProblemDetails();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration["db"] 
        ?? throw new InvalidOperationException("db connection string is not configured.")));
    
builder.Services.AddScoped<IUrlShortenerService, UrlShortenerService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseExceptionHandler();

app.UseStatusCodePages();

app.MapControllers();

app.Run();
