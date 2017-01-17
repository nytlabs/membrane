package main

import (
	"log"
	"net/http"
)

func main() {
	log.Println("~~~ WELCOME TO MEMBRANE ~~~~")

	router := NewRouter()
	controller.session = getSession()

	defer controller.session.Close()

	log.Fatal(http.ListenAndServe(":8080", router))

}
