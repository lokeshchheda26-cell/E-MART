FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy only the csproj files first so `dotnet restore` is cached as its own
# layer and doesn't re-run just because a .cs file changed.
COPY src/Emart.Domain/Emart.Domain.csproj src/Emart.Domain/
COPY src/Emart.Application/Emart.Application.csproj src/Emart.Application/
COPY src/Emart.Infrastructure/Emart.Infrastructure.csproj src/Emart.Infrastructure/
COPY src/Emart.Api/Emart.Api.csproj src/Emart.Api/
RUN dotnet restore src/Emart.Api/Emart.Api.csproj

# Now bring in the rest of the source and publish only the API project -
# its ProjectReferences pull in Application/Infrastructure/Domain automatically.
# The test project is intentionally never copied/restored here.
COPY src/ src/
RUN dotnet publish src/Emart.Api/Emart.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "Emart.Api.dll"]
