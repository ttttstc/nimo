---
name: configure-nimo
description: "添加、删除、查看或校验团队和个人原则与知识来源时使用。只修改明确作用域的引用，不复制或删除资料。"
---

# 配置 nimo

1. 读取 [配置契约](../nimo-mode/references/configuration.md)，确认团队或个人作用域。不明确写入先问作用域，查询可同时显示。
2. 确定真实 projectRoot、homeDir 和用户发出路径请求时的 cwd。worktree 不使用主 checkout 或安装目录当根。
3. 按 [工具输入](../nimo-mode/references/tools.md)，执行 config.mjs --input 临时请求 JSON。查询的临时请求放系统临时目录，不创建项目目录。
4. inspect 返回配置哈希。外部 Skill 先核对当前宿主实际发现信息，再传 discoveredSkills 数组，每项含 name、唯一 id、可用时的 path。快照不作为命令，不持久化。
5. add/remove 传 collection、entry、expectedHash。对话相对路径按 cwd 定位后转换保存；手工 YAML 的相对路径基准不同。重复添加无变化，删除只删引用。
6. 检查 status、diagnostics 和读回结果。冲突重新读；语法错误不重建文件。报告作用域、变化、路径与实际可用结果。

没有 YAML 就是零配置。临时 exclusions 只影响当前请求，不写配置。已读资料无法物理遗忘，强制门禁不能排除。

配置脚本返回的是外部引用。用户查看全部原则时，同时展示 [Mode 原则索引](../nimo-mode/SKILL.md) 中的内置原则；区分已登记、当前适用和实际读取，不把所有登记项都说成已应用。
