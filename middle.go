package main

import (
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gorilla/context"
	"gopkg.in/mgo.v2/bson"
)

func GetResponse(inner http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		slug := r.URL.Path[strings.LastIndex(r.URL.Path, "/")+1:]
		var response Response
		c := controller.session.DB("test").C("responses")
		query := c.Find(bson.M{"slug": slug})
		err := query.One(&response)
		if err != nil {
			log.Println("looking for slug:", slug)
			log.Println("in getReponse middleware", err)
			notFound(w, r)
			return
		}
		context.Set(r, "response", response)
		inner.ServeHTTP(w, r)
	})
}

func GetSlug(inner http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		slug := r.URL.Path[strings.LastIndex(r.URL.Path, "/")+1:]
		context.Set(r, "slug", slug)
		inner.ServeHTTP(w, r)
	})
}

func GetCookie(inner http.Handler, cookieName string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var value string
		cookie, err := r.Cookie(cookieName)
		if err != nil {
			log.Println("WARNING: could not find cookie", cookieName)
			goto setAndReturn
		}
		err = cookieHandler.Decode(cookieName, cookie.Value, &value)
		if err != nil {
			log.Println("WARNING:found cookie but could not decode")
		}
	setAndReturn:
		context.Set(r, cookieName, value)
		inner.ServeHTTP(w, r)
	})
}

func GetAuthorFromCookie(inner http.Handler) http.Handler {
	return GetCookie(inner, "membraneAuthor")
}

func GetReaderFromCookie(inner http.Handler) http.Handler {
	return GetCookie(inner, "membraneReader")
}

func Logger(inner http.Handler, name string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		inner.ServeHTTP(w, r)

		log.Printf(
			"%s\t%s\t%s\t%s",
			r.Method,
			r.RequestURI,
			name,
			time.Since(start),
		)
	})
}
