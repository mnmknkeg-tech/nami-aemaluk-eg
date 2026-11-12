package ai

import (
	"context"
	"fmt"
	"math"
	"time"
)

// Service turns raw shop numbers into analysis cards, insights and SEO audits.
// Everything is computed from real data with transparent rules — no invented
// numbers, no external AI calls.
type Service struct {
	repo *Repository
}

// NewService creates a new AI service.
func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func nowRFC3339() string {
	return time.Now().UTC().Format(time.RFC3339)
}

func trendPct(current, previous float64) float64 {
	if previous <= 0 {
		if current > 0 {
			return 100
		}
		return 0
	}
	return (current - previous) / previous * 100
}

func trendOf(current, previous float64) string {
	pct := trendPct(current, previous)
	switch {
	case pct > 5:
		return "up"
	case pct < -5:
		return "down"
	default:
		return "stable"
	}
}

func egp(v float64) string {
	// Simple human formatting; avoids importing a formatting lib for one case.
	if v >= 1000000 {
		return fmt.Sprintf("%.1fM ج.م", v/1000000)
	}
	if v >= 1000 {
		return fmt.Sprintf("%.1f ألف ج.م", v/1000)
	}
	return fmt.Sprintf("%.0f ج.م", v)
}

func strList(items ...string) []string {
	out := []string{}
	for _, s := range items {
		if s != "" {
			out = append(out, s)
		}
	}
	return out
}

