//gen: standalone tool — run with: go run tools/genicon.go <logo.png> <out.ico> [out-appicon.png]
// Wraps a square-rendered 256x256 PNG into a Windows .ico (PNG-compressed entry).
package main

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"image"
	"image/draw"
	// jpeg+png decoders (file extensions lie)
	_ "image/jpeg"
	"image/png"
	"os"
)

func main() {
	if len(os.Args) < 3 {
		fmt.Println("usage: genicon <logo.png> <out.ico> [out-appicon.png]")
		os.Exit(1)
	}
	src, err := os.ReadFile(os.Args[1])
	must(err)
	img, _, err := image.Decode(bytes.NewReader(src))
	must(err)

	size := 256
	dst := image.NewNRGBA(image.Rect(0, 0, size, size))
	// scale to fit, center on transparent square
	b := img.Bounds()
	scale := float64(size) / float64(max(b.Dx(), b.Dy()))
	nw := int(float64(b.Dx()) * scale)
	nh := int(float64(b.Dy()) * scale)
	scaled := image.NewNRGBA(image.Rect(0, 0, nw, nh))
	scaleNearest(scaled, img)
	draw.Draw(dst, image.Rect((size-nw)/2, (size-nh)/2, (size-nw)/2+nw, (size-nh)/2+nh),
		scaled, image.Point{0, 0}, draw.Src)

	var pngBuf bytes.Buffer
	must(png.Encode(&pngBuf, dst))

	// ICO: ICONDIR(6) + ICONDIRENTRY(16) + PNG data
	var ico bytes.Buffer
	binary.Write(&ico, binary.LittleEndian, uint16(0)) // reserved
	binary.Write(&ico, binary.LittleEndian, uint16(1)) // type icon
	binary.Write(&ico, binary.LittleEndian, uint16(1)) // count
	ico.WriteByte(0)                                   // width 256
	ico.WriteByte(0)                                   // height 256
	ico.WriteByte(0)                                   // palette
	ico.WriteByte(0)                                   // reserved
	binary.Write(&ico, binary.LittleEndian, uint16(1)) // planes
	binary.Write(&ico, binary.LittleEndian, uint16(32))
	binary.Write(&ico, binary.LittleEndian, uint32(pngBuf.Len()))
	binary.Write(&ico, binary.LittleEndian, uint32(22)) // data offset
	ico.Write(pngBuf.Bytes())

	must(os.WriteFile(os.Args[2], ico.Bytes(), 0o644))
	if len(os.Args) > 3 {
		must(os.WriteFile(os.Args[3], pngBuf.Bytes(), 0o644))
	}
	fmt.Println("icon written:", os.Args[2])
}

func scaleNearest(dst *image.NRGBA, src image.Image) {
	sb := src.Bounds()
	db := dst.Bounds()
	for y := db.Min.Y; y < db.Max.Y; y++ {
		sy := sb.Min.Y + (y-db.Min.Y)*sb.Dy()/db.Dy()
		for x := db.Min.X; x < db.Max.X; x++ {
			sx := sb.Min.X + (x-db.Min.X)*sb.Dx()/db.Dx()
			dst.Set(x, y, src.At(sx, sy))
		}
	}
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func must(err error) {
	if err != nil {
		panic(err)
	}
}
