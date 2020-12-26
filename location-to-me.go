package main

import (
	"encoding/json"
	"flag"
	"log"
	"mime"
	"net/http"
	"path/filepath"
	"time"

	webpush "github.com/SherClockHolmes/webpush-go"
	"github.com/gorilla/mux"
)

type server struct {
	baseURL       string
	pushOptions   *webpush.Options
	locations     map[string][]Location // url key -> location id -> Location
	subscriptions map[string]map[webpush.Subscription]struct{}
}

type Location struct {
	ID        string     `json:"id"`
	ShareID   string     `json:"shareId"`
	UserID    string     `json:"userId"`
	Type      string     `json:"type"`
	Coords    Coordinate `json:"coords"`
	Timestamp string     `json:"timestamp"`
}

const timestampLayout = "Mon Jan 02 2006 15:04:05 GMT-0700"

func (l *Location) GetTimestamp() time.Time {
	t, _ := time.Parse(timestampLayout, l.Timestamp)
	return t
}

func (l *Location) SetTimestamp(t time.Time) {
	l.Timestamp = t.Format(timestampLayout)
}

type Coordinate struct {
	Latitude         float64 `json:"latitude"`
	Longitude        float64 `json:"longitude"`
	Accuracy         float64 `json:"accuracy"`
	Altitude         float64 `json:"altitude"`
	AltitudeAccuracy float64 `json:"altitudeAccuracy"`
	Heading          float64 `json:"heading"`
	Speed            float64 `json:"speed"`
}

func FindUserIndex(locations []Location, userID string) int {
	for i, l := range locations {
		if l.UserID == userID && l.Type == "share" {
			return i
		}
	}
	return -1
}

func FindIndex(locations []Location, id string) int {
	for i, l := range locations {
		if l.ID == id {
			return i
		}
	}
	return -1
}

func ShareExists(locations []Location, shareID string) bool {
	for _, l := range locations {
		if l.ShareID == shareID {
			return true
		}
	}
	return false
}

func RemoveIndex(locations []Location, index int) []Location {
	return append(locations[:index], locations[index+1:]...)
}

func (s *server) home(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, filepath.Join("public", "index.html"))
}

func (s *server) location(w http.ResponseWriter, r *http.Request, key string) {
	locations, exists := s.locations[key]
	if !exists {
		locations = make([]Location, 0)
	}
	json.NewEncoder(w).Encode(locations)
}

func (s *server) share(w http.ResponseWriter, r *http.Request, key string) {
	var loc Location
	err := json.NewDecoder(r.Body).Decode(&loc)

	if err != nil {
		http.Error(w, "Invalid location", http.StatusBadRequest)
		return
	}

	// handle times slightly in the future
	if loc.GetTimestamp().After(time.Now()) {
		loc.SetTimestamp(time.Now())
	}

	// this is the first location added to this key
	if _, exists := s.locations[key]; !exists {
		s.locations[key] = make([]Location, 0)
	}

	if !ShareExists(s.locations[key], loc.ShareID) {
		s.notify(key)
	}

	index := FindUserIndex(s.locations[key], loc.UserID)
	if index == 0 {
		s.locations[key][0] = loc // update
	} else {
		if index > 0 {
			s.locations[key] = RemoveIndex(s.locations[key], index)
		}
		s.locations[key] = append(s.locations[key], loc)
	}
}

func (s *server) remove(w http.ResponseWriter, r *http.Request, key string) {
	vars := mux.Vars(r)
	id := vars["id"]
	index := FindIndex(s.locations[key], id)
	if index >= 0 {
		s.locations[key] = RemoveIndex(s.locations[key], index)
	}
}

func (s *server) clear(w http.ResponseWriter, r *http.Request, key string) {
	delete(s.locations, key)
	delete(s.subscriptions, key)
}

func (s *server) notify(key string) {
	subscriptions, exist := s.subscriptions[key]
	if !exist {
		return
	}
	for subscription := range subscriptions {
		webpush.SendNotification([]byte(key), &subscription, s.pushOptions)
	}
}

func (s *server) subscription(w http.ResponseWriter, r *http.Request, key string) {
	var subcription webpush.Subscription
	json.NewDecoder(r.Body).Decode(&subcription)

	_, exists := s.subscriptions[key]
	if exists {
		_, exists = s.subscriptions[key][subcription]
	}

	ret := struct {
		PublicKey string `json:"publicKey"`
		Exists    bool   `json:"exists"`
	}{s.pushOptions.VAPIDPublicKey, exists}
	json.NewEncoder(w).Encode(ret)
}

