---
name: nimo-principle-test-behavior-not-implementation
description: "编写、修改或保留测试时使用。按真实调用方使用代码的方式执行，并对用户可观察结果断言具体期望值；如果所有导入函数都返回 undefined 测试仍能通过，就重写断言或删除测试。"
---

# 测试行为，不测试实现细节

## 适用

编写新测试、修改已有测试，或决定一个测试是否值得保留时使用。

测试应当像真实调用方一样调用被测代码，并对调用方最终能观察到的结果做明确断言。只验证内部调用关系、重复代码里的常量，或检查“没有报错”，都不足以证明行为正确。

## 快速检查

保留一个测试前，问：**如果这个测试导入的所有函数都返回 `undefined`，它还会通过吗？**

如果答案是会，这个测试没有观察到有效行为，遇到真实缺陷也可能无法失败。重写断言；找不到有效断言时删除测试。

## 常见无效形态

- **没有有效结果断言。** 只有 `toBeDefined`、`toBeTruthy`、`not.toThrow`、`toBeInstanceOf`、`toBeGreaterThan(0)` 等弱断言。
- **只检查 mock 或“没有发生”。** 只断言 `toHaveBeenCalled`、`not.toHaveBeenCalled`、`toBeUndefined`、空数组或“不等于错误值”。
- **自我引用。** 期望值仍由被测代码或同一套实现逻辑计算，例如 `expect(f(a)).toBe(f(a))`。
- **固定常量。** 只把实现里的常量、配置默认值、表格内容或提示词原样写进断言。
- **夹具验证夹具。** 断言只读取测试自己构造的数据，而测试主体实际上没有在测试体里执行。

## 正确做法

给被测主体一个具体输入，断言具体输出或可观察副作用，例如：

```ts
expect(slugify("Hello, World!")).toBe("hello-world")
```

验证“某个结果不存在”时，同时给出另一个输入证明它在应当存在时确实存在。使用 mock 时，优先断言传入的有效载荷或调用之后形成的真实状态，而不是只验证“被调用过”。

关系约束测试仍然有价值，例如验证两张表之间的引用完整性；编译期类型测试也不受上面的运行时 `undefined` 检查方式限制。

## 为什么存在

一个无法因为真实缺陷而失败的测试，只会消耗 CI 时间和评审注意力。一个只钉住常量的测试甚至会阻止正常修改，却仍没有验证用户行为。

## 应用证据

读取本文件后，指出测试模拟的真实调用方式、具体可观察结果，以及它能够捕获的缺陷。若测试只保护内部实现细节，应重写或删除，而不是声称已应用本原则。

来源：[pstack test-behavior-not-implementation](https://github.com/cursor/plugins/blob/f5bdd6826fd0a0d9cbc4347134c3a74a200b9d9d/pstack/skills/principle-test-behavior-not-implementation/SKILL.md)。
