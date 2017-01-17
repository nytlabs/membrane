package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"

	"gopkg.in/mgo.v2"
	"gopkg.in/mgo.v2/bson"

	"github.com/gorilla/context"
	"github.com/gorilla/mux"

	"strconv"

	"github.com/gorilla/securecookie"
	"golang.org/x/crypto/bcrypt"

	// "time"
)

var controller Controller

var cookieHandler = securecookie.New(securecookie.GenerateRandomKey(1024), nil)

func notFound(w http.ResponseWriter, r *http.Request) {
	log.Println(r.Method, r.URL.String(), "not found")
	w.WriteHeader(http.StatusNotFound)
	body, err := ioutil.ReadFile("public/404.html")
	if err != nil {
		log.Fatal(err)
	}
	_, err = w.Write(body)
	if err != nil {
		log.Println(err)
		return
	}
}

func forbidden(w http.ResponseWriter, r *http.Request) {
	log.Println(r.Method, r.URL.String(), "forbidden")
	w.WriteHeader(http.StatusForbidden)
	body, err := ioutil.ReadFile("public/403.html")
	if err != nil {
		log.Fatal(err)
	}
	_, err = w.Write(body)
	if err != nil {
		log.Println(err)
		return
	}
}

func HomeView(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "public/home.html")
}

func IndexView(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "public/index.html")
}

func InitialView(w http.ResponseWriter, r *http.Request) {
	author, ok := context.Get(r, "membraneAuthor").(string)
	if !ok {
		log.Fatal("InitialView context has wrong type of membraneAuthor")
	}
	if author == "" {
		forbidden(w, r)
		return
	}
	http.ServeFile(w, r, "public/initial.html")
}

func LoginView(w http.ResponseWriter, r *http.Request) {
	author, ok := context.Get(r, "membraneAuthor").(string)
	if !ok {
		log.Fatal("LoginView context has wrong type of membraneAuthor")
	}
	if author != "" {
		http.Redirect(w, r, "/admin", 302)
		return
	}
	http.ServeFile(w, r, "public/login.html")
}

func LoggedOutView(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "public/loggedout.html")
}

func LoginHandler(w http.ResponseWriter, r *http.Request) {
	// decode shit
	decoder := json.NewDecoder(r.Body)

	type LoginInfo struct {
		Username string
		Password string
	}
	var l LoginInfo
	err := decoder.Decode(&l)
	if err != nil {
		panic(err)
	}

	// validate, etc.
	user, e := Login(l.Username, l.Password)

	if e != nil {
		panic(err)
	}

	value := user.Username

	err = SetCookieHandler(w, value, "membraneAuthor")
	if err == nil {
		w.WriteHeader(http.StatusOK)
	} else {
		log.Println("halp")
	}
}

func Login(username, password string) (a *Author, err error) {
	c := controller.session.DB("test")
	err = c.C("authors").Find(bson.M{"username": username}).One(&a)
	if err != nil {
		log.Println(err)
		return
	}

	err = bcrypt.CompareHashAndPassword(a.Password, []byte(password))
	if err != nil {
		log.Println(err)
		a = nil
	}
	log.Println(err)

	return
}

func LogoutHandler(w http.ResponseWriter, r *http.Request) {
	log.Println("Logout is clearing cookies")
	ClearCookieHandler(w, "membraneAuthor")
	log.Println("Logout is redirecting to /")
	http.Redirect(w, r, "/", 302)
}

//http://shadynasty.biz/blog/2012/09/05/auth-and-sessions/
func (a *Author) SetPassword(password string) {
	hpass, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		panic(err)
	}
	a.Password = hpass
}

func Register(w http.ResponseWriter, r *http.Request) {
	c := controller.session.DB("test")
	decoder := json.NewDecoder(r.Body)

	type LoginInfo struct {
		Username string
		Password string
	}
	var l LoginInfo
	err := decoder.Decode(&l)
	if err != nil {
		panic(err)
	}

	a := &Author{
		Username: l.Username,
	}

	a.SetPassword(l.Password)

	if err := c.C("authors").Insert(a); err != nil {
		log.Println("problem registering user")
	}

	return

}

func SetCookieHandler(w http.ResponseWriter, value string, cookieName string) (err error) {
	if encoded, err := cookieHandler.Encode(cookieName, value); err == nil {
		cookie := &http.Cookie{
			Name:  cookieName,
			Value: encoded,
			Path:  "/",
		}
		http.SetCookie(w, cookie)
		return nil
	}
	return err
}