// BuildAnalysis produces the 4 metric cards the AI analysis page shows.
func (s *Service) BuildAnalysis(ctx context.Context, shopID string) ([]AnalysisItem, error) {
	snap, err := s.repo.LoadSnapshot(ctx, shopID)
	if err != nil {
		return nil, err
	}
	updated := nowRFC3339()
	items := []AnalysisItem{}

	// ── Sales ────────────────────────────────────────────────
	salesInsights := strList(
		fmt.Sprintf("عدد الطلبات آخر 30 يوم: %d مقابل %d في الفترة السابقة", snap.Orders, snap.PrevOrders),
	)
	salesRecs := strList()
	if avgOrder := 0.0; snap.Orders > 0 {
		avgOrder = snap.Revenue / float64(snap.Orders)
		salesInsights = append(salesInsights, fmt.Sprintf("متوسط قيمة الطلب: %s", egp(avgOrder)))
	}
	switch trendOf(snap.Revenue, snap.PrevRevenue) {
	case "up":
		salesInsights = append(salesInsights, "المبيعات في نمو — حافظ على نفس وتيرة العروض الحالية")
		salesRecs = append(salesRecs, "جرّب رفع ميزانية التسويق للمنتجات الأكثر مبيعاً")
	case "down":
		salesInsights = append(salesInsights, "المبيعات تراجعت مقارنة بالفترة السابقة")
		salesRecs = append(salesRecs, "أطلق عرضاً محدود الوقت لتحفيز الشراء", "كلم العملاء السابقين برسالة ترويجية")
	default:
		salesInsights = append(salesInsights, "المبيعات مستقرة خلال الفترتين")
		salesRecs = append(salesRecs, "أضف منتجات جديدة أو باقات لزيادة متوسط الطلب")
	}
	items = append(items, AnalysisItem{
		ID: "sales-30d", Type: "sales",
		Title:         "إجمالي المبيعات (آخر 30 يوم)",
		Description:   fmt.Sprintf("مقارنة بالفترة السابقة: %s → %s", egp(snap.PrevRevenue), egp(snap.Revenue)),
		Value:         math.Round(snap.Revenue*100) / 100,
		PreviousValue: math.Round(snap.PrevRevenue*100) / 100,
		Trend:         trendOf(snap.Revenue, snap.PrevRevenue),
		Insights:      salesInsights, Recommendations: salesRecs,
		LastUpdated: updated,
	})

	// ── Products ─────────────────────────────────────────────
	prodInsights := strList(
		fmt.Sprintf("قطع مباعة آخر 30 يوم: %d مقابل %d في الفترة السابقة", snap.UnitsSold, snap.PrevUnitsSold),
		fmt.Sprintf("منتجات نشطة: %d من أصل %d", snap.ActiveProducts, snap.TotalProducts),
	)
	if snap.LowStock > 0 {
		prodInsights = append(prodInsights, fmt.Sprintf("%d منتج قارب على نفاد المخزون (5 قطع أو أقل)", snap.LowStock))
	}
	items = append(items, AnalysisItem{
		ID: "products-30d", Type: "products",
		Title:         "القطع المباعة (آخر 30 يوم)",
		Description:   fmt.Sprintf("إجمالي الكميات المباعة عبر كل الطلبات الناجحة"),
		Value:         float64(snap.UnitsSold),
		PreviousValue: float64(snap.PrevUnitsSold),
		Trend:         trendOf(float64(snap.UnitsSold), float64(snap.PrevUnitsSold)),
		Insights:      prodInsights,
		Recommendations: strList(
			func() string {
				if snap.LowStock > 0 {
					return "أعد تعبئة مخزون المنتجات منخفضة الكمية قبل نفادها"
				}
				return "وسّع تشكيلة المنتجات الأكثر طلباً"
			}(),
		),
		LastUpdated: updated,
	})

	// ── Customers ────────────────────────────────────────────
	custInsights := strList(
		fmt.Sprintf("عملاء جدد آخر 30 يوم: %d مقابل %d في الفترة السابقة", snap.NewCustomers, snap.PrevNewCustomers),
	)
	custRecs := strList()
	if snap.NewCustomers == 0 && snap.Visits > 0 {
		custInsights = append(custInsights, "فيه زوار بس مفيش عملاء جدد سجلوا — المشكلة غالباً في خطوة التسجيل أو الثقة")
		custRecs = append(custRecs, "بسّط شاشة إنشاء الحساب ووضّح سياسة الاسترجاع")
	} else if snap.NewCustomers > snap.PrevNewCustomers {
		custRecs = append(custRecs, "فعّل برنامج الولاء لتحويل العملاء الجدد إلى عملاء دائمين")
	} else {
		custRecs = append(custRecs, "أرسل عرضاً خاصاً للعملاء اللي اشتروا قبل كده لكن رجعوش")
	}
	items = append(items, AnalysisItem{
		ID: "customers-30d", Type: "customers",
		Title:         "عملاء جدد (آخر 30 يوم)",
		Description:   "عدد العملاء المسجلين على متجرك",
		Value:         float64(snap.NewCustomers),
		PreviousValue: float64(snap.PrevNewCustomers),
		Trend:         trendOf(float64(snap.NewCustomers), float64(snap.PrevNewCustomers)),
		Insights:      custInsights, Recommendations: custRecs,
		LastUpdated: updated,
	})

	// ── Traffic ──────────────────────────────────────────────
	trafficInsights := strList(
		fmt.Sprintf("زيارات آخر 30 يوم: %d مقابل %d في الفترة السابقة", snap.Visits, snap.PrevVisits),
	)
	if snap.Visits > 0 && snap.Orders > 0 {
		conv := float64(snap.Orders) / float64(snap.Visits) * 100
		trafficInsights = append(trafficInsights, fmt.Sprintf("نسبة التحويل: %.1f%% من الزيارات تحولت لطلبات", conv))
	}
	items = append(items, AnalysisItem{
		ID: "traffic-30d", Type: "traffic",
		Title:         "زيارات المتجر (آخر 30 يوم)",
		Description:   "زيارات صفحات متجرك المسجلة في التحليلات",
		Value:         float64(snap.Visits),
		PreviousValue: float64(snap.PrevVisits),
		Trend:         trendOf(float64(snap.Visits), float64(snap.PrevVisits)),
		Insights:      trafficInsights,
		Recommendations: strList(
			func() string {
				if snap.Visits == 0 {
					return "شارك رابط متجرك على السوشيال ميديا لجذب أول موجة زوار"
				}
				if snap.Visits > 0 && float64(snap.Orders)/float64(snap.Visits)*100 < 2 {
					return "الزوار كتير بس التحويل قليل — راجع صور المنتجات وأسعارها"
				}
				return "ضاعف الإعلانات على المصادر اللي جابت أكتر زيارات"
			}(),
		),
		LastUpdated: updated,
	})

	return items, nil
}

