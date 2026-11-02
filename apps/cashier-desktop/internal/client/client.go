// Package client talks to the gobackend API (Fiber) with the same contracts
// the dashboard web app uses. It is used by the syncer only — the cashier
// itself never blocks on the network.
package client

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type Client struct {
	BaseURL      string
	AccessToken  string
	RefreshToken string
	http         *http.Client
}

func New(baseURL, accessToken, refreshToken string) *Client {
	return &Client{
		BaseURL:      strings.TrimRight(baseURL, "/"),
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		http:         &http.Client{Timeout: 8 * time.Second},
	}
}

type AuthUser struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
	Role  string `json:"role"`
	ShopID string `json:"shopId"`
}

type TokenPair struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
}

type AuthResponse struct {
	User  AuthUser  `json:"user"`
	Token TokenPair `json:"token"`
}

// Login performs POST /api/v1/auth/login and returns the parsed response.
func (c *Client) Login(email, password string) (*AuthResponse, error) {
	var out struct {
		Success bool        `json:"success"`
		Data    AuthResponse `json:"data"`
		AuthResponse
	}
	if err := c.doJSON(http.MethodPost, "/api/v1/auth/login", map[string]string{"email": email, "password": password}, &out, false); err != nil {
		return nil, err
	}
	resp := out.Data
	if resp.Token.AccessToken == "" {
		resp = out.AuthResponse
	}
	if resp.Token.AccessToken == "" {
		return nil, fmt.Errorf("لم يرجع توكن من السيرفر")
	}
	return &resp, nil
}

// Refresh exchanges the refresh token for a new pair (POST /api/v1/auth/refresh).
func (c *Client) Refresh() (*TokenPair, error) {
	var out struct {
		Success bool `json:"success"`
		Data    struct {
			Token TokenPair `json:"token"`
		} `json:"data"`
		TokenPair
	}
	if err := c.doJSON(http.MethodPost, "/api/v1/auth/refresh", map[string]string{"refreshToken": c.RefreshToken}, &out, false); err != nil {
		return nil, err
	}
	t := out.Data.Token
	if t.AccessToken == "" {
		t = out.TokenPair
	}
	if t.AccessToken == "" {
		return nil, fmt.Errorf("فشل تجديد الجلسة")
	}
	return &t, nil
}

// Get fetches a JSON endpoint into out. Refreshes the token once on 401.
func (c *Client) Get(path string, out any) error {
	return c.request(http.MethodGet, path, nil, out, true)
}

// Post sends a JSON body and decodes the response into out (may be nil).
func (c *Client) Post(path string, body any, out any) error {
	return c.request(http.MethodPost, path, body, out, true)
}

func (c *Client) request(method, path string, body any, out any, withAuth bool) error {
	err := c.doJSON(method, path, body, out, withAuth)
	if err == nil || withAuth == false {
		return err
	}
	if !isAuthError(err) {
		return err
	}
	// one silent refresh attempt, then retry
	pair, rerr := c.Refresh()
	if rerr != nil {
		return fmt.Errorf("انتهت الجلسة — سجل الدخول من جديد")
	}
	c.AccessToken = pair.AccessToken
	if pair.RefreshToken != "" {
		c.RefreshToken = pair.RefreshToken
	}
	return c.doJSON(method, path, body, out, withAuth)
}

func isAuthError(err error) bool {
	if ae, ok := err.(*APIError); ok {
		return ae.Status == http.StatusUnauthorized
	}
	return false
}

type APIError struct {
	Status  int
	Message string
}

func (e *APIError) Error() string {
	if e.Message != "" {
		return fmt.Sprintf("%d: %s", e.Status, e.Message)
	}
	return fmt.Sprintf("HTTP %d", e.Status)
}

func (c *Client) doJSON(method, path string, body any, out any, withAuth bool) error {
	var reader io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return err
		}
		reader = bytes.NewReader(b)
	}
	req, err := http.NewRequest(method, c.BaseURL+path, reader)
	if err != nil {
		return err
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if withAuth && c.AccessToken != "" {
		req.Header.Set("Authorization", "Bearer "+c.AccessToken)
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("network: %w", err)
	}
	defer resp.Body.Close()
	data, _ := io.ReadAll(io.LimitReader(resp.Body, 8<<20))
	if resp.StatusCode >= 400 {
		var e struct {
			Message string `json:"message"`
			Error   string `json:"error"`
		}
		_ = json.Unmarshal(data, &e)
		msg := e.Message
		if msg == "" {
			msg = e.Error
		}
		return &APIError{Status: resp.StatusCode, Message: msg}
	}
	if out != nil {
		return json.Unmarshal(data, out)
	}
	return nil
}
