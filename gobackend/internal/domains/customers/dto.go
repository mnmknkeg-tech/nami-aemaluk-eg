package customers

// CustomerResponse represents a customer response
type CustomerResponse struct {
	Success bool      `json:"success"`
	Data    *Customer `json:"data,omitempty"`
	Error   string    `json:"error,omitempty"`
}

// CustomersListResponse represents a list of customers response
type CustomersListResponse struct {
	Success bool        `json:"success"`
	Data    []Customer  `json:"data,omitempty"`
	Total   int64       `json:"total,omitempty"`
	Error   string      `json:"error,omitempty"`
}

// CustomerStatsResponse represents customer statistics response
type CustomerStatsResponse struct {
	Success bool          `json:"success"`
	Data    *CustomerStats `json:"data,omitempty"`
	Error   string        `json:"error,omitempty"`
}
