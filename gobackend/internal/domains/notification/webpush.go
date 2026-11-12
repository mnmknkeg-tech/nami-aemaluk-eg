package notification

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// WebPushService handles web push notifications
type WebPushService struct {
	vapidSubject   string
	vapidPublicKey string
	vapidPrivateKey string
	httpClient     *http.Client
	configured     bool
}

// NewWebPushService creates a new web push service
func NewWebPushService(vapidSubject, vapidPublicKey, vapidPrivateKey string) *WebPushService {
	return &WebPushService{
		vapidSubject:    vapidSubject,
		vapidPublicKey:  vapidPublicKey,
		vapidPrivateKey: vapidPrivateKey,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		configured: vapidSubject != "" && vapidPublicKey != "" && vapidPrivateKey != "",
	}
}

// PushPayload represents a push notification payload
type PushPayload struct {
	Title string `json:"title"`
	Body  string `json:"body"`
	URL   string `json:"url,omitempty"`
	Tag   string `json:"tag,omitempty"`
	Data  map[string]interface{} `json:"data,omitempty"`
}

// SendToMerchantShop sends a push notification to all active merchant subscriptions for a shop
func (s *WebPushService) SendToMerchantShop(subscriptions []MerchantPushSubscription, payload *PushPayload) error {
	if !s.configured || len(subscriptions) == 0 {
		return nil
	}

	for _, sub := range subscriptions {
		if !sub.IsActive {
			continue
		}

		// Check if it's an Expo token
		if expoToken := s.getExpoToken(sub.Subscription); expoToken != "" {
			if err := s.sendExpoPush(expoToken, payload); err != nil {
				// Log error but continue with other subscriptions
				fmt.Printf("Failed to send Expo push to %s: %v\n", sub.ID, err)
			}
		} else {
			// Standard web push
			if err := s.sendWebPush(sub.Subscription, payload); err != nil {
				// Log error but continue with other subscriptions
				fmt.Printf("Failed to send web push to %s: %v\n", sub.ID, err)
			}
		}
	}

	return nil
}

// SendToCustomerUser sends a push notification to all active customer subscriptions for a user
func (s *WebPushService) SendToCustomerUser(subscriptions []CustomerPushSubscription, payload *PushPayload) error {
	if !s.configured || len(subscriptions) == 0 {
		return nil
	}

	for _, sub := range subscriptions {
		if !sub.IsActive {
			continue
		}

		// Check if it's an Expo token
		if expoToken := s.getExpoToken(sub.Subscription); expoToken != "" {
			if err := s.sendExpoPush(expoToken, payload); err != nil {
				// Log error but continue with other subscriptions
				fmt.Printf("Failed to send Expo push to %s: %v\n", sub.ID, err)
			}
		} else {
			// Standard web push
			if err := s.sendWebPush(sub.Subscription, payload); err != nil {
				// Log error but continue with other subscriptions
				fmt.Printf("Failed to send web push to %s: %v\n", sub.ID, err)
			}
		}
	}

	return nil
}

// getExpoToken checks if the subscription contains an Expo push token
func (s *WebPushService) getExpoToken(subscription map[string]interface{}) string {
	if expoToken, ok := subscription["expoPushToken"].(string); ok {
		if s.isExpoToken(expoToken) {
			return expoToken
		}
	}
	return ""
}

// isExpoToken validates if a token is a valid Expo push token
func (s *WebPushService) isExpoToken(token string) bool {
	token = strings.TrimSpace(token)
	return strings.HasPrefix(token, "ExponentPushToken[") || strings.HasPrefix(token, "ExpoPushToken[")
}

// sendExpoPush sends a push notification via Expo service
func (s *WebPushService) sendExpoPush(expoToken string, payload *PushPayload) error {
	title := strings.TrimSpace(payload.Title)
	if title == "" {
		title = "إشعار"
	}

	body := strings.TrimSpace(payload.Body)

	expoPayload := map[string]interface{}{
		"to":    expoToken,
		"title": title,
		"body":  body,
		"sound": "default",
	}

	if payload.URL != "" {
		expoPayload["data"] = map[string]string{"url": payload.URL}
	}

	jsonPayload, err := json.Marshal(expoPayload)
	if err != nil {
		return fmt.Errorf("failed to marshal Expo payload: %w", err)
	}

	req, err := http.NewRequest("POST", "https://exp.host/--/api/v2/push/send", bytes.NewBuffer(jsonPayload))
	if err != nil {
		return fmt.Errorf("failed to create Expo request: %w", err)
	}

	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send Expo request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("Expo push failed with status %d: %s", resp.StatusCode, string(body))
	}

	return nil
}

// sendWebPush sends a standard web push notification
func (s *WebPushService) sendWebPush(subscription map[string]interface{}, payload *PushPayload) error {
	// For now, we'll implement a basic version
	// In production, you would use a proper Web Push library like github.com/SherClockHolmes/webpush-go
	
	endpoint, ok := subscription["endpoint"].(string)
	if !ok {
		return fmt.Errorf("invalid subscription: missing endpoint")
	}

	// Create a simple HTTP POST request (simplified version)
	// In production, this should use proper VAPID headers and encryption
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal web push payload: %w", err)
	}

	req, err := http.NewRequest("POST", endpoint, bytes.NewBuffer(jsonPayload))
	if err != nil {
		return fmt.Errorf("failed to create web push request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("TTL", "3600")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send web push request: %w", err)
	}
	defer resp.Body.Close()

	// 404 and 410 mean the subscription is no longer valid
	if resp.StatusCode == http.StatusNotFound || resp.StatusCode == http.StatusGone {
		return fmt.Errorf("subscription expired")
	}

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("web push failed with status %d: %s", resp.StatusCode, string(body))
	}

	return nil
}

// IsConfigured returns true if the web push service is properly configured
func (s *WebPushService) IsConfigured() bool {
	return s.configured
}
