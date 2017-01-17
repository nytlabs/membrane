go get .
go build
docker build -t membrane .
docker tag -f membrane mikedewar/membrane
docker push mikedewar/membrane
