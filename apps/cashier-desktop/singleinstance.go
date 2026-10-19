//go:build !bindings

package main

import (
	"log"
	"syscall"

	win32 "golang.org/x/sys/windows"
)

// keepLock holds the single-instance mutex handle for the process lifetime;
// Windows releases it automatically when the process exits.
var keepLock win32.Handle

// acquireSingleInstanceLock prevents two copies running at once — two
// instances sharing the WebView2 profile produce a white screen. Skipped
// during wails binding generation (build tag 'bindings').
func acquireSingleInstanceLock() {
	namePtr, _ := win32.UTF16PtrFromString("Global\\ray-cashier-desktop-single-instance")
	h, err := win32.CreateMutex(nil, false, namePtr)
	if err == syscall.Errno(183) { // ERROR_ALREADY_EXISTS
		log.Fatal("الكاشير شغال بالفعل — استخدم النسخة المفتوحة")
	}
	keepLock = h
}