func (s *server) subscribe(w http.ResponseWriter, r *http.Request, key string) {
	var subcription webpush.Subscription
	json.NewDecoder(r.Body).Decode(&subcription)

	if _, exists := s.subscriptions[key]; !exists {
		s.subscriptions[key] = make(map[webpush.Subscription]struct{})
	}
	s.subscriptions[key][subcription] = struct{}{}
}

func (s *server) unsubscribe(w http.ResponseWriter, r *http.Request, key string) {
	var subcription webpush.Subscription
	json.NewDecoder(r.Body).Decode(&subcription)

	_, exists := s.subscriptions[key]
	if !exists {
		return
	}

	_, exists = s.subscriptions[key][subcription]
	if !exists {
		return
	}

	delete(s.subscriptions[key], subcription)
}

func keyHandler(handler func(http.ResponseWriter, *http.Request, string)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		key := vars["key"]
		handler(w, r, key)
	}
}

func (s *server) routes() *mux.Router {
	r := mux.NewRouter()

	keyURL := "/{key:[a-z]{3}-[a-z]{4}-[a-z]{3}}"
	r.HandleFunc(keyURL, s.home).Methods("GET")
	r.HandleFunc(keyURL+"/locations", keyHandler(s.location)).Methods("GET")
	r.HandleFunc(keyURL+"/locations", keyHandler(s.share)).Methods("POST")
	r.HandleFunc(keyURL+"/locations/{id}", keyHandler(s.remove)).Methods("DELETE")
	r.HandleFunc(keyURL, keyHandler(s.clear)).Methods("DELETE")
	r.HandleFunc(keyURL+"/subscription", keyHandler(s.subscription)).Methods("POST")
	r.HandleFunc(keyURL+"/subscribe", keyHandler(s.subscribe)).Methods("POST")
	r.HandleFunc(keyURL+"/unsubscribe", keyHandler(s.unsubscribe)).Methods("POST")

	mime.AddExtensionType(".js", "text/javascript")
	r.PathPrefix("/").Handler(http.FileServer(http.Dir("public")))
	return r
}

// A job that runs every hour
func (s *server) cleanUpJob() {
	for {
		time.Sleep(1 * time.Hour)
		log.Println("Running Clean Job")
		s.cleanUp()
	}
}

// Remove any locations older than 24 hours
func (s *server) cleanUp() {
	cutoff := time.Now().Add(-24 * time.Hour)

	for key, locations := range s.locations {
		if len(locations) < 1 {
			continue
		}

		// Find the most recent location
		var lastLocation *Location
		for _, location := range locations {
			if lastLocation == nil || location.GetTimestamp().After(lastLocation.GetTimestamp()) {
				lastLocation = &location
			}
		}

		if lastLocation.GetTimestamp().Before(cutoff) {
			delete(s.locations, key)
			delete(s.subscriptions, key)
		}
	}
}

func main() {
	// Accept a command line flag "-httpaddr :8080"
	// This flag tells the server the http address to listen on
	httpaddr := flag.String("httpaddr", "localhost:8080",
		"the address/port to listen on for http \n"+
			"use :<port> to listen on all addresses\n")

	// Accept a command line flag "-baseurl https://mysite.com/"
	baseurl := flag.String("baseurl", "http://localhost:8080/",
		"the base url of the service \n")

	subscriber := flag.String("subscriber", "contact@places.pipeto.me",
		"the subscriber for web push notifications \n")

	vapidPublicKey := flag.String("vapidpublickey", "",
		"the vapid public key for web push notifications \n")

	vapidPrivateKey := flag.String("vapidprivatekey", "",
		"the vapid private key for web push notifications \n")

	flag.Parse()

	s := server{
		baseURL:       *baseurl,
		locations:     make(map[string][]Location),
		subscriptions: make(map[string]map[webpush.Subscription]struct{}),
		pushOptions: &webpush.Options{
			Subscriber:      *subscriber,
			VAPIDPublicKey:  *vapidPublicKey,
			VAPIDPrivateKey: *vapidPrivateKey,
			TTL:             30,
		},
	}

	go s.cleanUpJob()

	http.Handle("/", s.routes())

	log.Println("Listening on http:", *httpaddr)
	log.Fatal(http.ListenAndServe(*httpaddr, nil))
}
