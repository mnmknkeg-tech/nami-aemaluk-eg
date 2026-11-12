package client

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestPostWithIdempotencyKeySetsHeader(t *testing.T) {
	var received string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		received = r.Header.Get("X-Idempotency-Key")
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"success":true,"data":{"id":"remote-order"}}`))
	}))
	defer server.Close()

	c := New(server.URL, "token", "")
	c.http = server.Client()
	var response struct {
		Data struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	if err := c.PostWithIdempotencyKey("/orders", map[string]string{"shopId": "shop"}, &response, "local-order-id"); err != nil {
		t.Fatal(err)
	}
	if received != "local-order-id" {
		t.Fatalf("received idempotency key %q, want %q", received, "local-order-id")
	}
	if response.Data.ID != "remote-order" {
		t.Fatalf("unexpected decoded response: %#v", response)
	}
}
