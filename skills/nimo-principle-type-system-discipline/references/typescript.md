# TypeScript 落地

母原则见 [类型系统纪律](../SKILL.md)。本文件只把它落到 TypeScript 的具体语法，不重复原则的理由。

## 判别联合承载变体

不要用一袋可选字段表示状态。每个变体一个对象，带字面量判别键。

```ts
// 差：矛盾组合能编译
type Job = { state: string; error?: Error; result?: Output };

// 好：每个变体的字段只在该变体存在
type Job =
  | { kind: 'queued' }
  | { kind: 'running'; startedAt: Date }
  | { kind: 'done'; result: Output }
  | { kind: 'failed'; error: Error };
```

判别键用字面量类型而非 `string`，`switch` 才能收窄。

## 品牌类型承载语义基元

```ts
declare const brand: unique symbol;
type Brand<T, B> = T & { readonly [brand]: B };

type UserId = Brand<string, 'UserId'>;
type OrderId = Brand<string, 'OrderId'>;

const asUserId = (raw: string): UserId => raw as UserId; // 只在解析边界出现
```

`asUserId` 只允许在边界解析函数内出现一次，下游直接信任类型。

## 构造而非验证

从想要的值出发构造类型。非空列表是 `{ head: T; tail: T[] }`，不是「检查过长度的数组」；有效区间是 `{ start: Date; durationMs: number }`，不是一个需要人为维护先后关系的双时间戳。

```ts
const nonEmpty = <T,>(head: T, tail: T[]): NonEmpty<T> => ({ head, tail });
```

构造函数是唯一能产出该类型的入口，因此不变量由构造保证，而不是由调用方记得检查。

## 优先最简全类型

只在真的存在部分性的地方强化类型。`sum([])` 返回 0，所以它接受普通数组；`head([])` 没有答案，所以它要求非空。为不存在的失败场景加类型参数只增加仪式。

## 外部输入用 `unknown`

`any` 关闭检查并且会传染；`unknown` 强制先收窄。

```ts
const parsePayload = (raw: unknown): Payload => schema.parse(raw);
```

函数签名不要接受 `any`。确实无法避免时，把它关在一个经过测试的适配层内，边界外不出现。

## schema 先于类型守卫

运行时校验用 schema（zod、valibot 或项目既有方案），类型从 schema 派生；不要先手写类型再补一堆检查函数。

```ts
const User = z.object({ id: z.string(), email: z.string().email() });
type User = z.infer<typeof User>;
```

手写的 `isUser(x)` 会与类型漂移；派生的不会。

## 不用 `as`

`as` 是向编译器断言它证明不了的事实。出现 `as` 时，先问是缺解析、缺收窄还是类型太松：

- 外部数据 → 加 schema。
- 联合收窄 → 用判别键 `switch` 或类型守卫。
- 形状不符 → 改类型定义，而不是强转。

`as const` 不是断言，可以用。

## 用户定义类型守卫

需要收窄时返回 `x is T`，并在守卫内部对 `unknown` 做完整形状检查。

```ts
const isResult = (x: unknown): x is Result =>
  typeof x === 'object' && x !== null && 'ok' in x;
```

守卫必须能与类型定义保持同步；形状复杂时优先 schema + `safeParse`。

## 穷尽匹配

`switch` 覆盖所有变体，并在 `default` 处用 `never` 绑定让新增变体编译失败。

```ts
const label = (job: Job): string => {
  switch (job.kind) {
    case 'queued': return '排队';
    case 'running': return '运行中';
    case 'done': return '完成';
    case 'failed': return job.error.message;
    default: {
      const _exhaustive: never = job;
      return _exhaustive;
    }
  }
};
```

`tsconfig` 打开 `strict` 与 `noUncheckedIndexedAccess`，否则上述多数保证不生效。

## `satisfies` 而非 `as`

需要在保留字面量窄类型的同时校验形状时用 `satisfies`。

```ts
const routes = {
  home: '/',
  run: '/run',
} satisfies Record<string, `/${string}`>;
```

`satisfies` 校验后仍保留对象的精确类型；`as` 只会覆盖检查。

## 边界解析一次

RPC 载荷、JSON、IPC 消息、CLI 参数、配置文件、环境变量、数据库行，都在进入类型化代码前解析一次。解析层之后的代码不再做形状检查。校验放哪里见 [边界校验](../../nimo-principle-boundary-discipline/SKILL.md)。

## 从 schema 派生类型

协议、OpenAPI、GraphQL、数据库迁移或设计 token 已经定义形状时，从它生成或派生，不手写平行类型。手写副本必然漂移。

## 对象参数替代位置布尔

```ts
// 差：调用点读不出含义
create(true, false);

// 好：调用点自解释，且可增量添加选项
create({ overwrite: true, dryRun: false });
```

超过两个参数或出现布尔参数时改成对象。

## 测试验证行为

类型覆盖不能替代测试。类型证明分支齐全，不证明分支正确。断言真实输入输出；不要写只断言「类型能通过」的测试，那只是重新跑一次 `tsc`。

## 结构化遥测

日志与指标用结构化字段，不用字符串拼接。

```ts
log.info({ jobId, kind: job.kind, durationMs }, 'job finished');
```

## 检查清单

- 状态是否有判别键，还是 `string` 加一堆可选字段？
- 语义不同的同基元类型是否打了品牌？
- 每个外部输入是否有且只有一处解析？
- 代码里还有 `as` 吗？每一处是否已换成解析或收窄？
- 新增变体时 `tsc` 会失败吗？
- 类型是否从权威 schema 派生？
- `tsconfig` 是否 `strict` 且开启 `noUncheckedIndexedAccess`？

来源：[pstack typescript-best-practices](https://github.com/cursor/plugins/blob/6b0300214a09fd6029cfb7077043125758cd1fd2/pstack/skills/typescript-best-practices/SKILL.md)。
