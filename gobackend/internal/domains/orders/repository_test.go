package orders

import (
	"strings"
	"testing"
)

func TestOrderInsertColumnsAndArgumentsMatch(t *testing.T) {
	valuesStart := strings.Index(insertOrderQuery, ") VALUES (")
	if valuesStart < 0 {
		t.Fatal("order insert has no VALUES clause")
	}
	valuesStart += len(") VALUES (")
	valuesEnd := strings.Index(insertOrderQuery[valuesStart:], ")\n\tON CONFLICT")
	if valuesEnd < 0 {
		t.Fatal("order insert has no ON CONFLICT clause")
	}
	values := insertOrderQuery[valuesStart : valuesStart+valuesEnd]
	if countSQLExpressions(values) != 28 {
		t.Fatalf("order insert has %d values, want 28", countSQLExpressions(values))
	}

	id, source, salesChannel, shiftID, key, requestHash := "user-1", "website", "website", "shift-1", "request-1", "hash-1"
	order := &Order{
		Total:          100,
		Discount:       5,
		Status:         OrderStatusPending,
		UserID:         id,
		ShopID:         "shop-1",
		Source:         source,
		SalesChannel:   salesChannel,
		PosShiftID:     &shiftID,
		IdempotencyKey: &key,
		RequestHash:    &requestHash,
	}
	args := orderInsertArgs(order)
	if len(args) != 23 {
		t.Fatalf("order insert has %d arguments, want 23", len(args))
	}
	if args[13] != id || args[14] != order.ShopID || args[15] != source ||
		args[16] != salesChannel || args[17] != &shiftID || args[18] != &key || args[19] != &requestHash {
		t.Fatal("order insert arguments do not match user, shop, source, sales channel, shift, and idempotency columns")
	}
	// Nil pointers become non-nil interfaces when stored in []any, so inspect
	// their concrete pointer types instead of comparing the interface to nil.
	if value, ok := args[20].(*string); !ok || value != nil {
		t.Fatal("customer name argument should be a nil *string")
	}
	if value, ok := args[21].(*float64); !ok || value != nil {
		t.Fatal("delivery fee argument should be a nil *float64")
	}
	if value, ok := args[22].(*string); !ok || value != nil {
		t.Fatal("delivery zone argument should be a nil *string")
	}
	if !strings.Contains(insertOrderQuery, "NULLIF($14, '')") {
		t.Fatal("guest orders must store an empty user id as SQL NULL")
	}
}

func countSQLExpressions(input string) int {
	count, depth := 1, 0
	inString := false
	for index := 0; index < len(input); index++ {
		switch input[index] {
		case '\'':
			if inString && index+1 < len(input) && input[index+1] == '\'' {
				index++
				continue
			}
			inString = !inString
		case '(':
			if !inString {
				depth++
			}
		case ')':
			if !inString {
				depth--
			}
		case ',':
			if !inString && depth == 0 {
				count++
			}
		}
	}
	return count
}
