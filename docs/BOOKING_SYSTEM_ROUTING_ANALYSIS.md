# Booking System Routing Analysis

> ⚠️ أرشيف تاريخي: يصف إصلاحات على باك NestJS المتقاعد (حُذف 2026-08-24). المرجع الحالي هو `gobackend/` (Go/Fiber).

## Executive Summary

This document analyzes the booking system routing confusion in the Ray application and documents the fixes implemented to consolidate all booking functionality under the main merchant dashboard.

## Problem Statement

The application had a confusing routing structure where booking functionality was split between:
1. `/business/dashboard` - Main merchant dashboard with tab-based navigation
2. `/business/bookings` - Separate booking system route (referenced but not properly defined in AppRoutes)

This caused:
- Navigation confusion for users
- Inconsistent routing patterns
- Redundaiculty in maintaining booking-related features

## Analysis Findings

### 1. Route Structure

**AppRoutes.tsx Analysis:**
- No `/business/bookings` route defined
- All business routes go through `/business` with BusinessLayout
- Main dashboard is at `/business/dashboard`

**BusinessLayout.tsx Issues Found:**
- Line 6nt code paths
- Diff1: `location.pathname.includes('/business/bookings')` in isDashboard check
- Line 91: `'bookings'` included in bookingActivities array
- Lines 126-131: `isBookingSettingsTab` check for `/business/bookings` path

These references were vestigial code from an earlier design that was never fully implemented.

### 2. Tab-Based Navigation

**MerchantDashboardPage.tsx:**
- Uses query parameter `?tab=` for navigation
- Supports tabs: overview, notifications, products, reservations, providers, services, activityRooms, activityPatients, etc.
- For SERVICE category, renders booking-specific pages
- For other categories, also supports booking-related tabs

**dashboardTabs.ts:**
- Defines all available tabs
- Maps tabs to shop categories
- Provides dynamic labels based on activity type

### 3. Activity Type System

**bookings/config.ts:**
- Defines 12 booking activity types (clinic, salon_barber, wellness_spa, etc.)
- Each activity has specific modules and buttons
- Activity type is passed via `?activity=` query parameter

**activities/index.ts:**
- Maps shop categories to booking activity types
- Defines activity-specific features and tabs

## Fixes Implemented

### 1. Removed `/business/bookings` References from BusinessLayout

**File:** `src/shared/components/layouts/BusinessLayout.tsx`

**Changes:**
```typescript
// BEFORE (Line 58-62)
const isDashboard =
  location.pathname.includes('/dashboard') ||
  location.pathname.includes('/profile') ||
  location.pathname.includes('/business/bookings') ||  // ❌ Removed
  ['clinic', 'salon', 'spa', ...].some(act => location.pathname.includes(`/business/${act}`));

// AFTER
const isDashboard =
  location.pathname.includes('/dashboard') ||
  location.pathname.includes('/profile') ||
  ['clinic', 'salon', 'spa', ...].some(act => location.pathname.includes(`/business/${act}`));
```

```typescript
// BEFORE (Line 90-104)
const bookingActivities = useMemo(() => [
  'bookings',  // ❌ Removed
  'clinic',
  'salon',
  ...
], []);

// AFTER
const bookingActivities = useMemo(() => [
  'clinic',
  'salon',
  ...
], []);
```

```typescript
// BEFORE (Lines 126-131)
const isBookingSettingsTab = useMemo(() => {
  if (location.pathname !== '/business/bookings') return false;  // ❌ Removed
  const tab = searchParams.get('tab');
  const settingPage = searchParams.get('settingPage');
  return tab === 'settings' || Boolean(settingPage);
}, [location.pathname, searchParams]);

// AFTER
// Entire block removed - not needed
```

### 2. Verified Booking Functionality Integration

All booking functionality is now properly accessible through:
- `/business/dashboard?tab=reservations` - Main bookings view
- `/business/dashboard?tab=providers` - Service providers
- `/business/dashboard?tab=services` - Services list
- `/business/dashboard?tab=activityRooms` - Activity rooms/units
- `/business/dashboard?tab=activityPatients` - Patient/customer files
- `/business/dashboard?tab=overview` - Overview with booking stats
- `/business/dashboard?tab=settings&settingsTab=booking_settings` - Booking settings

