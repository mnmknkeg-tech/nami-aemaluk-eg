package accounting

import "errors"

// Domain errors surfaced to the API layer with Arabic messages.
var (
	ErrAccountInUse       = errors.New("لا يمكن حذف حساب مستخدم في قيود")
	ErrUnbalanced         = errors.New("القيد غير متوازن: مجموع المدين لا يساوي مجموع الدائن")
	ErrNoBothSides        = errors.New("القيد يجب أن يحتوي أطراف مدين ودائن")
	ErrLineBothSides      = errors.New("لا يمكن أن يكون السطر مدين ودائن في نفس الوقت")
	ErrLineEmpty          = errors.New("لا يمكن ترك سطر بدون مبلغ")
	ErrEntityNotFound     = errors.New("الكيان غير موجود")
	ErrInvoiceNotFound    = errors.New("الفاتورة غير موجودة")
	ErrPaymentNotFound    = errors.New("الدفعة غير موجودة")
	ErrInvoicePosted      = errors.New("لا يمكن تعديل فاتورة مرحَّلة")
	ErrOverpayment        = errors.New("المبلغ المدفوع يتجاوز المستحق")
	ErrAllocationNotFound = errors.New("تخصيص الدفع غير موجود")
)
