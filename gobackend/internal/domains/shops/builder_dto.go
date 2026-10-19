package shops

import "time"

// BuilderConfig represents the full builder configuration for a shop.
type BuilderConfig struct {
	ActivityType               string            `json:"activityType"`
	Website                    map[string]any    `json:"website,omitempty"`
	PrimaryColor               string            `json:"primaryColor,omitempty"`
	SecondaryColor             string            `json:"secondaryColor,omitempty"`
	Layout                     string            `json:"layout,omitempty"`
	BannerURL                  string            `json:"bannerUrl,omitempty"`
	BannerPosX                 int               `json:"bannerPosX,omitempty"`
	BannerPosY                 int               `json:"bannerPosY,omitempty"`
	HeaderType                 string            `json:"headerType,omitempty"`
	HeaderBackgroundColor      string            `json:"headerBackgroundColor,omitempty"`
	HeaderBackgroundImageUrl   string            `json:"headerBackgroundImageUrl,omitempty"`
	HeaderTextColor            string            `json:"headerTextColor,omitempty"`
	HeaderTransparent          bool              `json:"headerTransparent,omitempty"`
	HeaderOverlayBanner        bool              `json:"headerOverlayBanner,omitempty"`
	HeaderOpacity              int               `json:"headerOpacity,omitempty"`
	PageBackgroundColor        string            `json:"pageBackgroundColor,omitempty"`
	BackgroundImageUrl         string            `json:"backgroundImageUrl,omitempty"`
	HomeLayoutMode             string            `json:"homeLayoutMode,omitempty"`
	HomeRightAdTitle           string            `json:"homeRightAdTitle,omitempty"`
	HomeLeftAdTitle            string            `json:"homeLeftAdTitle,omitempty"`
	HomeIntroText              string            `json:"homeIntroText,omitempty"`
	HomeStoryText              string            `json:"homeStoryText,omitempty"`
	BannerSize                 string            `json:"bannerSize,omitempty"`
	BannerTitle                string            `json:"bannerTitle,omitempty"`
	BannerSubtitle             string            `json:"bannerSubtitle,omitempty"`
	BannerTextPosition         string            `json:"bannerTextPosition,omitempty"`
	ProductDisplay             string            `json:"productDisplay,omitempty"`
	ProductsLayout             string            `json:"productsLayout,omitempty"`
	ImageAspectRatio           string            `json:"imageAspectRatio,omitempty"`
	RowsConfig                 []RowConfig       `json:"rowsConfig,omitempty"`
	ProductCardOverlayBgColor  string            `json:"productCardOverlayBgColor,omitempty"`
	ProductCardOverlayOpacity  int               `json:"productCardOverlayOpacity,omitempty"`
	ProductCardTitleColor      string            `json:"productCardTitleColor,omitempty"`
	ProductCardPriceColor      string            `json:"productCardPriceColor,omitempty"`
	CategoryIconShape          string            `json:"categoryIconShape,omitempty"`
	CategoryIconSize           string            `json:"categoryIconSize,omitempty"`
	ShowProductsInCategories   bool              `json:"showProductsInCategories,omitempty"`
	CategoryIconImage          string            `json:"categoryIconImage,omitempty"`
	CategoryImages             map[string]string `json:"categoryImages,omitempty"`
	HeadingSize                string            `json:"headingSize,omitempty"`
	TextSize                   string            `json:"textSize,omitempty"`
	FontWeight                 string            `json:"fontWeight,omitempty"`
	ButtonShape                string            `json:"buttonShape,omitempty"`
	ButtonPadding              string            `json:"buttonPadding,omitempty"`
	ButtonPreset               string            `json:"buttonPreset,omitempty"`
	ButtonHover                string            `json:"buttonHover,omitempty"`
	FooterBackgroundColor      string            `json:"footerBackgroundColor,omitempty"`
	FooterTextColor            string            `json:"footerTextColor,omitempty"`
	FooterTransparent          bool              `json:"footerTransparent,omitempty"`
	FooterOpacity              int               `json:"footerOpacity,omitempty"`
	PagePadding                string            `json:"pagePadding,omitempty"`
	ItemGap                    string            `json:"itemGap,omitempty"`
	CustomCss                  string            `json:"customCss,omitempty"`
	ElementsVisibility         map[string]bool   `json:"elementsVisibility,omitempty"`
	ProductEditorVisibility    map[string]bool   `json:"productEditorVisibility,omitempty"`
	ImageMapVisibility         map[string]bool   `json:"imageMapVisibility,omitempty"`
	NavIcons                   map[string]string `json:"navIcons,omitempty"`
	ProductPageMode            string            `json:"productPageMode,omitempty"`
	ProductPageBackgroundColor string            `json:"productPageBackgroundColor,omitempty"`
	ProductPageTextColor       string            `json:"productPageTextColor,omitempty"`
	ProductPagePriceColor      string            `json:"productPagePriceColor,omitempty"`
	ProductPageButtonColor     string            `json:"productPageButtonColor,omitempty"`
	LandingPage                map[string]any    `json:"landingPage,omitempty"`
	CustomPages                []CustomPage      `json:"customPages,omitempty"`
	QuickTheme                 string            `json:"quickTheme,omitempty"`
	SelectedTheme              string            `json:"selectedTheme,omitempty"`
	HomePageName               string            `json:"homePageName,omitempty"`
	AllProductsPageName        string            `json:"allProductsPageName,omitempty"`
	Surface                    string            `json:"surface,omitempty"`
	Commercial                 map[string]any    `json:"commercial,omitempty"`
	Reservations               map[string]any    `json:"reservations,omitempty"`
	ClinicLayout               string            `json:"clinicLayout,omitempty"`
	BookingProviders           map[string]any    `json:"bookingProviders,omitempty"`
	BookingServices            map[string]any    `json:"bookingServices,omitempty"`
	BookingSlots               map[string]any    `json:"bookingSlots,omitempty"`
	Theme                      *ThemeConfig      `json:"theme,omitempty"`
	Colors                     *ColorsConfig     `json:"colors,omitempty"`
	Typography                 *TypographyConfig `json:"typography,omitempty"`
	LayoutConfig               *LayoutConfig     `json:"layoutConfig,omitempty"`
	CreatedAt                  time.Time         `json:"createdAt,omitempty"`
	UpdatedAt                  time.Time         `json:"updatedAt,omitempty"`
}

