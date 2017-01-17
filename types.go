package main

import (
	// "code.google.com/p/go.crypto/bcrypt"
	"net/http"

	"gopkg.in/mgo.v2"
	"gopkg.in/mgo.v2/bson"
	// "time"
)

type Prompt struct {
	Id        bson.ObjectId `json:"_id" bson:"_id,omitempty"`
	Text      string        `json:"text" bson:"text"`
	Kind      string        `json:"kind" bson:"kind"`
	User      bson.ObjectId `json:"user" bson:"user"`
	IsAnchor  bool          `json:"isAnchor" bson:"isAnchor"`
	IsHidden  bool          `json:"isHidden" bson:"isHidden"`
	Paragraph int           `json:"paragraph" bson:"paragraph"`
	NumStart  int           `json:"numStart" bson:"numStart"`
	NumEnd    int           `json:"numEnd" bson:"numEnd"`

	Parent string `json:"parent" bson:"parent,omitempty"`
}
type Prompts []Prompt

type UpdatedPrompt struct {
	Id       *bson.ObjectId `json:"_id" bson:"_id,omitempty"`
	Text     *string        `json:"text" bson:"text"`
	Kind     *string        `json:"kind" bson:"kind"`
	User     *bson.ObjectId `json:"user" bson:"user"`
	IsAnchor *bool          `json:"isAnchor" bson:"isAnchor"`
	IsHidden *bool          `json:"isHidden" bson:"isHidden"`

	Parent *string `json:"parent" bson:"parent,omitempty"`
}

type Link struct {
	Text string `json:"text" bson:"text"`
	Href string `json:"href" bson:"href"`
}

// type Links []Link

type Response struct {
	Id     bson.ObjectId `json:"_id" bson:"_id,omitempty"`
	Text   string        `json:"text" bson:"text"`
	Slug   string        `json:"slug" bson:"slug"`
	Author string        `json:"author" bson:"author"`

	Parent []string `json:"parent" bson:"parent,omitempty"`
	// Links  []string `json:"links" bson:"links"`
	// Links []Links `json:"links" bson:"links"`
	// Links Link `json:"link" bson:"link"`
}

type Responses []Response

type Route struct {
	Name        string
	Method      string
	Pattern     string
	HandlerFunc http.HandlerFunc
	Middle      []Middleware
}

type Middleware func(http.Handler) http.Handler

type Routes []Route

type Controller struct {
	session *mgo.Session
}

type Author struct {
	Id       bson.ObjectId `bson:"_id,omitempty"`
	Username string
	First    string
	Last     string
	Password []byte
}

type User struct {
	Id bson.ObjectId `json:"_id" bson:"_id,omitempty"`
}

type Users []User

type Notification struct {
	Id     bson.ObjectId `json:"_id" bson:"_id,omitempty"`
	User   string        `json:"userId" bson:"userId"`
	Prompt string        `json:"prompt" bson:"prompt"`
	Read   bool          `json:"read" bson:"read"`

	// Timestamp time.Time `json:"timestamp" bson:"timestamp"`

	Kind string `json:"kind" bson:"kind"`
	Text string `json:"text" bson:"text"`

	Slug string `json:"slug" bson:"slug"`

	Author string `json:"author" bson:"author"`
}

type Notifications []Notification

type PromptSet struct {
	Parent  string   `json:"parent" bson:"parent"`
	Prompts []string `json:"prompts" bson:"prompts"`
}

type PromptSets []PromptSet
