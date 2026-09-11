---
name: nimo-principle-type-system-discipline
description: "设计类型、审查函数签名或在任何静态类型语言中写代码时使用。让非法状态不可表示、给语义基元打标、在边界解析外部数据、拒绝向编译器撒谎、穷尽变体、从权威 schema 派生。"
---

# 类型系统纪律

类型检查器是证明助手。用它把不可能状态、不匹配的基元和未处理的变体在编译期消灭。一个类型放你过关的分支，就是编译器本可拦下的运行时故障。优先把错误和特殊情况定义出存在，而不是增殖处理器；不可表示状态、全函数和接口重设计（下列模式）就是工具。

适用于任何静态类型语言。宿主或项目提供的语言最佳实践 Skill 可以把它落到具体语法。

## 适用

设计类型、审查函数签名、在任何静态类型语言中写代码时；外部数据进入类型化代码的边界。

## 模式

- **让非法状态不可表示。** 把变体建模为和类型：TypeScript 的可辨识联合、Rust/Swift/Kotlin 的带载荷枚举、Scala 的密封类、Haskell/OCaml 的 ADT。不要把状态建模成一袋可选字段，让矛盾组合也能编译。值得点名的反模式：`{ completed: boolean; completedAt?: Date }` 放行了 `completed: true; completedAt: undefined`，这是无意义组合。从单一来源派生布尔（如 `completedAt !== null`），或把变体显式建模为 `{ kind: 'open' } | { kind: 'done'; at: Date }`。如果一个 bug 逼你问出"等等，这种组合真的会发生吗？"，说明类型太松。
- **类型是构造，不是限制。** 从你想要的值出发构建类型，而不是从更松的类型上靠检查往回刻。看似需要精化类型的不变量，通常离一个构造只差一步：非空列表是"头 + 尾"，不是"带长度检查的列表"；有效时间段是"起点 + 时长"，不是"两个必须人为保持先后次序的时间戳"。没有哪种表示天生特权：成对的列表按那种解释就是偶数长度的列表，所以要选无法构造出非法值的形状，再在其上暴露调用方需要的接口。
- **给语义基元打标。** `UserId` 和 `OrderId` 底下都是字符串，但不应可互换。Rust 的 newtype、Swift 的不透明类型、Kotlin 的 value class、Haskell 的 phantom 类型、TypeScript 的品牌交叉类型。在创建处验证一次，下游直接信任类型。
- **外部数据在解析前无类型。** RPC 载荷、JSON、IPC 消息、CLI 参数、配置文件、环境变量、数据库行。每个边界都要有解析函数，把非结构化输入转成类型化模型。验证放在哪里，见 [nimo-principle-boundary-discipline](../nimo-principle-boundary-discipline/SKILL.md)。
- **不向类型系统撒谎。** 强转、unsafe 强制转换、绕过编译器的断言函数，都是等待发生的运行时崩溃。编译器证明不了的事实，要么证明它（验证、收窄、精化模型），要么承认这个 cast 是危险。今天埋下的 cast，就是下周要写的复盘。
- **穷尽匹配是编译器的工作。** 对和类型做匹配时，新增变体而没有处理，必须让编译失败。用你语言的惯用法：TypeScript 的 `never` 类型绑定、Rust 的无注解 `match`、Haskell 的 `-Wincomplete-patterns`、Kotlin 的密封类匹配穷尽检查。
- **从权威 schema 派生类型。** protocol buffer、OpenAPI、GraphQL schema、数据库迁移或设计系统 token 文件定义了形状时，从它派生，不要手写一套平行类型。手工复制会漂移。见 [nimo-principle-encode-lessons-in-structure](../nimo-principle-encode-lessons-in-structure/SKILL.md)。
- **只在出现部分性的地方强化类型。** 运行时断言、null 检查或"这不可能发生"的 throw，都标记着类型太弱的位置。把那个检查往上推成类型，然后停手。类型系统的职责是追踪每个使用点必须处理哪些情况，不是把数据描述到最精确。优先全函数：空列表的 `sum` 是 0，所以它接受普通列表；空列表的 `head` 没有答案，所以它要求非空列表。多余的精度损失复用、增加仪式，不买安全。

## 检验

- "我能写出一行注释解释这组字段的组合何时合法吗？"能，说明类型太松，拆成和类型。
- "两个函数参数共享基元类型但含义不同？"打品牌。
- "这个 `any`、这个 `as`、这个 `assertNotNull` 从哪来？"追到边界，在边界验证。
- "下个月加一个新变体，编译器会告诉下一个改代码的人去哪补分支吗？"不会，说明匹配不穷尽。
- "这个类型在复制另一个文件拥有的形状吗？"改为派生。
- "我强化这个类型，是为了让操作保持全，还是只为了更精确？"没有会 panic 的场景，就保留普通类型。

## 决策例子

完成与失败使用不同分支，不能完成但缺证据。

## 应用证据

读取本文件后，指出它改变的具体决定和产物。没有改变决定时不列为已应用。当前授权、宿主权限和项目强制门禁始终有效。

来源：[pstack type-system-discipline](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/principle-type-system-discipline/SKILL.md)。
