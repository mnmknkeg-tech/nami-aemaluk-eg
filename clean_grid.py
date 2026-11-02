import pathlib
p = pathlib.Path("apps/dashboard-web/src/components/website-builder/components/canvas/renderers/CardGridRenderer.tsx")
lines = p.read_text(encoding="utf-8").splitlines()
# keep everything up to the closing of the unified grid (line index 311 => line 312)
head = lines[:312]
tail = ["", "            {renderChildren()}", "          </div>", "        </section>", "      );", "    }", "", "    default:", "      return null;", "  }", "};", ""]
p.write_text("\n".join(head + tail), encoding="utf-8")
print("cleaned", len(lines), "->", len(head + tail))