// BuildInsights produces rule-based actionable insights for the shop.
func (s *Service) BuildInsights(ctx context.Context, shopID string) ([]Insight, error) {
	snap, err := s.repo.LoadSnapshot(ctx, shopID)
	if err != nil {
		return nil, err
	}
	created := nowRFC3339()
	insights := []Insight{}

	// 1) Revenue drop / growth.
	revPct := trendPct(snap.Revenue, snap.PrevRevenue)
	if snap.PrevRevenue > 0 && revPct <= -15 {
		insights = append(insights, Insight{
			ID: "ins-revenue-drop", Category: "sales",
			Title:       "تراجع في المبيعات يحتاج تدخل",
			Description: fmt.Sprintf("المبيعات نزلت %.0f%% مقارنة بالشهر اللي فات (%s → %s).", math.Abs(revPct), egp(snap.PrevRevenue), egp(snap.Revenue)),
			Impact:      "high", Confidence: 85,
			Actions:         strList("أطلق خصم 10-15% لأسبوع على الأكثر مبيعاً", "ابعت رسالة تذكير للعملاء اللي معاهم نقاط ولاء", "راجع أسعار الشحن لو الزبائن بيشكوا منها"),
			ExpectedOutcome: "استرجاع 50-70% من نسبة المبيعات السابقة خلال أسبوعين",
			CreatedAt:       created, Status: "new",
		})
	} else if revPct >= 15 {
		insights = append(insights, Insight{
			ID: "ins-revenue-growth", Category: "sales",
			Title:       "فرصة لتثبيت النمو",
			Description: fmt.Sprintf("المبيعات زادت %.0f%% عن الفترة السابقة — الزخم الحالي ممكن يتضاعف.", revPct),
			Impact:      "medium", Confidence: 75,
			Actions:         strList("زوّد مخزون الأصناف سريعة البيع", "اجعل العروض الناجحة عروضاً دائمة"),
			ExpectedOutcome: "الحفاظ على معدل النمو بدل ارتداد المبيعات للخلف",
			CreatedAt:       created, Status: "new",
		})
	}

	// 2) Low stock risk.
	if snap.LowStock > 0 {
		insights = append(insights, Insight{
			ID: "ins-low-stock", Category: "operations",
			Title:       "منتجات على وشك النفاد",
			Description: fmt.Sprintf("%d منتج من أصل %d باقي منه 5 قطع أو أقل — خطر خسارة مبيعات قريب.", snap.LowStock, snap.TotalProducts),
			Impact:      "high", Confidence: 90,
			Actions:         strList("افتح صفحة المخزون وأعد تعبئة الكميات", "فعّل إشعار النقص التلقائي لو مش مفعّل"),
			ExpectedOutcome: "تفادي توقف البيع على الأصناف الأكثر طلباً",
			CreatedAt:       created, Status: "new",
		})
	}

	// 3) Conversion problem: visits without orders.
	if snap.Visits >= 50 && snap.Orders == 0 {
		insights = append(insights, Insight{
			ID: "ins-no-conversion", Category: "customers",
			Title:       "زوار بدون طلبات",
			Description: fmt.Sprintf("استقبلت %d زيارة آخر 30 يوم بدون أي طلب — المشكلة في جاذبية الصفحة أو الأسعار.", snap.Visits),
			Impact:      "high", Confidence: 80,
			Actions:         strList("حدّث صور المنتجات الرئيسية بصور احترافية", "أضف وصفاً واضحاً وسعر تنافسي لأهم 5 منتجات", "وضّح سياسة الدفع عند الاستلام إن وجدت"),
			ExpectedOutcome: "أول طلبات حقيقية من الزوار الحاليين خلال أسبوع",
			CreatedAt:       created, Status: "new",
		})
	}

	// 4) SEO/content quality.
	if snap.NoDescProducts > 0 || snap.NoImageProducts > 0 {
		parts := []string{}
		if snap.NoDescProducts > 0 {
			parts = append(parts, fmt.Sprintf("%d منتج بدون وصف", snap.NoDescProducts))
		}
		if snap.NoImageProducts > 0 {
			parts = append(parts, fmt.Sprintf("%d منتج بدون صورة", snap.NoImageProducts))
		}
		insights = append(insights, Insight{
			ID: "ins-content-quality", Category: "products",
			Title:       "محتوى منتجات ناقص بيأثر على الظهور",
			Description: fmt.Sprintf("عندك %s — المنتجات دي بتظهر أقل في البحث وبتفقد ثقة العميل.", joinArabic(parts)),
			Impact:      "medium", Confidence: 85,
			Actions:         strList("أكمل وصف كل منتج بسطرين على الأقل", "أضف صورة رئيسية لكل منتج"),
			ExpectedOutcome: "تحسين ترتيب المنتجات في البحث الداخلي ورفع الثقة",
			CreatedAt:       created, Status: "new",
		})
	}

	// 5) Always provide at least one insight so the page is useful.
	if len(insights) == 0 {
		insights = append(insights, Insight{
			ID: "ins-all-good", Category: "operations",
			Title:       "متجرك في حالة مستقرة",
			Description: "مفيش مشاكل عاجلة خلال آخر 30 يوم. أفضل خطوة جاية: زيادة التعرض والتسويق.",
			Impact:      "low", Confidence: 70,
			Actions:         strList("شارك رابط المتجر على صفحات السوشيال ميديا", "جرّب إضافة عرض جديد يشد العملاء الراجعين"),
			ExpectedOutcome: "نمو تدريجي في الزيارات والطلبات",
			CreatedAt:       created, Status: "new",
		})
	}

	return insights, nil
}