func ClearCookieHandler(w http.ResponseWriter, cookieName string) {
	cookie := &http.Cookie{
		Name:   cookieName,
		Value:  "",
		Path:   "/",
		MaxAge: -1,
	}
	log.Println("set cookie to expire immediately")
	http.SetCookie(w, cookie)
}

func CreateUser(thing *User) (*User, error) {
	c := controller.session.DB("test").C("users")
	if err := c.Insert(thing); err != nil {
		return nil, err
	}
	return thing, nil
}

func CreateNotifications(thing []interface{}) ([]interface{}, error) {
	c := controller.session.DB("test").C("notifications")
	if err := c.Insert(thing...); err != nil {
		return nil, err
	}
	return thing, nil
}

func FindNotifications(query map[string]interface{}, thing *Notifications) (*Notifications, error) {
	c := controller.session.DB("test").C("notifications")
	if err := c.Find(query).All(thing); err != nil {
		return nil, err
	}
	return thing, nil
}

func NotificationIndex(w http.ResponseWriter, r *http.Request) {
	n := Notifications{}

	result, err := FindNotifications(bson.M{}, &n)

	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json;charset=UTF-8")
	if err := json.NewEncoder(w).Encode(result); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
}

func NotificationCreate(w http.ResponseWriter, r *http.Request) {

	author, ok := context.Get(r, "membraneAuthor").(string)
	if !ok {
		log.Fatal("NotificationCreate context has wrong type of membraneAuthor")
	}

	n := Notifications{}

	json.NewDecoder(r.Body).Decode(&n)

	log.Println("notifications", n)

	new := make([]interface{}, len(n))
	for i, v := range n {
		v.Author = author
		new[i] = v
	}

	result, err := CreateNotifications(new)

	if err != nil {
		log.Println(err)
	}

	w.Header().Set("Content-Type", "application/json;charset=UTF-8")
	if err := json.NewEncoder(w).Encode(result); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
}

func UserCreate(w http.ResponseWriter, r *http.Request) {
	var user User

	json.NewDecoder(r.Body).Decode(&user)

	user.Id = bson.NewObjectId()

	result, err := CreateUser(&user)

	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	value := user.Id.Hex()

	SetCookieHandler(w, value, "membraneReader")
	w.Header().Set("Content-Type", "application/json;charset=UTF-8")
	if err := json.NewEncoder(w).Encode(result); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
}

