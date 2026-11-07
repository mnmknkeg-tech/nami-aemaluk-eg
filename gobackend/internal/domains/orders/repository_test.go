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
	if countSQLExpressions(values) != 24 {
		t.Fatalf("order insert has %d values, want 24", countSQLExpressions(values))
	}

	id, source, shiftID, key, requestHash := "user-1", "website", "shift-1", "request-1", "hash-1"
	order := &Order{
		Total:          100,
		Discount:       5,
		Status:         OrderStatusPending,
		UserID:         id,
		ShopID:         "shop-1",
		Source:         source,
		PosShiftID:     &shiftID,
		IdempotencyKey: &key,
		RequestHash:    &requestHash,
	}
	args := orderInsertArgs(order)
	if len(args) != 19 {
		t.Fatalf("order insert has %d arguments, want 19", len(args))
	}
	if args[13] != id || args[14] != order.ShopID || args[15] != source ||
		args[16] != &shiftID || args[17] != &key || args[18] != &requestHash {
		t.Fatal("order insert arguments do not match user, shop, source, shift, and idempotency columns")
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
