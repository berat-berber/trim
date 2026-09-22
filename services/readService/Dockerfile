FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY src/src.csproj .
RUN dotnet restore src.csproj
COPY src/ .
RUN dotnet publish src.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
ENV ASPNETCORE_HTTP_PORTS=8080
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "src.dll"]