func joinArabic(parts []string) string {
	out := ""
	for i, p := range parts {
		if i > 0 {
			if i == len(parts)-1 {
				out += " و"
			} else {
				out += "، "
			}
		}
		out += p
	}
	return out
}

// BuildSEOAudit audits the shop profile and up to 100 products.
func (s *Service) BuildSEOAudit(ctx context.Context, shopID string) ([]SEOItem, error) {
	snap, err := s.repo.LoadSnapshot(ctx, shopID)
	if err != nil {
		return nil, err
	}
	updated := nowRFC3339()
	items := []SEOItem{}

	// ── Shop home page audit ─────────────────────────────────
	homeIssues, homeSuggestions := []string{}, []string{}
	score := 100.0
	if snap.Slug == "" {
		homeIssues = append(homeIssues, "المتجر بدون رابط (slug) خاص")
		homeSuggestions = append(homeSuggestions, "حدد رابطاً لاتينياً قصيراً للمتجر")
		score -= 20
	}
	if len([]rune(snap.Description)) < 80 {
		homeIssues = append(homeIssues, "وصف المتجر قصير أو فارغ")
		homeSuggestions = append(homeSuggestions, "اكتب وصفاً من 80 حرفاً فأكثر يشرح ماذا تبيع ولماذا أنت الأفضل")
		score -= 20
	}
	if snap.LogoURL == "" {
		homeIssues = append(homeIssues, "لا يوجد شعار (logo) للمتجر")
		homeSuggestions = append(homeSuggestions, "أضف شعاراً واضحاً — يظهر في نتائج البحث والمشاركات")
		score -= 15
	}
	if snap.BannerURL == "" {
		homeIssues = append(homeIssues, "لا توجد صورة غلاف (banner)")
		homeSuggestions = append(homeSuggestions, "أضف صورة غلاف احترافية تعرض هوية المتجر")
		score -= 10
	}
	if snap.Phone == "" {
		homeIssues = append(homeIssues, "لا يوجد رقم هاتف تواصل")
		homeSuggestions = append(homeSuggestions, "أضف رقم واتساب أو هاتف — بيزود ثقة العميل وبيظهر في نتائج البحث المحلي")
		score -= 10
	}
	if snap.PublishedAt == nil || *snap.PublishedAt == "" {
		homeIssues = append(homeIssues, "الموقع غير منشور بعد (draft)")
		homeSuggestions = append(homeSuggestions, "انشر موقعك من الـ website builder عشان محركات البحث تشوفه")
		score -= 25
	}
	if score < 0 {
		score = 0
	}
	items = append(items, SEOItem{
		ID: "seo-shop-home", Type: "page",
		Title:       "الصفحة الرئيسية للمتجر",
		URL:         "/" + snap.Slug,
		Keywords:    strList(snap.ShopName, snap.Slug),
		Description: snap.Description,
		Score:       score, Issues: homeIssues, Suggestions: homeSuggestions,
		LastUpdated: updated,
		Status:      seoStatus(score),
	})

	// ── Products audit ───────────────────────────────────────
	for _, p := range snap.ProductRows {
		pScore := 100.0
		issues, suggestions := []string{}, []string{}
		if len([]rune(p.Description)) < 50 {
			issues = append(issues, "الوصف قصير أو فارغ")
			suggestions = append(suggestions, "اكتب وصفاً 50 حرفاً فأكثر يشمل الفوائد والمواصفات")
			pScore -= 25
		}
		if p.ImageURL == "" {
			issues = append(issues, "لا توجد صورة للمنتج")
			suggestions = append(suggestions, "أضف صورة واضحة بخلفية نظيفة")
			pScore -= 25
		}
		if p.Category == "" {
			issues = append(issues, "المنتج بدون تصنيف")
			suggestions = append(suggestions, "حدد تصنيفاً مناسب ليظهر المنتج في تصفح الأقسام")
			pScore -= 15
		}
		if len([]rune(p.Name)) < 10 {
			issues = append(issues, "اسم المنتج قصير جداً")
			suggestions = append(suggestions, "اجعل الاسم وصفياً أكثر (نوع + ماركة + مواصفة)")
			pScore -= 10
		}
		if pScore < 0 {
			pScore = 0
		}
		items = append(items, SEOItem{
			ID: "seo-product-" + p.ID, Type: "product",
			Title:       p.Name,
			URL:         "/" + snap.Slug + "/products/" + p.ID,
			Keywords:    strList(p.Name, p.Category),
			Description: p.Description,
			Score:       pScore, Issues: issues, Suggestions: suggestions,
			LastUpdated: updated,
			Status:      seoStatus(pScore),
		})
	}

	return items, nil
}

func seoStatus(score float64) string {
	switch {
	case score >= 80:
		return "optimized"
	case score >= 50:
		return "needs_improvement"
	default:
		return "critical"
	}
}

// ListImages returns the shop's generated images. Image generation itself
// requires an external provider key; until one is configured the list is
// honestly empty.
func (s *Service) ListImages(ctx context.Context, shopID string) ([]map[string]any, error) {
	return []map[string]any{}, nil
}

// ListAutomations returns the shop's automations. The automation engine is
// not shipped yet, so the list is honestly empty.
func (s *Service) ListAutomations(ctx context.Context, shopID string) ([]map[string]any, error) {
	return []map[string]any{}, nil
}
