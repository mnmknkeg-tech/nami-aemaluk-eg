package validate

import (
	"reflect"
	"strings"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/go-playground/validator/v10"
)

var v = validator.New()

func init() {
	v.RegisterTagNameFunc(func(fld reflect.StructField) string {
		name := strings.SplitN(fld.Tag.Get("json"), ",", 2)[0]
		if name == "" {
			name = fld.Name
		}
		return name
	})
}

// Struct validates a struct using go-playground validator and returns a domain
// validation error when it fails.
func Struct(s any) error {
	if err := v.Struct(s); err != nil {
		return errors.Validation("validation_failed", err.Error())
	}
	return nil
}
