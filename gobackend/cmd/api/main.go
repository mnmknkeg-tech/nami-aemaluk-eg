package main

import (
	"log"
	// Embed tzdata so Africa/Cairo booking times resolve even in
	// scratch/alpine runtime images without the OS tz database.
	_ "time/tzdata"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/app"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config load failed: %v", err)
	}

	application, err := app.New(cfg)
	if err != nil {
		log.Fatalf("application init failed: %v", err)
	}

	go application.WaitForShutdown()

	if err := application.Listen(); err != nil {
		log.Fatalf("server stopped: %v", err)
	}
}
