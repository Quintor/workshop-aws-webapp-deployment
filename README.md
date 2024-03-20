# Workshop AWS web application deployment

## S3 Static Webhosting

In de eerste stap van deze workshop gaan we de Angular webapplicatie in de `webapp` folder hosten via S3.

![Webhosting stap 1](images/deployment-diagrams-Hands-on%20Webhosting%201.drawio.png)

Maak S3 Bucket aan met de naam `cddb-web-app-<12-cijferige IAM identiefier nummer>` (S3 Bucket namen dienen globaal een unieke naam te hebben).
Zet Static Website Hosting aan en stel `index.html` in als Index document
Sta Public Access tot de bucket toe en voeg een Bucket Policy toe die toegang tot alle objecten toestaat. Zie [Setting permissions for website access](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteAccessPermissionsReqd.html) voor de details hiervoor.

Upload de inhoud van de `webapp` folder naar de S3 bucket.

In de S3 Bucket configuratie onder **Properties > Static website hosting** vind je de URL naar de gehoste Bucket content.
Controleer dat in de webapplicatie laad, maar merk op dat het geen data laat zien of dat je geen gegevens kan toevoegen.
Als je met de developer tools van je browser kijkt zul je zien dat de REST API calls falen.
Hier gaan we zo dadelijk mee aan de slag.

Het is heel eenvoudig om content via S3 te hosten op deze wijze. 
Merk echter op dat de URL HTTP gebruikt en geen HTTPS.
S3 Website Hosting ondersteund geen SSL/TLS en dus geen HTTPS.
Dit betekent dat de gebruiker/browser van je website niet de identiteit van de server kan verifiëren en daardoor vaak onvoldoende veilig.
Dit gaan we nu oplossen door CloudFront te gaan gebruiken.

## Webhosting via CloudFront

In de tweede stap van deze workshop gaan we de Angular webapplicatie via CloudFormation ontsluiten.

![Webhosting stap 2](images/deployment-diagrams-Hands-on%20Webhosting%202.drawio.png)

Maak een CloudFront Distribution aan voor het serveren van de S3 bucket inhoud op alle edge locations.
Voeg een Origin toe voor de S3 bucket en gebruik **Use website endpoint**.
Enable Web Application Firewall om je te beschermen tegen veel voorkomende aanvallen op je webapplicatie.
Onder **General > Details** vind je de distribution domain name en controleer dat de web applicatie beschikbaar is.

## REST API hosting met ECS/Fargate

In de derde stap van deze workshop gaan we de REST API van de backend hosten als container in ECS/Fargate.
De backend maakt gebruik van een in-memory database zodat we de deployment eenvoudig kunnen houden.

![Webhosting stap 3](images/deployment-diagrams-Hands-on%20Webhosting%203.drawio.png)

### Load balancing opzetten (voorwerk)
- Maak een nieuwe multi-AZ, internet-facing `Application Load Balancer` aan en noem deze `alb-cddb`.
      Zorg ervoor dat je alle subnetten selecteert.  
      Maak hierbij een nieuwe Security Group aan met een logische naam (zoals `alb-cddb-sg`), voeg een inbound rule toe voor `HTTP` en `Anywhere-IPv4` en ken deze toe als enige SG van de ALB.  
      Onder `Listeners and routing` zet je de listener op poort 80.  
      Maak een Target Group (`cddb-tg`) met target type IP addresses aan. Vul `/health` bij health check path in. 
- Ken deze bij de ALB als de default Listener Rule toe en maak de ALB aan.
      Als de ALB is aangemaakt kun je de `DNS name` vinden onder Details.  
      Voer deze `DNS name` in in een browser en als het goed is krijg je de melding `503 Service Temporarily Unavailable`.  
      De Load Balancer is benaderbaar, maar de Target nog niet; dit volgt nog.

### ECS Fargate Cluster aanmaken

