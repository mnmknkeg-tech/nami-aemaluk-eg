// Offline password verifier: checks candidate passwords against an Argon2id
// hash pulled from the database. No network calls, no rate limits, no lockout.
// Run: go run ./cmd/pwcheck <email> <hash> [candidate ...]
package main

import (
	"encoding/base64"
	"fmt"
	"os"
	"strings"

	"golang.org/x/crypto/argon2"
)

func verify(password, encoded string) bool {
	parts := strings.Split(encoded, "$")
	if len(parts) != 3 || parts[0] != "argon2id" {
		return false
	}
	salt, err := base64.RawStdEncoding.DecodeString(parts[1])
	if err != nil {
		return false
	}
	want, err := base64.RawStdEncoding.DecodeString(parts[2])
	if err != nil {
		return false
	}
	got := argon2.IDKey([]byte(password), salt, 1, 64*1024, 1, 32)
	if len(got) != len(want) {
		return false
	}
	var diff byte
	for i := range got {
		diff |= got[i] ^ want[i]
	}
	return diff == 0
}

func main() {
	if len(os.Args) < 3 {
		fmt.Println("usage: pwcheck <email> <argon2id-hash> [candidate ...]")
		os.Exit(2)
	}
	email, hash := os.Args[1], os.Args[2]
	fmt.Printf("target: %s\n", email)
	for _, cand := range os.Args[3:] {
		if verify(cand, hash) {
			fmt.Printf("MATCH  %q\n", cand)
			return
		}
		fmt.Printf("no     %q\n", cand)
	}
	fmt.Println("no candidate matched")
}
