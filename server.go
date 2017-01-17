package main

import (
	"net/http"

	"github.com/gorilla/mux"
)

func NewRouter() *mux.Router {
	router := mux.NewRouter().StrictSlash(true)
	for _, route := range routes {
		var handler http.Handler

		handler = route.HandlerFunc

		for _, m := range route.Middle {
			handler = m(handler)
		}

		handler = Logger(handler, route.Name)

		router.
			Methods(route.Method).
			Path(route.Pattern).
			Name(route.Name).
			Handler(handler)
	}

	router.PathPrefix("/css/").Handler(http.FileServer(http.Dir("./public/")))
	router.PathPrefix("/js/").Handler(http.FileServer(http.Dir("./public/")))
	router.PathPrefix("/img/").Handler(http.FileServer(http.Dir("./public/")))

	router.NotFoundHandler = http.HandlerFunc(notFound)

	return router
}

var routes = Routes{
	Route{
		"HomeView",
		"GET",
		"/",
		HomeView,
		[]Middleware{},
	},

	Route{
		"LoginView",
		"GET",
		"/login",
		LoginView,
		[]Middleware{GetAuthorFromCookie},
	},

	Route{
		"LoggedOutView",
		"GET",
		"/loggedOut",
		LoggedOutView,
		[]Middleware{},
	},

	Route{
		"InitialView",
		"GET",
		"/initial",
		InitialView,
		[]Middleware{GetAuthorFromCookie},
	},

	Route{
		"Register",
		"POST",
		"/register",
		Register,
		[]Middleware{},
	},

	Route{
		"LoginHandler",
		"POST",
		"/login",
		LoginHandler,
		[]Middleware{},
	},

	Route{
		"LogoutHandler",
		"POST",
		"/logout",
		LogoutHandler,
		[]Middleware{},
	},

	Route{
		"NotificationIndex",
		"GET",
		"/notifications",
		NotificationIndex,
		[]Middleware{},
	},

	Route{
		"NotificationsUser",
		"POST",
		"/notifications/user",
		NotificationsUser,
		[]Middleware{GetReaderFromCookie},
	},

	Route{
		"NotificationsUserRead",
		"POST",
		"/notifications/user/read",
		NotificationsUserRead,
		[]Middleware{GetReaderFromCookie},
	},

	Route{
		"NotificationCreate",
		"POST",
		"/notifications",
		NotificationCreate,
		[]Middleware{GetAuthorFromCookie},
	},

	Route{
		"AuthorWritings",
		"POST",
		"/authors",
		AuthorWritings,
		[]Middleware{GetAuthorFromCookie},
	},

	Route{
		"UserCreate",
		"POST",
		"/users",
		UserCreate,
		[]Middleware{},
	},

	Route{
		"UserIndex",
		"GET",
		"/users",
		UserIndex,
		[]Middleware{},
	},

	Route{
		"UserCheck",
		"GET",
		"/users/check",
		UserCheck,
		[]Middleware{GetReaderFromCookie},
	},

	Route{
		"UserView",
		"GET",
		"/users/{userId}",
		UserView,
		[]Middleware{},
	},

	Route{
		"UserPrompts",
		"GET",
		"/users/{userId}/prompts",
		UserPrompts,
		[]Middleware{},
	},

	Route{
		"AdminView",
		"GET",
		"/admin/{slug}",
		AdminView,
		[]Middleware{GetResponse, GetAuthorFromCookie},
	},

	Route{
		"AdminOverview",
		"GET",
		"/admin",
		AdminOverview,
		[]Middleware{GetAuthorFromCookie},
	},

	Route{
		"ResponseShow",
		"GET",
		"/responses/{responseId}",
		ResponseShow,
		[]Middleware{},
	},

	Route{
		"ResponseIndex",
		"GET",
		"/responses",
		ResponseIndex,
		[]Middleware{},
	},

	Route{
		"ResponseUpdate",
		"PUT",
		"/slug/{slug}",
		ResponseUpdate,
		[]Middleware{},
	},

	Route{
		"ResponseDelete",
		"DELETE",
		"/responses/{slug}",
		ResponseDelete,
		[]Middleware{GetSlug},
	},

	Route{
		"PromptDelete",
		"DELETE",
		"/prompts/{promptId}",
		PromptDelete,
		[]Middleware{},
	},

	Route{
		"PromptUpdate",
		"POST",
		"/prompts/{promptId}",
		PromptUpdate,
		[]Middleware{},
	},

	Route{
		"ResponseSlug",
		"GET",
		"/slug/{slug}",
		ResponseSlug,
		[]Middleware{},
	},

	Route{
		"PromptIndex",
		"GET",
		"/prompts",
		PromptIndex,
		[]Middleware{},
	},

	Route{
		"PromptShow",
		"GET",
		"/prompts/{promptId}",
		PromptShow,
		[]Middleware{},
	},

	Route{
		"ResponseChildrenOnlyAnswered",
		"GET",
		"/responses/{responseId}/prompts/answered",
		ResponseChildrenOnlyAnswered,
		[]Middleware{},
	},

	Route{
		"ResponseChildrenAnchors",
		"GET",
		"/responses/{responseId}/prompts/anchors",
		ResponseChildrenAnchors,
		[]Middleware{},
	},

	Route{
		"ResponseChildren",
		"GET",
		"/responses/{responseId}/prompts",
		ResponseChildren,
		[]Middleware{},
	},

	Route{
		"PromptChildren",
		"GET",
		"/prompts/{promptId}/responses",
		PromptChildren,
		[]Middleware{},
	},

	Route{
		"ResponseCreate",
		"POST",
		"/responses",
		ResponseCreate,
		[]Middleware{GetAuthorFromCookie},
	},

	Route{
		"PromptCreate",
		"POST",
		"/prompts",
		PromptCreate,
		[]Middleware{GetReaderFromCookie},
	},

	Route{
		"ResponseAncestor",
		"GET",
		"/responses/{responseId}/ancestor",
		ResponseAncestor,
		[]Middleware{},
	},

	Route{
		"PromptSetIndex",
		"GET",
		"/promptsets",
		PromptSetIndex,
		[]Middleware{},
	},

	Route{
		"PromptSetView",
		"GET",
		"/promptsets/{author}",
		PromptSetView,
		[]Middleware{},
	},

	Route{
		"PromptSetCreate",
		"POST",
		"/promptsets",
		PromptSetCreate,
		[]Middleware{},
	},

	// PUT THIS LAST OMG
	Route{
		"Index",
		"GET",
		"/{slug}",
		IndexView,
		[]Middleware{GetResponse},
	},
}