// RowConfig represents configuration for a product row.
type RowConfig struct {
	ID              string   `json:"id"`
	ImageShape      string   `json:"imageShape"`
	DisplayMode     string   `json:"displayMode"`
	ItemsPerRow     int      `json:"itemsPerRow"`
	RowMode         string   `json:"rowMode,omitempty"`
	LayoutDirection string   `json:"layoutDirection,omitempty"`
	ShowArrows      bool     `json:"showArrows,omitempty"`
	ProductNames    []string `json:"productNames,omitempty"`
	ScheduleStartAt string   `json:"scheduleStartAt,omitempty"`
	ScheduleEndAt   string   `json:"scheduleEndAt,omitempty"`
	SortMode        string   `json:"sortMode,omitempty"`
	HideOutOfStock  bool     `json:"hideOutOfStock,omitempty"`
}

// CustomPage represents a custom page configuration.
type CustomPage struct {
	ID        string    `json:"id"`
	Title     string    `json:"title"`
	Slug      string    `json:"slug"`
	Content   string    `json:"content"`
	IsActive  bool      `json:"isActive"`
	CreatedAt time.Time `json:"createdAt,omitempty"`
	UpdatedAt time.Time `json:"updatedAt,omitempty"`
}

// ThemeConfig represents theme configuration.
type ThemeConfig struct {
	ID             string         `json:"id"`
	Name           string         `json:"name"`
	Variant        string         `json:"variant"`
	CustomSettings map[string]any `json:"customSettings,omitempty"`
}

// ColorsConfig represents colors configuration.
type ColorsConfig struct {
	Primary    string     `json:"primary"`
	Secondary  string     `json:"secondary"`
	Accent     string     `json:"accent"`
	Background string     `json:"background"`
	Surface    string     `json:"surface"`
	Text       TextColors `json:"text"`
	Success    string     `json:"success"`
	Warning    string     `json:"warning"`
	Error      string     `json:"error"`
}

// TextColors represents text color configuration.
type TextColors struct {
	Primary   string `json:"primary"`
	Secondary string `json:"secondary"`
	Disabled  string `json:"disabled"`
}

// TypographyConfig represents typography configuration.
type TypographyConfig struct {
	FontFamily FontFamilyConfig `json:"fontFamily"`
	FontSize   FontSizeConfig   `json:"fontSize"`
	FontWeight FontWeights      `json:"fontWeight"`
}

// FontFamilyConfig represents font family configuration.
type FontFamilyConfig struct {
	Heading string `json:"heading"`
	Body    string `json:"body"`
	Arabic  string `json:"arabic"`
}

// FontSizeConfig represents font size configuration.
type FontSizeConfig struct {
	XS   string `json:"xs"`
	SM   string `json:"sm"`
	Base string `json:"base"`
	LG   string `json:"lg"`
	XL   string `json:"xl"`
	XL2  string `json:"2xl"`
	XL3  string `json:"3xl"`
	XL4  string `json:"4xl"`
}

// FontWeights represents font weight configuration.
type FontWeights struct {
	Light     int `json:"light"`
	Normal    int `json:"normal"`
	Medium    int `json:"medium"`
	Semibold  int `json:"semibold"`
	Bold      int `json:"bold"`
	Extrabold int `json:"extrabold"`
}

// LayoutConfig represents layout configuration.
type LayoutConfig struct {
	ContainerWidth string             `json:"containerWidth"`
	Spacing        SpacingConfig      `json:"spacing"`
	BorderRadius   BorderRadiusConfig `json:"borderRadius"`
	Header         HeaderConfig       `json:"header"`
	Footer         FooterConfig       `json:"footer"`
}

// SpacingConfig represents spacing configuration.
type SpacingConfig struct {
	XS  string `json:"xs"`
	SM  string `json:"sm"`
	MD  string `json:"md"`
	LG  string `json:"lg"`
	XL  string `json:"xl"`
	XL2 string `json:"2xl"`
}

// BorderRadiusConfig represents border radius configuration.
type BorderRadiusConfig struct {
	SM   string `json:"sm"`
	MD   string `json:"md"`
	LG   string `json:"lg"`
	XL   string `json:"xl"`
	XL2  string `json:"2xl"`
	Full string `json:"full"`
}

// HeaderConfig represents header configuration.
type HeaderConfig struct {
	Height      string `json:"height"`
	Position    string `json:"position"`
	Transparent bool   `json:"transparent"`
}

// FooterConfig represents footer configuration.
type FooterConfig struct {
	Position    string `json:"position"`
	Transparent bool   `json:"transparent"`
}

// GetBuilderConfigRequest represents the request to get builder config.
type GetBuilderConfigRequest struct {
	ShopID string `params:"shopId" validate:"required"`
}

// UpdateBuilderConfigRequest represents the request to update builder config.
type UpdateBuilderConfigRequest struct {
	ShopID string        `json:"-" params:"shopId" validate:"required"`
	Config BuilderConfig `json:"config" validate:"required"`
}

// PublishBuilderConfigRequest represents the request to publish builder config.
type PublishBuilderConfigRequest struct {
	ShopID string `json:"-" params:"shopId" validate:"required"`
}
