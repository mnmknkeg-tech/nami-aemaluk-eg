package errors

import (
	"errors"
	"testing"
)

func TestNewCarriesKindAndMessage(t *testing.T) {
	err := New(KindValidation, "email_required", "email is required").WithField("field", "email")
	appErr, ok := IsAppError(err)
	if !ok {
		t.Fatal("expected AppError")
	}
	if appErr.Kind != KindValidation {
		t.Fatalf("expected validation kind, got %s", appErr.Kind)
	}
	if appErr.Fields["field"] != "email" {
		t.Fatal("expected field to be attached")
	}
}

func TestIsAppErrorReturnsFalseForGenericError(t *testing.T) {
	_, ok := IsAppError(errors.New("plain error"))
	if ok {
		t.Fatal("expected plain error not to be AppError")
	}
}