Activity type is specified via:
- `/business/dashboard?tab=reservations&activity=clinic`
- `/business/dashboard?tab=reservations&activity=salon_barber`
- etc.

## Current Architecture

### Navigation Flow

```
User navigates to /business/dashboard
    ↓
BusinessLayout renders sidebar with tabs
    ↓
User clicks on "الحجوزات" (Reservations) tab
    ↓
URL updates to /business/dashboard?tab=reservations
    ↓
MerchantDashboardPage renders BookingBookingsPage
    ↓
Activity type determined from:
  1. URL parameter ?activity=
  2. Shop's pageDesign.bookingActivityType
  3. Default: 'clinic'
```

### Tab Visibility Rules

Tabs are shown based on:
1. Shop category (SERVICE, RESTAURANT, FASHION, etc.)
2. Shop's layoutConfig.enabledModules
3. Activity-specific requirements

**SERVICE Category:**
- overview, reservations, builder, settings (core tabs)
- providers, services, activityRooms, activityPatients (booking tabs)

**Other Categories:**
- All core tabs (overview, products, sales, etc.)
- reservations (booking tab)
- providers, services, activityRooms, activityPatients (if applicable)

### Activity Type Mapping

| Shop Category | Default Activity Type |
|--------------|----------------------|
| RESTAURANT   | restaurants_tables    |
| SERVICE      | clinic                |
| FASHION      | salon_barber          |
| RETAIL       | general_appointments  |
| ELECTRONICS  | general_appointments  |
| HEALTH       | clinic                |
| HOTEL        | hotels_rooms          |
| CAFE         | restaurants_tables    |

## Recommendations

### 1. URL Structure Consistency

Consider standardizing the URL structure:
```
/business/dashboard?tab=reservations&activity=clinic
```

This is already the pattern used and should be maintained.

### 2. Activity Type Selection

The dev activity switcher in BusinessLayout (lines 1358-1415) allows switching between booking activities. This is good for development but should be hidden in production.

### 3. Tab Organization

The current tab organization in BusinessLayout sidebar (lines 351-391) groups tabs logically:
- Dashboard section
- Booking activity section (إدارة نشاط الحجوزات)
- Operations section
- Sales section
- Growth section
- Setup section

This organization is clear and should be maintained.

### 4. Missing Activity Pages

Some activity pages are imported but may not be fully implemented:
- ActivityPackagesPage
- ActivitySeasonsPage
- ActivityPoliciesPage
- ActivityAvailabilityPage
- ActivityCapacityPage
- ActivityRequestsPage
- ActivityTicketsPage
- ActivitySchedulePage
- ActivityInsurancePage
- ActivityLocationsPage
- ActivitySubscriptionsPage
- ActivityLevelsPage
- ActivityZonesPage
- ActivityFeesPage

These are defined in ACTIVITY_ROUTE_PAGE_MAP (lines 83-103) but not all are used in the renderContent switch statement.

### 5. Documentation

Consider adding inline documentation for:
- How new booking activities should be added
- How to map shop categories to activity types
- How to add new activity-specific pages

## Testing Checklist

- [ ] Navigate to `/business/dashboard?tab=reservations` - should show bookings
- [ ] Navigate to `/business/dashboard?tab=providers` - should show providers
- [ ] Navigate to `/business/dashboard?tab=services` - should show services
- [ ] Navigate to `/business/dashboard?tab=activityRooms` - should show rooms
- [ ] Navigate to `/business/dashboard?tab=activityPatients` - should show patients
- [ ] Switch activity type via dev switcher - should update UI
- [ ] Verify sidebar navigation works correctly
- [ ] Verify URL parameters are preserved during navigation
- [ ] Test with different shop categories

## Conclusion

The booking system routing has been successfully consolidated under the main merchant dashboard. All vestigial references to `/business/bookings` have been removed, and the tab-based navigation provides a clear and consistent user experience.

The current architecture is:
- ✅ Single entry point: `/business/dashboard`
- ✅ Tab-based navigation with query parameters
- ✅ Activity type support via URL parameters
- ✅ Category-specific tab visibility
- ✅ Clear separation of concerns

No further routing changes are needed. Future work should focus on:
1. Implementing missing activity pages
2. Improving activity type selection UX
3. Adding comprehensive documentation