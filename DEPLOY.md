# MEMBRANE DEPLOYMENT

## PREREQ
On a blank ubuntu machine, install docker, then run `docker run --name local-mongo -p 27017:27017 -d mongo`.

## DEPLOY ON TEST SERVER
* On your linux dev box, in the root of the membrane repository, run `./push.sh`.
* login to the test server via ssh
* run:
```
docker rm -f membrane
docker pull mikedewar/membrane
docker run -d -e MONGOIP=10.0.0.91 -e MONGOPORT=27017 -p 8888:8080 --name membrane mikedewar/membrane
```
***YOU MUST CHANGE MONGOIP TO YOUR LOCAL IP!!*** it should be in your prompt. It will look like 10.0.0.## except the pound signs will be numbers like regular integer numbers.

Now membrane is running. Confirm by waiting 10s then running `docker ps` - you should see two containers running. Visit membrane by visiting the public IP of your machine on port 8888.

## WIPING MONGO
From the server, run `mongo --port 27017` to attach to the mongo database. Then:
```
db.users.drop()
db.authors.drop()
db.responses.drop()
db.prompts.drop()
```