Maak een nieuw `ECS Fargate Cluster` aan ([Amazon ECS](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/clusters.html) -> Clusters -> Create Cluster -> `AWS Fargate (serverless)`)
- Noem het cluster `CddbCluster`
- Klik op `Create` en wacht totdat het cluster is aangemaakt.
- Note: het kan voorkomen dat er de eerste keer er een fout optreed.
      Sluit dan de wizard en voer de stappen nogmaals uit.
      Het kan zijn dat de stack in CloudFormation eerst verwijderd moet worden.

### Task Definition voor de backend container

[Maak](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definitions.html) een `Task Definition` aan voor het draaien van onze applicatie op het ECS cluster. 
- Noem de task definition `CddbTaskDefinition`
- Kies voor `AWS Fargate`
- Voor `Task size` zet `vCPU` op `1` units en `Memory` op `3` GB
- Voor `Task role` selecteer `LabRole`
- Voor `Task execution role` selecteer `LabRole`
- Pas `Container - 1` aan en gebruik de volgende waarden;
     - Container name: `CddbContainer`
     - Image: `awassink/cddb-dotnet-backend`
     - Port mapping: Container Port 80
- Klik op `Create` en je `Task definition` met de naam (en tag versie) `CddbTaskDefinition:1` is aangemaakt.

### Runnen van de backend als service in het ECS cluster

Om het `Cluster` en de `Task Definitions` te koppelen gaan we nu een `Service` [aanmaken](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs_services.html)
- Ga naar je cluster toe en in de tab `Services` klik op `create`
- Launch type moet `FARGATE` zijn.
- Selecteer de juiste `Task Definition` en `Revision`
- Geef de service de naam `CddbService`
- `Desired tasks` op 1
- Voor `Deployment options` laat dit op `Rolling update` staan
- In de `Networking` stap controleer dat de default `VPC` en alle `Availability Zone's` geselecteerd zijn. 
- Maak een nieuwe security group aan voor de ECS service met een logische naam (zoals `ecs-cddb-sg`).
- Selecteer bij de inbound rule `HTTP` en `Anywhere-IPv4`.
- Selecteer bij `Load balancing` vervolgens de `Application Load Balancer` selecteer de container definitie die in de vorige stappen is aangemaakt, selecteer Use an existing load balancer en kies voor de hiervoor aangemaakt load balancer. 
- Gebruik vervolgens de volgende gegevens;
     - `Listener` - Use an existing listener en selecteer `80:HTTP`
     - `Target Group` - Use an existing target group `cddb-tg`
     - `Health check path` - /health
- Klik op `Create`. Na een korte tijd wachten zie je de service op `ACTIVE` staan en even later draaien er docker containers (bij `Tasks`).
      Als de task niet start kijk dan goed of de settings in je task definition goed staan en maak een nieuwe revision indien nodig (vergeet niet ook de task revisie in je service te updaten)
- Zorg ervoor dat de security group van de ALB toegang heeft tot de ECS service, want anders zul je hier niet mee kunnen praten. Dit betekent ook dat de security group van de ECS service verkeer van de load balancer op port 80 doorlaat.
- Pak nu de DNS name van je ALB en gebruik die in je browser met pad `/health` om de REST API via de load balancing te zien werken.

Troubleshooting:
Mocht de API endpoint niet werken controleer dan;
   - de health van de targets in de `Target Group` van de loadbalancer
   - de `Events` en de `Logs` van de `CddbService` in het ECS cluster.
     Meestal vind je hier indicaties voor mogelijke problemen.

> Task instances van een ECS service worden niet automatisch stopgezet door de AWS Academy, maar kosten wel continue geld.
> Mocht je stoppen met werken aan de opdracht(en) zet dan altijd het aantal task-instances van de service op 0 om kosten te besparen!

## REST API via CloudFormation

In de laatste stap van deze workshop gaan we de REST API van de backend ontsluiten via CloudFront zodat deze op dezelfde domeinnaam beschikbaar is als de webapplicatie.

![Webhosting stap 4](images/deployment-diagrams-Hands-on%20Webhosting%204.drawio.png)

Maak een nieuwe origin aan in de bestaande CloudFront distribution met als Origin domain de DNS naam van de `alb-cddb` LoadBalancer.
Zet als Origin path `/cddb/rest`.







