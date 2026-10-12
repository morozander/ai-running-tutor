import cn from "@/lib/cn/cn"

test("should merge classNames", () => {
  expect(cn("a", "b", "c")).toBe("a b c")
})
