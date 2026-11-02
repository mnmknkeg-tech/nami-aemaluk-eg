package apps

import "time"

// App represents an app record.
type App struct {
	ID          string    `json:"id"`
	Key         string    `json:"key"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Version     string    `json:"version"`
	Permissions []byte    `json:"-"`
	Hooks       []byte    `json:"-"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// ShopApp represents an installed app for a shop.
type ShopApp struct {
	ID         string     `json:"id"`
	ShopID     string     `json:"shopId"`
	AppID      string     `json:"appId"`
	Status     string     `json:"status"`
	IsActive   bool       `json:"isActive"`
	Settings   []byte     `json:"-"`
	InstalledAt time.Time `json:"installedAt"`
	UpdatedAt  time.Time  `json:"updatedAt"`

	// Joined
	AppKey     string `json:"appKey,omitempty"`
	AppName    string `json:"appName,omitempty"`
	AppVersion string `json:"appVersion,omitempty"`
}

// AppResponse is the serialized app response.
type AppResponse struct {
	ID          string    `json:"id"`
	Key         string    `json:"key"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Version     string    `json:"version"`
	Permissions []string  `json:"permissions"`
	Hooks       []string  `json:"hooks"`
	CreatedAt   time.Time `json:"createdAt"`
}

// ShopAppResponse is the serialized shop app response.
type ShopAppResponse struct {
	ID         string    `json:"id"`
	ShopID     string    `json:"shopId"`
	Status     string    `json:"status"`
	IsActive   bool      `json:"isActive"`
	InstalledAt time.Time `json:"installedAt"`
	UpdatedAt  time.Time  `json:"updatedAt"`
	AppKey     string    `json:"appKey,omitempty"`
	AppName    string    `json:"appName,omitempty"`
	AppVersion string    `json:"appVersion,omitempty"`
}

// InstallResponse is the response for install/uninstall.
type InstallResponse struct {
	OK          bool   `json:"ok"`
	Uninstalled *bool  `json:"uninstalled,omitempty"`
}