func UserCheck(w http.ResponseWriter, r *http.Request) {

	userId, ok := context.Get(r, "membraneReader").(string)
	if !ok {
		log.Fatal("UserCheck context has wrong type of membraneReader")
	}

	if userId == "" {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	u := User{}

	result, err := FindUser(bson.M{"_id": bson.ObjectIdHex(userId)}, &u)
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json;charset=UTF-8")
	if err := json.NewEncoder(w).Encode(result); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
}

func NotificationsUser(w http.ResponseWriter, r *http.Request) {
	userId, ok := context.Get(r, "membraneReader").(string)
	if !ok {
		log.Fatal("NotificationsUser context has wrong type of membraneReader")
	}

	if userId == "" {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	n := Notifications{}

	notifications, err := FindNotifications(bson.M{"userId": userId}, &n)

	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json;charset=UTF-8")
	if err := json.NewEncoder(w).Encode(notifications); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
}

func NotificationsUserRead(w http.ResponseWriter, r *http.Request) {
	userId, ok := context.Get(r, "membraneReader").(string)
	if !ok {
		log.Fatal("NotificationsUserRead context has wrong type of membraneReader")
	}

	if userId == "" {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	n := Notifications{}
	notifications, err := FindNotifications(bson.M{"userId": userId}, &n)
	MarkNotificationsAsRead(&n)

	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	for index, _ := range *notifications {
		ptr := *notifications
		defaultLength := 60
		length := 60
		if len(ptr[index].Text) < defaultLength {
			length = len(ptr[index].Text)
		}

		ptr[index].Text = ptr[index].Text[0:length]

		if len(ptr[index].Text) >= defaultLength {
			ptr[index].Text += "..."
		}
	}

	w.Header().Set("Content-Type", "application/json;charset=UTF-8")
	if err := json.NewEncoder(w).Encode(notifications); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
}

func MarkNotificationsAsRead(n *Notifications) {
	for _, element := range *n {
		result := MarkRead(bson.M{"_id": element.Id})
		log.Println(result)
	}

}

func MarkRead(query map[string]interface{}) error {
	c := controller.session.DB("test").C("notifications")

	err := c.Update(query, bson.M{"$set": bson.M{"read": true}})

	if err != nil {
		return err
	}
	return err
}

func FindUser(query map[string]interface{}, thing *User) (*User, error) {
	c := controller.session.DB("test").C("users")
	if err := c.Find(query).One(thing); err != nil {
		return nil, err
	}
	return thing, nil
}

func FindUsers(query map[string]interface{}, thing *Users) (*Users, error) {
	c := controller.session.DB("test").C("users")
	if err := c.Find(query).All(thing); err != nil {
		return nil, err
	}
	return thing, nil
}

func UserIndex(w http.ResponseWriter, r *http.Request) {
	u := Users{}

	result, err := FindUsers(bson.M{}, &u)

	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json;charset=UTF-8")
	if err := json.NewEncoder(w).Encode(result); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
}

func UserView(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	userId, ok := vars["userId"]
	if !ok {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	if userId == "" {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	u := User{}

	result, err := FindUser(bson.M{"_id": bson.ObjectIdHex(userId)}, &u)
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json;charset=UTF-8")
	if err := json.NewEncoder(w).Encode(result); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
}

func UserPrompts(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	userId, ok := vars["userId"]
	if !ok {
		w.WriteHeader(http.StatusBadRequest)
	}

	if userId == "" {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	s := Prompts{}

	result, err := FindPrompts(bson.M{"user": bson.ObjectIdHex(userId)}, &s)
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json;charset=UTF-8")
	if err := json.NewEncoder(w).Encode(result); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
}

func getSession() *mgo.Session {

	ip := os.Getenv("MONGOIP")
	if ip == "" {
		log.Fatal("could not find MONGOIP environment variable")
	}
	port := os.Getenv("MONGOPORT")
	if port == "" {
		log.Fatal("could not find MONGOPORT environment variable")
	}

	addr := ip + ":" + port

	log.Println("Dialing mongo at", addr)
	s, err := mgo.Dial(addr)
	if err != nil {
		panic(err)
	}
	log.Println("Connected successfully to mongo!")
	return s
}

func FindResponse(query map[string]interface{}, thing *Response) (*Response, error) {
	c := controller.session.DB("test").C("responses")
	if err := c.Find(query).One(thing); err != nil {
		return nil, err
	}
	return thing, nil
}

func FindResponses(query map[string]interface{}, thing *Responses) (*Responses, error) {
	c := controller.session.DB("test").C("responses")
	if err := c.Find(query).All(thing); err != nil {
		return nil, err
	}

	return thing, nil
}

func FindPrompt(query map[string]interface{}, thing *Prompt) (*Prompt, error) {
	c := controller.session.DB("test").C("prompts")
	if err := c.Find(query).One(thing); err != nil {
		return nil, err
	}
	return thing, nil
}

func FindPrompts(query map[string]interface{}, thing *Prompts) (*Prompts, error) {
	c := controller.session.DB("test").C("prompts")
	if err := c.Find(query).All(thing); err != nil {
		return nil, err
	}
	return thing, nil
}

func CreatePrompt(thing *Prompt) (*Prompt, error) {
	c := controller.session.DB("test").C("prompts")
	if err := c.Insert(thing); err != nil {
		return nil, err
	}

	return thing, nil
}

// CreateInitialResponse is used for the intial utterance that is POSTed.
// It differs from CreateReponse in that it respects the slug.
func CreateInitialResponse(w http.ResponseWriter, response Response) (*Response, error) {
	c := controller.session.DB("test").C("responses")
	var mgoResponse Response
	query := c.Find(bson.M{"slug": response.Slug})
	err := query.One(&mgoResponse)
	if err == nil {
		// found slug oh no! return a 409
		w.WriteHeader(http.StatusConflict)
		return nil, errors.New("slug " + response.Slug + " already exists")
	}
	err = c.Insert(response)
	if err != nil {
		// insert failed oh no! return a 400
		w.WriteHeader(http.StatusBadRequest)
		return nil, errors.New("insert for " + response.Slug + "failed")
	}
	return &response, nil
}

func CreateResponse(thing *Response) (*Response, error) {
	c := controller.session.DB("test").C("responses")

	num, err := c.Find(bson.M{"author": thing.Author}).Count()
	if err != nil {
		return nil, err
	}

	for {
		testSlug := thing.Author + strconv.Itoa(num)

		n, err := c.Find(bson.M{"slug": testSlug}).Count()
		// TODO can this return nil, err
		if err != nil {
			log.Println(err)
		}

		if n > 0 {
			num += 1
			log.Println("too many")
			continue
		} else {
			thing.Slug = testSlug
		}

		break
	}

	if err := c.Insert(thing); err != nil {
		// TODO can this return nil, err
		log.Println(err)
	}

	return thing, nil
}

func DeletePrompt(query map[string]interface{}, thing *Prompt) (*Prompt, error) {
	c := controller.session.DB("test").C("prompts")
	if err := c.Remove(query); err != nil {
		return nil, err
	}
	return thing, nil
}

func DeleteResponse(slug string) error {
	c := controller.session.DB("test").C("responses")
	err := c.Remove(bson.M{"slug": slug})
	return err
}

func AdminOverview(w http.ResponseWriter, r *http.Request) {

	author, ok := context.Get(r, "membraneAuthor").(string)
	if !ok {
		log.Fatal("AdminOverview context had wrong type of membraneAuthor")
	}

	if author == "" {
		forbidden(w, r)
		return
	}

	responses := Responses{}

	result, err := FindResponses(bson.M{"author": author}, &responses)
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	if len(*result) > 0 {
		http.ServeFile(w, r, "public/author.html")
	} else {
		http.ServeFile(w, r, "public/initial.html")
	}

}

func AdminView(w http.ResponseWriter, r *http.Request) {

	response, ok := context.Get(r, "response").(Response)
	if !ok {
		log.Fatal("AdminView context has inappropiate type in response")
	}

	author, ok := context.Get(r, "membraneAuthor").(string)
	if !ok {
		log.Fatal("AdminView context has inappropiate type in cookie")
	}
	if author == "" {
		forbidden(w, r)
		return
	}

	if response.Author != author {
		http.Redirect(w, r, "/login", 302)
		return
	} else {
		http.ServeFile(w, r, "public/admin.html")
	}
}

func ResponseIndex(w http.ResponseWriter, r *http.Request) {
	s := Responses{}

	result, err := FindResponses(bson.M{}, &s)

	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json;charset=UTF-8")
	if err := json.NewEncoder(w).Encode(result); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
}

func PromptIndex(w http.ResponseWriter, r *http.Request) {
	s := Prompts{}

	result, err := FindPrompts(bson.M{}, &s)

	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json;charset=UTF-8")
	if err := json.NewEncoder(w).Encode(result); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
}

func ResponseShow(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	responseId, ok := vars["responseId"]
	if !ok {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	if responseId == "" {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	s := Response{}

	result, err := FindResponse(bson.M{"_id": bson.ObjectIdHex(responseId)}, &s)
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json;charset=UTF-8")
	if err := json.NewEncoder(w).Encode(result); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

}

func ResponseSlug(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	slug, ok := vars["slug"]
	if !ok {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	s := Response{}

	result, err := FindResponse(bson.M{"slug": slug}, &s)
	if err != nil {
		notFound(w, r)
		return
	}

	w.Header().Set("Content-Type", "application/json;charset=UTF-8")
	if err := json.NewEncoder(w).Encode(result); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
}

func PromptShow(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	promptId, ok := vars["promptId"]
	if !ok || promptId == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	s := Prompt{}

	result, err := FindPrompt(bson.M{"_id": bson.ObjectIdHex(promptId)}, &s)

	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json;charset=UTF-8")
	if err := json.NewEncoder(w).Encode(result); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
}

func ResponseChildren(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	whichResponse, ok := vars["responseId"]
	if !ok {
		w.WriteHeader(http.StatusBadRequest)
	}

	s := Prompts{}

	result, err := FindPrompts(bson.M{"parent": whichResponse}, &s)

	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json;charset=UTF-8")
	if err := json.NewEncoder(w).Encode(result); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
}

func ResponseChildrenAnchors(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	whichResponse, ok := vars["responseId"]
	if !ok {
		w.WriteHeader(http.StatusBadRequest)
	}

	s := Prompts{}

	result, err := FindPrompts(bson.M{"parent": whichResponse, "isAnchor": true}, &s)

	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json;charset=UTF-8")
	if err := json.NewEncoder(w).Encode(result); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
}

func ResponseChildrenOnlyAnswered(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	whichResponse, ok := vars["responseId"]
	if !ok {
		w.WriteHeader(http.StatusBadRequest)
	}

	s := Prompts{}

	result, err := FindPrompts(bson.M{"parent": whichResponse}, &s)
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	finalPrompts := Prompts{}

	for _, element := range *result {
		src := Responses{}
		data, err := FindResponses(bson.M{"parent": element.Id.Hex()}, &src)

		if len(*data) != 0 {
			finalPrompts = append(finalPrompts, element)
		}

		if err != nil {
			log.Println(err)
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
	}

	w.Header().Set("Content-Type", "application/json;charset=UTF-8")
	if err := json.NewEncoder(w).Encode(finalPrompts); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

}

func PromptChildren(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	whichPrompt, ok := vars["promptId"]
	if !ok {
		w.WriteHeader(http.StatusBadRequest)
	}

	s := Responses{}

	result, err := FindResponses(bson.M{"parent": whichPrompt}, &s)
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json;charset=UTF-8")
	if err := json.NewEncoder(w).Encode(result); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
}

func ResponseCreate(w http.ResponseWriter, r *http.Request) {

	author, ok := context.Get(r, "membraneAuthor").(string)
	if !ok {
		log.Fatal("ResponseCreate context has wrong type of membraneAuthor")
	}

	var response Response

	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	err = json.Unmarshal(body, &response)
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	if response.Slug != "" {
		// Initial Utterance
		log.Println("Initial Utterance!")
		w.Header().Set("Content-Type", "application/json;charset=UTF-8")
		result, err := CreateInitialResponse(w, response)
		if err != nil {
			log.Println(err)
			// headers are handled in the CreateInitialReposne function
			// but this should be neater. Problem is CreateInitialResponse can give a
			// 409 or a 400
			fmt.Fprint(w, err)
			fmt.Fprint(w, "\n")
			return
		}
		if err := json.NewEncoder(w).Encode(result); err != nil {
			w.WriteHeader(http.StatusInternalServerError)
		}
		return
	}

	// this will respect the POSTed author
	if response.Author == "" {
		response.Author = author
		response.Slug = author
	} else {
		response.Slug = response.Author
	}

	response.Id = bson.NewObjectId()

	result, err := CreateResponse(&response)
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json;charset=UTF-8")
	if err := json.NewEncoder(w).Encode(result); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
}

func PromptCreate(w http.ResponseWriter, r *http.Request) {
	var prompt Prompt

	json.NewDecoder(r.Body).Decode(&prompt)

	prompt.Id = bson.NewObjectId()
	prompt.IsHidden = false

	userId, ok := context.Get(r, "membraneReader").(string)
	if !ok {
		log.Fatal("PromptCreate context has wrong type of membraneReader")
	}

	if userId == "" {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	prompt.User = bson.ObjectIdHex(userId)

	result, err := CreatePrompt(&prompt)

	log.Println(result)

	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json;charset=UTF-8")
	if err := json.NewEncoder(w).Encode(result); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
}

func ResponseDelete(w http.ResponseWriter, r *http.Request) {
	slug, ok := context.Get(r, "slug").(string)
	if !ok {
		log.Fatal("ResponseDelete context has wrong type of slug")
	}
	err := DeleteResponse(slug)
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	log.Println("Deleted", slug)
}

func PromptDelete(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	promptId, ok := vars["promptId"]
	if !ok || promptId == "" {
		w.WriteHeader(http.StatusBadRequest)
	}

	s := Prompt{}

	result, err := DeletePrompt(bson.M{"_id": bson.ObjectIdHex(promptId)}, &s)

	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json;charset=UTF-8")
	if err := json.NewEncoder(w).Encode(result); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
}

func PromptUpdate(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	promptId, ok := vars["promptId"]

	if !ok || promptId == "" {
		w.WriteHeader(http.StatusBadRequest)
	}

	u := UpdatedPrompt{}
	json.NewDecoder(r.Body).Decode(&u)

	updateInfo := bson.M{}

	if u.Id != nil {
		updateInfo["_id"] = u.Id
	}
	if u.Text != nil {
		updateInfo["text"] = u.Text
	}
	if u.Kind != nil {
		updateInfo["kind"] = u.Kind
	}
	if u.User != nil {
		updateInfo["user"] = u.User
	}
	if u.IsAnchor != nil {
		updateInfo["isAnchor"] = u.IsAnchor
	}
	if u.IsHidden != nil {
		updateInfo["isHidden"] = u.IsHidden
	}
	if u.Parent != nil {
		updateInfo["parent"] = u.Parent
	}

	err := UpdatePrompt(bson.M{"_id": bson.ObjectIdHex(promptId)}, updateInfo)
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json;charset=UTF-8")
	if err := json.NewEncoder(w).Encode(err); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

}

func UpdatePrompt(query map[string]interface{}, update map[string]interface{}) error {
	c := controller.session.DB("test").C("prompts")

	err := c.Update(query, bson.M{"$set": update})
	if err != nil {
		return err
	}
	return err
}

func ResponseUpdate(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	slug, ok := vars["slug"]

	type Message struct {
		Parent []string
	}

	var m Message

	json.NewDecoder(r.Body).Decode(&m)

	if !ok {
		w.WriteHeader(http.StatusBadRequest)
	}

	s := Response{}

	err := UpdateResponse(bson.M{"slug": slug}, &s, m.Parent)
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json;charset=UTF-8")
	if err := json.NewEncoder(w).Encode(err); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

}

func UpdateResponse(query map[string]interface{}, thing *Response, prompts []string) error {
	c := controller.session.DB("test").C("responses")

	err := c.Update(query, bson.M{"$push": bson.M{"parent": bson.M{"$each": prompts}}})
	if err != nil {
		return err
	}
	return err
}

func ResponseAncestor(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)

	responseId, ok := vars["responseId"]

	if !ok || responseId == "" {
		log.Println("could not find responseId in mux vars")
		w.WriteHeader(http.StatusBadRequest)
	}

	res := Response{}

	response, err := FindResponse(bson.M{"_id": bson.ObjectIdHex(responseId)}, &res)
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	prm := Prompt{}

	var s string

	for _, element := range response.Parent {
		t := Prompt{}
		if element == "" {
			continue
		}
		p, err := FindPrompt(bson.M{"_id": bson.ObjectIdHex(element)}, &t)
		if err != nil {
			log.Println(err)
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		if p.IsAnchor == true {
			s = element
			break
		}
	}

	if s == "" {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	prompt, err := FindPrompt(bson.M{"_id": bson.ObjectIdHex(s)}, &prm)
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	res2 := Response{}

	if prompt.Parent == "" {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	result, err := FindResponse(bson.M{"_id": bson.ObjectIdHex(prompt.Parent)}, &res2)
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json;charset=UTF-8")
	if err := json.NewEncoder(w).Encode(result); err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

}

func AuthorWritings(w http.ResponseWriter, r *http.Request) {

	author, ok := context.Get(r, "membraneAuthor").(string)
	if !ok {
		log.Fatal("AuthorWritings context had wrong type of membraneAuthor")
	}
	responses := Responses{}

	result, err := FindResponses(bson.M{"author": author}, &responses)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json;charset=UTF-8")
	if err := json.NewEncoder(w).Encode(result); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
}

func PromptSetView(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	parent, ok := vars["author"]
	if !ok {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	set := PromptSet{}

	result, err := FindPromptSet(bson.M{"parent": parent}, &set)

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json;charset=UTF-8")
	if err := json.NewEncoder(w).Encode(result); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
}

func PromptSetIndex(w http.ResponseWriter, r *http.Request) {
	set := PromptSets{}

	result, err := FindPromptSets(bson.M{}, &set)

	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json;charset=UTF-8")
	if err := json.NewEncoder(w).Encode(result); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
}
func PromptSetCreate(w http.ResponseWriter, r *http.Request) {
	var set PromptSet

	json.NewDecoder(r.Body).Decode(&set)

	result, err := CreatePromptSet(&set)

	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json;charset=UTF-8")
	if err := json.NewEncoder(w).Encode(result); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
}

func CreatePromptSet(thing *PromptSet) (*PromptSet, error) {
	c := controller.session.DB("test").C("promptsets")
	if err := c.Insert(thing); err != nil {
		return nil, err
	}
	return thing, nil
}

func FindPromptSet(query map[string]interface{}, thing *PromptSet) (*PromptSet, error) {
	c := controller.session.DB("test").C("promptsets")
	if err := c.Find(query).One(thing); err != nil {
		return nil, err
	}
	return thing, nil
}

func FindPromptSets(query map[string]interface{}, thing *PromptSets) (*PromptSets, error) {
	c := controller.session.DB("test").C("promptsets")
	if err := c.Find(query).All(thing); err != nil {
		return nil, err
	}
	return thing, nil
}
